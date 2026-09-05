import { createClient } from 'npm:@supabase/supabase-js@2';
export function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
const storeOrigins = new WeakSet<Request>();
export async function allowStoreOrigin(request: Request) {
  const origin = request.headers.get('origin') || '';
  if (!/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(origin)) return;
  try {
    const { data, error } = await admin()
      .from('store_deployments')
      .select('store_id')
      .eq('public_url', origin)
      .limit(1)
      .maybeSingle();
    if (data && !error) storeOrigins.add(request);
  } catch {
    /* no matching deployment, no cross-origin access */
  }
}
export function cors(request: Request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (
    Deno.env.get('ALLOWED_ORIGINS') || 'http://127.0.0.1:5173,http://localhost:5173'
  ).split(',');
  const domain = Deno.env.get('BASE_DOMAIN') || 'kiosku.id';
  let permitted = allowed.includes(origin) || storeOrigins.has(request);
  try {
    const u = new URL(origin);
    permitted ||=
      u.protocol === 'https:' && (u.hostname === domain || u.hostname.endsWith(`.${domain}`));
  } catch {
    /* no origin for webhook */
  }
  return {
    'Access-Control-Allow-Origin': permitted ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}
export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(req) });
}
export async function body(req: Request, maxBytes = 32768) {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new Error('Permintaan terlalu besar.');
  return JSON.parse(text);
}
export const midtransBase = () =>
  Deno.env.get('MIDTRANS_PRODUCTION') === 'true'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
export const midtransApi = () =>
  Deno.env.get('MIDTRANS_PRODUCTION') === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
export const midtransAuth = () => `Basic ${btoa(`${Deno.env.get('MIDTRANS_SERVER_KEY')}:`)}`;
export async function hash(value: string, algorithm = 'SHA-256') {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(value))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
