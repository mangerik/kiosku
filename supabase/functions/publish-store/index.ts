import { admin, body, json } from '../_shared/http.ts';
import { netlifyOrigin, netlifyRequest, siteBundle, uuidPattern } from '../_shared/netlify.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  const db = admin();
  let storeId = '',
    lease = '';
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
    if (!token) return json(req, { error: 'Silakan masuk kembali.' }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user) return json(req, { error: 'Silakan masuk kembali.' }, 401);
    const input = await body(req);
    storeId = input.storeId;
    if (!uuidPattern.test(storeId) || !['publish', 'status'].includes(input.action))
      return json(req, { error: 'Permintaan publish tidak valid.' }, 400);
    const { data: store, error: storeError } = await db
      .from('stores')
      .select('id,account_id,status')
      .eq('id', storeId)
      .eq('account_id', user.id)
      .maybeSingle();
    if (storeError || !store) return json(req, { error: 'Toko tidak ditemukan.' }, 404);
    if (!Deno.env.get('NETLIFY_AUTH_TOKEN') || !Deno.env.get('NETLIFY_TEAM_SLUG'))
      return json(req, { error: 'Publish Netlify belum dihubungkan oleh pengelola.' }, 503);

    async function status() {
      const { data: row, error } = await db
        .from('store_deployments')
        .select('*')
        .eq('store_id', storeId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return json(req, { state: 'idle' });
      if (row.state === 'failed')
        return json(req, {
          state: 'failed',
          error: row.last_error || 'Publish belum berhasil. Coba ulang.',
        });
      if (row.state === 'ready') return json(req, { state: 'ready', url: row.site_url });
      if (row.state === 'deploying' && row.deploy_id) {
        const deploy = await netlifyRequest(`/deploys/${encodeURIComponent(row.deploy_id)}`);
        if (deploy.site_id !== row.site_id) throw new Error('Deployment tidak cocok dengan toko.');
        if (deploy.state === 'ready') {
          const finished = await db.rpc('finish_store_deploy', {
            target_store: storeId,
            expected_deploy: row.deploy_id,
          });
          if (finished.error) throw new Error(finished.error.message);
          return json(req, { state: 'ready', url: row.site_url });
        }
        if (['error', 'rejected'].includes(deploy.state)) {
          await db
            .from('store_deployments')
            .update({
              state: 'failed',
              lease_until: null,
              deploy_id: null,
              last_error: 'Deployment Netlify gagal. Coba publish ulang.',
            })
            .eq('store_id', storeId)
            .eq('deploy_id', row.deploy_id);
          return json(req, {
            state: 'failed',
            error: 'Deployment Netlify gagal. Coba publish ulang.',
          });
        }
      }
      if (row.state === 'preparing' && new Date(row.lease_until).getTime() < Date.now())
        return json(req, {
          state: 'failed',
          error: 'Publish terputus. Klik Publish toko untuk melanjutkan.',
        });
      return json(req, { state: 'deploying' });
    }
    if (input.action === 'status') return await status();
    const limited = await db.rpc('check_rate_limit', {
      bucket_key: `publish:${user.id}`,
      max_requests: 6,
      window_seconds: 300,
    });
    if (limited.error || !limited.data)
      return json(
        req,
        { error: 'Terlalu banyak percobaan publish. Coba beberapa menit lagi.' },
        429,
      );
    // Check the trusted artifact before changing publication state or creating remote sites.
    let bytes: Uint8Array<ArrayBuffer>;
    const bundleUrl = Deno.env.get('STOREFRONT_BUNDLE_URL');
    if (bundleUrl) {
      if (!/^https:\/\/[a-z0-9-]+\.netlify\.app\/storefront\.zip$/.test(bundleUrl)) throw new Error('Alamat bundle belum dikonfigurasi dengan benar.');
      const response = await fetch(bundleUrl, { signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (!response.ok || Number(response.headers.get('content-length')) > 15 * 1024 * 1024) throw new Error('Bundle toko belum tersedia.');
      bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 15 * 1024 * 1024) throw new Error('Bundle toko terlalu besar.');
    } else {
      const template = await db.storage.from('deployment-assets').download('storefront.zip');
      if (template.error || !template.data) return json(req, { error: 'Bundle toko belum disiapkan oleh pengelola.' }, 503);
      bytes = new Uint8Array(await template.data.arrayBuffer());
    }
    const zip = siteBundle(bytes, storeId);
    const artifactHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    lease = crypto.randomUUID();
    const started = await db.rpc('begin_store_deploy', {
      owner_id: user.id,
      target_store: storeId,
      lease,
    });
    if (started.error) return json(req, { error: started.error.message }, 400);
    const row = started.data;
    if (row.pending) {
      lease = '';
      return await status();
    }
    let siteId = row.site_id;
    const origin = netlifyOrigin(row.site_name);
    const team = Deno.env.get('NETLIFY_TEAM_SLUG')!;
    if (!siteId) {
      // The database allocates the immutable UUID-based name. Lookup recovers an interrupted create.
      let site;
      try {
        site = await netlifyRequest(`/sites/${row.site_name}.netlify.app`);
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
      }
      if (!site)
        site = await netlifyRequest(`/${encodeURIComponent(team)}/sites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: row.site_name, force_ssl: true, built_with_badge_enabled: false }),
        });
      if (site.name !== row.site_name || site.account_slug !== team)
        throw new Error('Situs Netlify tidak cocok dengan tim Kiosku.');
      siteId = site.id;
      const saved = await db
        .from('store_deployments')
        .update({ site_id: siteId, site_url: origin })
        .eq('store_id', storeId)
        .eq('lease_id', lease)
        .select('store_id')
        .single();
      if (saved.error) throw saved.error;
    }
    // Content comes from Supabase at runtime; unchanged bundles do not consume another deploy.
    let deployId = row.deploy_id;
    if (!deployId || row.artifact_hash !== artifactHash) {
      // Recover a response lost after Netlify accepted the previous upload.
      const deploys = await netlifyRequest(`/sites/${siteId}/deploys?per_page=10`);
      const title = `kiosku:${storeId}:${artifactHash}`;
      const previous = deploys.find(
        (d: { title: string; state: string }) =>
          d.title === title && !['error', 'rejected'].includes(d.state),
      );
      const deployment =
        previous ||
        (await netlifyRequest(`/sites/${siteId}/deploys?title=${encodeURIComponent(title)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/zip' },
          body: zip as BodyInit,
        }));
      deployId = deployment.id;
    }
    const saved = await db
      .from('store_deployments')
      .update({
        state: 'deploying',
        deploy_id: deployId,
        artifact_hash: artifactHash,
        site_url: origin,
        lease_id: null,
        lease_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId)
      .eq('lease_id', lease)
      .select('store_id')
      .single();
    if (saved.error) throw saved.error;
    lease = '';
    return await status();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Publish belum berhasil. Coba ulang.';
    if (lease && storeId)
      await db
        .from('store_deployments')
        .update({
          state: 'failed',
          lease_id: null,
          lease_until: null,
          last_error: message.slice(0, 250),
        })
        .eq('store_id', storeId)
        .eq('lease_id', lease);
    return json(req, { error: message }, 503);
  }
});
