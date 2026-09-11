// supabase/functions/_shared/payment.ts
function paymentOutcome(payment) {
  if (
    payment.transaction_status === 'settlement' ||
    (payment.transaction_status === 'capture' && payment.fraud_status === 'accept')
  )
    return 'lunas';
  if (['deny', 'cancel', 'expire', 'failure'].includes(payment.transaction_status || ''))
    return 'gagal';
  return null;
}

// supabase/functions/_shared/http.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
function admin() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function body(req, maxBytes = 32768) {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes)
    throw new Error('Permintaan terlalu besar.');
  return JSON.parse(text);
}
var midtransApi = () =>
  Deno.env.get('MIDTRANS_PRODUCTION') === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
var midtransAuth = () => `Basic ${btoa(`${Deno.env.get('MIDTRANS_SERVER_KEY')}:`)}`;
async function hash(value, algorithm = 'SHA-256') {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest(algorithm, new TextEncoder().encode(value))),
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

// supabase/functions/payment-webhook/index.ts
var response = (status, message) =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
Deno.serve(async (req) => {
  if (req.method !== 'POST') return response(405, 'Method not allowed');
  const key = Deno.env.get('MIDTRANS_SERVER_KEY');
  if (!key) return response(503, 'Payment is not configured');
  try {
    const notification = await body(req);
    const { order_id, status_code, gross_amount, signature_key } = notification;
    if (![order_id, status_code, gross_amount, signature_key].every((v) => typeof v === 'string'))
      return response(400, 'Invalid payload');
    const signature = await hash(order_id + status_code + gross_amount + key, 'SHA-512');
    if (!equal(signature, signature_key)) return response(401, 'Invalid signature');
    const statusResponse = await fetch(
      `${midtransApi()}/v2/${encodeURIComponent(order_id)}/status`,
      {
        headers: { Authorization: midtransAuth(), Accept: 'application/json' },
        signal: AbortSignal.timeout(15e3),
      },
    );
    if (!statusResponse.ok) return response(503, 'Status temporarily unavailable');
    const payment = await statusResponse.json();
    if (payment.order_id !== order_id || Number(payment.gross_amount) !== Number(gross_amount))
      return response(400, 'Payment mismatch');
    const outcome = paymentOutcome(payment);
    const paid = outcome === 'lunas';
    if (!outcome) return response(200, 'Pending');
    const db = admin();
    if (!order_id.startsWith('SUB-')) return response(404, 'Invoice not found');
    const result = await db.rpc('settle_subscription', {
      invoice_id: order_id.slice(4),
      outcome: paid ? 'lunas' : 'gagal',
      expected_amount: Number(gross_amount),
    });
    return result.error ? response(400, result.error.message) : response(200, 'OK');
  } catch {
    return response(503, 'Retry notification later');
  }
});
