import { admin, json, body, hash, allowStoreOrigin } from '../_shared/http.ts';
Deno.serve(async (req) => {
  await allowStoreOrigin(req);
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  try {
    const db = admin();
    const payload = await body(req);
    if (!payload || !['qris', 'transfer'].includes(payload.method) || !Array.isArray(payload.items))
      return json(req, { error: 'Checkout tidak valid.' }, 400);
    // Only use an IP provided by the trusted edge proxy, never an IP in the body.
    const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const key =
      'checkout:' + (await hash(address + ':' + (Deno.env.get('RATE_LIMIT_SALT') || 'kiosku')));
    const limit = await db.rpc('check_rate_limit', {
      bucket_key: key,
      max_requests: 15,
      window_seconds: 300,
    });
    if (limit.error || !limit.data)
      return json(req, { error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' }, 429);
    const result = await db.rpc('checkout_order', { payload });
    if (result.error) return json(req, { error: result.error.message }, 400);
    return json(req, { order: result.data });
  } catch {
    return json(
      req,
      {
        error:
          'Checkout belum berhasil diselesaikan. Coba ulang; pesanan yang sudah dibuat tidak akan digandakan.',
      },
      503,
    );
  }
});
