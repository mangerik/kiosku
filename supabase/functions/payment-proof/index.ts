import { admin, json, allowStoreOrigin } from '../_shared/http.ts';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      const found = await db
        .from('orders')
        .select('id,store_id,payment,status')
        .eq('code', code)
        .eq('token', token)
        .maybeSingle();
      if (
        found.error ||
        !found.data ||
        found.data.payment !== 'menunggu' ||
        found.data.status === 'batal'
      )
        return json(req, { error: 'Pesanan tidak tersedia.' }, 404);
      const path = `${found.data.store_id}/${found.data.id}/proof`;
      const uploaded = await db.storage
        .from('payment-proofs')
        .upload(path, await file.arrayBuffer(), {
          contentType: file.type,
          upsert: true,
        });
      if (uploaded.error)
        return json(req, { error: 'Bukti belum berhasil diunggah. Coba lagi.' }, 503);
      const saved = await db.rpc('submit_payment_proof', {
        target_order: found.data.id,
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
