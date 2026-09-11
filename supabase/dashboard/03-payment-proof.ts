// supabase/functions/_shared/http.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
function admin() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function allowStoreOrigin(_request) {}
function cors(request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (
    Deno.env.get('ALLOWED_ORIGINS') || 'http://127.0.0.1:5173,http://localhost:5173'
  ).split(',');
  const domain = Deno.env.get('BASE_DOMAIN') || 'kiosku.id';
  let permitted = allowed.includes(origin);
  try {
    const u = new URL(origin);
    permitted ||=
      u.protocol === 'https:' && (u.hostname === domain || u.hostname.endsWith(`.${domain}`));
  } catch {}
  return {
    'Access-Control-Allow-Origin': permitted ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}
function json(req, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}

// supabase/functions/payment-proof/index.ts
var allowedTypes = /* @__PURE__ */ new Set(['image/jpeg', 'image/png', 'image/webp']);
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async (req) => {
  await allowStoreOrigin(req);
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  try {
    const db = admin();
    const contentType = req.headers.get('content-type') || '';
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const code = String(form.get('code') || '');
      const token = String(form.get('token') || '');
      const file = form.get('file');
      if (!/^KIO-[0-9A-F]{32}$/.test(code) || !uuidPattern.test(token) || !(file instanceof File))
        return json(req, { error: 'Data bukti pembayaran tidak valid.' }, 400);
      if (!allowedTypes.has(file.type) || file.size < 1 || file.size > 3 * 1024 * 1024)
        return json(req, { error: 'Gunakan bukti JPG, PNG, atau WebP maksimal 3 MB.' }, 400);
      const found2 = await db
        .from('orders')
        .select('id,store_id,payment,status')
        .eq('code', code)
        .eq('token', token)
        .maybeSingle();
      if (
        found2.error ||
        !found2.data ||
        found2.data.payment !== 'menunggu' ||
        found2.data.status === 'batal'
      )
        return json(req, { error: 'Pesanan tidak tersedia.' }, 404);
      const path = `${found2.data.store_id}/${found2.data.id}/proof`;
      const uploaded = await db.storage
        .from('payment-proofs')
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: true,
        });
      if (uploaded.error)
        return json(req, { error: 'Bukti belum berhasil diunggah. Coba lagi.' }, 503);
      const saved = await db.rpc('submit_payment_proof', {
        target_order: found2.data.id,
        expected_token: token,
        object_path: path,
      });
      if (saved.error) return json(req, { error: saved.error.message }, 400);
      return json(req, { ok: true });
    }
    const input = await req.json();
    if (input?.action !== 'view' || !uuidPattern.test(String(input.orderId || '')))
      return json(req, { error: 'Permintaan tidak valid.' }, 400);
    const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const user = await db.auth.getUser(bearer);
    if (user.error || !user.data.user) return json(req, { error: 'Silakan masuk kembali.' }, 401);
    const found = await db
      .from('orders')
      .select('payment_proof_path,stores!inner(account_id)')
      .eq('id', input.orderId)
      .eq('stores.account_id', user.data.user.id)
      .maybeSingle();
    if (found.error || !found.data?.payment_proof_path)
      return json(req, { error: 'Bukti pembayaran belum tersedia.' }, 404);
    const signed = await db.storage
      .from('payment-proofs')
      .createSignedUrl(found.data.payment_proof_path, 300);
    if (signed.error || !signed.data?.signedUrl)
      return json(req, { error: 'Bukti pembayaran belum dapat dibuka.' }, 503);
    return json(req, { url: signed.data.signedUrl });
  } catch {
    return json(req, { error: 'Bukti pembayaran belum dapat diproses.' }, 503);
  }
});
