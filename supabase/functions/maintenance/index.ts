import { admin, equal, midtransApi, midtransAuth } from '../_shared/http.ts';
import { paymentOutcome } from '../_shared/payment.ts';
// Invoke every five minutes using a scheduler, with a private bearer secret.
Deno.serve(async (req) => {
  const secret = Deno.env.get('MAINTENANCE_SECRET');
  if (
    req.method !== 'POST' ||
    !secret ||
    !equal(req.headers.get('authorization') || '', `Bearer ${secret}`)
  )
    return new Response('Unauthorized', { status: 401 });
  const db = admin();
  let settled = 0,
    sent = 0;
  try {
    const expiry = await db.rpc('expire_subscriptions');
    if (expiry.error) throw expiry.error;
    const manual = await db
      .from('orders')
      .select('id,total')
      .eq('method', 'transfer')
      .eq('payment', 'menunggu')
      .lt('expires_at', new Date().toISOString())
      .limit(100);
    if (manual.error) throw manual.error;
    for (const order of manual.data || []) {
      const result = await db.rpc('settle_order', {
        order_id: order.id,
        outcome: 'gagal',
        expected_amount: order.total,
      });
      if (!result.error) settled++;
    }
    if (Deno.env.get('MIDTRANS_SERVER_KEY')) {
      const { data: orders, error } = await db
        .from('orders')
        .select('id,code,total')
        .eq('method', 'qris')
        .eq('payment', 'menunggu')
        .order('payment_checked_at')
        .limit(50);
      if (error) throw error;
      const { data: invoices, error: invoiceError } = await db
        .from('billing_requests')
        .select('id,amount')
        .eq('status', 'menunggu')
        .order('payment_checked_at')
        .limit(25);
      if (invoiceError) throw invoiceError;
      for (const item of [
        ...(orders || []).map((o) => ({
          id: o.id,
          code: o.code,
          amount: o.total,
          subscription: false,
        })),
        ...(invoices || []).map((i) => ({
          id: i.id,
          code: `SUB-${i.id}`,
          amount: i.amount,
          subscription: true,
        })),
      ]) {
        await db
          .from(item.subscription ? 'billing_requests' : 'orders')
          .update({ payment_checked_at: new Date().toISOString() })
          .eq('id', item.id);
        const response = await fetch(
          `${midtransApi()}/v2/${encodeURIComponent(item.code)}/status`,
          { headers: { Authorization: midtransAuth() }, signal: AbortSignal.timeout(10000) },
        );
        if (!response.ok) continue; // An unknown provider state must never release reserved stock.
        const status = await response.json();
        if (status.order_id !== item.code || Number(status.gross_amount) !== item.amount) continue;
        const outcome = paymentOutcome(status);
        if (!outcome) continue;
        const paid = outcome === 'lunas';
        const args = item.subscription
          ? { invoice_id: item.id, outcome: paid ? 'lunas' : 'gagal', expected_amount: item.amount }
          : { order_id: item.id, outcome: paid ? 'lunas' : 'gagal', expected_amount: item.amount };
        const result = await db.rpc(
          item.subscription ? 'settle_subscription' : 'settle_order',
          args,
        );
        if (!result.error) settled++;
      }
    }
    const emailKey = Deno.env.get('RESEND_API_KEY'),
      from = Deno.env.get('NOTIFICATION_FROM');
    if (emailKey && from) {
      const { data: messages, error } = await db
        .from('notification_outbox')
        .select('*')
        .is('sent_at', null)
        .lt('attempts', 5)
        .order('created_at')
        .limit(20);
      if (error) throw error;
      for (const message of messages || []) {
        const result = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${emailKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': message.id,
          },
          body: JSON.stringify({
            from,
            to: [message.recipient],
            subject: message.subject,
            text: message.body,
          }),
          signal: AbortSignal.timeout(10000),
        });
        await db
          .from('notification_outbox')
          .update({
            attempts: message.attempts + 1,
            ...(result.ok ? { sent_at: new Date().toISOString() } : {}),
          })
          .eq('id', message.id);
        if (result.ok) sent++;
      }
    }
    await db
      .from('rate_limits')
      .delete()
      .lt('window_start', new Date(Date.now() - 86400000).toISOString());
    return Response.json({ expired: expiry.data, settled, sent });
  } catch {
    return Response.json(
      { error: 'Maintenance incomplete; retry safely.', settled, sent },
      { status: 503 },
    );
  }
});
