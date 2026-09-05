import {
  admin,
  json,
  body,
  hash,
  midtransAuth,
  midtransBase,
  allowStoreOrigin,
} from '../_shared/http.ts';
Deno.serve(async (req) => {
  await allowStoreOrigin(req);
  if (req.method === 'OPTIONS') return json(req, { ok: true });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
  try {
    const db = admin();
    const payload = await body(req);
    if (!payload || !['qris', 'transfer'].includes(payload.method) || !Array.isArray(payload.items))
      return json(req, { error: 'Checkout tidak valid.' }, 400);
    if (
      payload.method === 'qris' &&
      (!Deno.env.get('MIDTRANS_SERVER_KEY') || !Deno.env.get('APP_URL'))
    )
      return json(
        req,
        { error: 'QRIS belum tersedia. Pilih transfer bank atau hubungi toko.' },
        503,
      );
    const instructions = {
      bank: Deno.env.get('TRANSFER_BANK'),
      number: Deno.env.get('TRANSFER_NUMBER'),
      name: Deno.env.get('TRANSFER_NAME'),
    };
    if (
      payload.method === 'transfer' &&
      (!instructions.bank || !instructions.number || !instructions.name)
    )
      return json(
        req,
        { error: 'Transfer bank belum tersedia. Pilih QRIS atau hubungi toko.' },
        503,
      );
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
    const order = result.data;
    if (order.method === 'transfer' && !order.paymentInstructions) {
      const saved = await db
        .from('orders')
        .update({ payment_instructions: instructions })
        .eq('id', order.id);
      if (saved.error)
        return json(
          req,
          { error: 'Petunjuk pembayaran belum tersimpan. Coba lagi dengan keranjang yang sama.' },
          503,
        );
      order.paymentInstructions = instructions;
    }
    if (order.method === 'qris' && order.payment === 'menunggu' && !order.paymentUrl) {
      const { data: deployment } = await db.from('store_deployments').select('public_url').eq('store_id', order.storeId).maybeSingle();
      const site = deployment?.public_url || Deno.env.get('APP_URL');
      if (!site) return json(req, { order });
      const { data: store } = await db
        .from('stores')
        .select('slug')
        .eq('id', order.storeId)
        .single();
      const response = await fetch(`${midtransBase()}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          Authorization: midtransAuth(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          transaction_details: { order_id: order.code, gross_amount: order.total },
          enabled_payments: order.method === 'qris' ? ['gopay'] : ['bank_transfer'],
          customer_details: {
            first_name: order.customer.name,
            email: order.customer.email,
            phone: order.customer.phone,
          },
          callbacks: {
            finish: `${site}/toko/${store?.slug}/lacak?code=${order.code}&token=${order.token}`,
          },
          expiry: { unit: 'hours', duration: 24 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      const payment = await response.json();
      if (response.ok && payment.redirect_url) {
        order.paymentUrl = payment.redirect_url;
        const saved = await db
          .from('orders')
          .update({ payment_url: payment.redirect_url })
          .eq('id', order.id);
        if (saved.error)
          return json(
            req,
            { error: 'Link pembayaran belum tersimpan. Coba ulang dengan keranjang yang sama.' },
            503,
          );
      }
      // On an uncertain provider response keep the order pending. Never restore stock while a charge could exist.
      else
        return json(req, {
          order,
          warning:
            'Pesanan tersimpan; tautan pembayaran belum tersedia. Hubungi toko dengan nomor pesanan.',
        });
    }
    return json(req, { order });
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
