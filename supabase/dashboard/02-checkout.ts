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
function json(req, body2, status = 200) {
  return new Response(JSON.stringify(body2), { status, headers: cors(req) });
}
async function body(req, maxBytes = 32768) {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new Error('Permintaan terlalu besar.');
  return JSON.parse(text);
}
async function hash(value, algorithm = 'SHA-256') {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(value))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// supabase/functions/checkout/index.ts
Deno.serve(async (req) => {
  await allowStoreOrigin(req);
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  try {
    const db = admin();
    const payload = await body(req);
    if (!payload || !['qris', 'transfer'].includes(payload.method) || !Array.isArray(payload.items))
      return json(req, { error: 'Checkout tidak valid.' }, 400);
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
