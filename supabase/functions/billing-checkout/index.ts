import { admin, json, body, midtransAuth, midtransBase } from '../_shared/http.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  try {
    const db = admin();
    const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
    if (!token) return json(req, { error: 'Silakan masuk kembali.' }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user) return json(req, { error: 'Silakan masuk kembali.' }, 401);
    if (!Deno.env.get('MIDTRANS_SERVER_KEY') || !Deno.env.get('APP_URL'))
      return json(req, { error: 'Pembayaran langganan belum dikonfigurasi.' }, 503);
    const input = await body(req);
    if (!['tumbuh', 'skala'].includes(input.tier))
      return json(req, { error: 'Paket tidak valid.' }, 400);
    const limit = await db.rpc('check_rate_limit', {
      bucket_key: `billing:${user.id}`,
      max_requests: 10,
      window_seconds: 300,
    });
    if (limit.error || !limit.data)
      return json(req, { error: 'Tunggu beberapa menit sebelum mencoba lagi.' }, 429);
    const result = await db.rpc('create_subscription_invoice', {
      owner_id: user.id,
      requested_tier: input.tier,
      request_id: input.requestId,
    });
    if (result.error) return json(req, { error: result.error.message }, 400);
    const invoice = result.data;
    if (invoice.status !== 'menunggu')
      return json(req, { error: 'Tagihan sudah selesai. Muat ulang halaman.' }, 409);
    if (invoice.payment_url) return json(req, { paymentUrl: invoice.payment_url });
    const response = await fetch(`${midtransBase()}/snap/v1/transactions`, {
      method: 'POST',
      headers: { Authorization: midtransAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction_details: { order_id: `SUB-${invoice.id}`, gross_amount: invoice.amount },
        customer_details: { email: user.email },
        callbacks: { finish: `${Deno.env.get('APP_URL')}/app/langganan` },
        expiry: { unit: 'hours', duration: 24 },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const payment = await response.json();
    if (!response.ok || !payment.redirect_url)
      return json(
        req,
        {
          error:
            'Tautan pembayaran belum tersedia. Coba lagi dengan paket yang sama atau hubungi pengelola.',
        },
        503,
      );
    const saved = await db
      .from('billing_requests')
      .update({ payment_url: payment.redirect_url })
      .eq('id', invoice.id);
    if (saved.error)
      return json(
        req,
        { error: 'Tautan belum tersimpan. Hubungi pengelola sebelum membayar.' },
        503,
      );
    return json(req, { paymentUrl: payment.redirect_url });
  } catch {
    return json(req, { error: 'Pembayaran belum dapat diproses. Coba lagi.' }, 503);
  }
});
