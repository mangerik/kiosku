import { paymentOutcome } from '../_shared/payment.ts';
import { admin, body, hash, equal, midtransApi, midtransAuth } from '../_shared/http.ts';
const response = (status: number, message: string) =>
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
    // Check authoritative status rather than trusting event ordering or client redirects.
    const statusResponse = await fetch(
      `${midtransApi()}/v2/${encodeURIComponent(order_id)}/status`,
      {
        headers: { Authorization: midtransAuth(), Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
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
    if (order_id.startsWith('SUB-')) {
      const result = await db.rpc('settle_subscription', {
        invoice_id: order_id.slice(4),
        outcome: paid ? 'lunas' : 'gagal',
        expected_amount: Number(gross_amount),
      });
      return result.error ? response(400, result.error.message) : response(200, 'OK');
    }
    const { data: order, error } = await db
      .from('orders')
      .select('id,method')
      .eq('code', order_id)
      .single();
    if (error || !order || order.method !== 'qris') return response(404, 'Order not found');
    const result = await db.rpc('settle_order', {
      order_id: order.id,
      outcome: paid ? 'lunas' : 'gagal',
      expected_amount: Number(gross_amount),
    });
    return result.error ? response(400, result.error.message) : response(200, 'OK');
  } catch {
    return response(503, 'Retry notification later');
  }
});
