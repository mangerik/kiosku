import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text,phone text,raw_user_meta_data jsonb default '{}');
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;`);
const sql = (
  await readFile(new URL('../supabase/migrations/202609030001_kiosku.sql', import.meta.url), 'utf8')
).replace(
  'create extension if not exists pgcrypto;',
  '-- pgcrypto is provided by hosted Supabase; gen_random_uuid is native in the test engine.',
);
await db.exec(sql);
await db.exec(
  await readFile(
    new URL('../supabase/migrations/202609030002_billing.sql', import.meta.url),
    'utf8',
  ),
);
console.log('PASS: full migration compiles in PostgreSQL (PGlite).');
await db.exec(await readFile(new URL('../supabase/migrations/202609030003_netlify.sql', import.meta.url), 'utf8'));
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
await db.query(`insert into auth.users(id,email) values($1,'a@example.com'),($2,'b@example.com')`, [
  a,
  b,
]);
async function asUser(id) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
  await db.exec('set role authenticated');
}
async function command(c) {
  return db.query('select merchant_command($1::jsonb)', [JSON.stringify(c)]);
}
await asUser(a);
await command({
  type: 'create-store',
  name: 'Toko A',
  slug: 'toko-a',
  category: 'Umum',
  theme: 'natural',
});
await assert.rejects(
  command({
    type: 'create-store',
    name: 'Toko Kedua',
    slug: 'toko-dua',
    category: 'Umum',
    theme: 'natural',
  }),
  /Kuota/,
);
let wa = (await db.query('select merchant_workspace() data')).rows[0].data;
const sid = wa.stores[0].id;
const pid = '33333333-3333-4333-8333-333333333333',
  vid = '44444444-4444-4444-8444-444444444444';
await command({
  type: 'save-product',
  product: {
    id: pid,
    storeId: sid,
    name: 'Produk Test',
    category: 'Umum',
    description: 'Test',
    images: [],
    active: true,
    variants: [{ id: vid, name: 'Reguler', stock: 5, price: 100000 }],
  },
});
await command({ type: 'publish', storeId: sid });
await asUser(b);
assert.equal((await db.query('select * from products')).rows.length, 0);
await assert.rejects(command({ type: 'delete-product', id: pid }), /tidak ditemukan/);
await assert.rejects(
  db.query(`update accounts set tier='skala' where id=$1`, [b]),
  /permission denied/,
);
await assert.rejects(db.query(`select settle_order($1,'lunas')`, [pid]), /permission denied/);
assert.equal((await db.query('select merchant_workspace() data')).rows[0].data.stores.length, 0);
console.log('PASS: RLS isolates accounts; clients cannot grant tiers or call settlement.');
await db.exec('reset role; set role anon');
const publicStore = (await db.query(`select public_storefront('toko-a') data`)).rows[0].data;
assert.equal(publicStore.store.accountId, '');
assert.equal(publicStore.store.versions.length, 0);
assert.equal(publicStore.products.length, 1);
await assert.rejects(db.query('select * from orders'), /permission denied/);
await assert.rejects(db.query(`select public_storefront('toko-a',true)`), /Preview/);
console.log('PASS: public storefront exposes only published content and blocks order listing.');
await db.exec('reset role; set role service_role');
const payload = {
  requestId: '55555555-5555-4555-8555-555555555555',
  storeId: sid,
  method: 'qris',
  customer: {
    name: 'Pembeli Test',
    email: 'buyer@example.com',
    phone: '081234567890',
    address: 'Jalan Pengujian 12',
    city: 'Bandung',
    postalCode: '40111',
    note: '',
  },
  items: [{ productId: pid, variantId: vid, quantity: 2 }],
};
let order = (await db.query('select checkout_order($1::jsonb) data', [JSON.stringify(payload)]))
  .rows[0].data;
assert.equal(order.total, 215000);
assert.equal(order.payment, 'menunggu');
await db.query('select checkout_order($1::jsonb)', [JSON.stringify(payload)]);
assert.equal(
  (await db.query('select stock from product_variants where id=$1', [vid])).rows[0].stock,
  3,
);
await assert.rejects(
  db.query('select checkout_order($1::jsonb)', [
    JSON.stringify({
      ...payload,
      requestId: '66666666-6666-4666-8666-666666666666',
      items: [{ productId: pid, variantId: vid, quantity: 4 }],
    }),
  ]),
  /Stok/,
);
await assert.rejects(db.query('select settle_order($1,$2,$3)', [order.id, 'lunas', 1]), /Jumlah/);
await db.query('select settle_order($1,$2,$3)', [order.id, 'lunas', 215000]);
await db.query('select settle_order($1,$2,$3)', [order.id, 'lunas', 215000]);
assert.equal(
  (await db.query(`select count(*)::int n from wallet_transactions where order_id=$1`, [order.id]))
    .rows[0].n,
  1,
);
console.log(
  'PASS: checkout reprices, reserves stock, rejects overselling, retries idempotently, settles only once.',
);
const failedPayload = {
  ...payload,
  requestId: '77777777-7777-4777-8777-777777777777',
  method: 'transfer',
};
const failedOrder = (
  await db.query('select checkout_order($1::jsonb) data', [JSON.stringify(failedPayload)])
).rows[0].data;
await db.query(`select settle_order($1,'gagal')`, [failedOrder.id]);
await db.query(`select settle_order($1,'gagal')`, [failedOrder.id]);
assert.equal(
  (await db.query('select stock from product_variants where id=$1', [vid])).rows[0].stock,
  3,
);
await db.exec('reset role');
await db.query(
  `update accounts set verification='terverifikasi',bank='BCA',bank_number='1234567890',bank_name='Test' where id=$1`,
  [a],
);
await asUser(a);
await assert.rejects(command({ type: 'withdraw', amount: 215001 }), /melebihi/);
await command({
  type: 'withdraw',
  amount: 100000,
  requestId: 'abababab-abab-4bab-8bab-abababababab',
});
await command({
  type: 'withdraw',
  amount: 100000,
  requestId: 'abababab-abab-4bab-8bab-abababababab',
});
assert.equal(
  (await db.query('select merchant_workspace() data')).rows[0].data.transactions.length,
  2,
);
console.log('PASS: failed payments restore stock once; withdrawals validate and reserve balance.');
await db.exec('reset role; set role anon');
assert.equal(
  (await db.query(`select track_order($1,$2) data`, [order.code, order.token])).rows[0].data
    .payment,
  'lunas',
);
assert.equal(
  (
    await db.query(`select track_order($1,$2) data`, [
      order.code,
      '88888888-8888-4888-8888-888888888888',
    ])
  ).rows[0].data,
  null,
);
console.log('PASS: order tracking requires the matching private token.');
await asUser(a);
await assert.rejects(command({ type: 'pay-order', id: order.id, outcome: 'lunas' }), /gateway/);
await assert.rejects(
  db.query('select review_identity($1,true,$2)', [a, 'test-ref']),
  /permission denied/,
);
await db.exec('reset role; set role service_role');
const invoiceId = '99999999-9999-4999-8999-999999999999';
const invoice = (
  await db.query('select create_subscription_invoice($1,$2,$3) data', [a, 'skala', invoiceId])
).rows[0].data;
assert.equal(invoice.amount, 498000);
await assert.rejects(
  db.query('select settle_subscription($1,$2,$3)', [invoiceId, 'lunas', 1]),
  /Jumlah/,
);
await db.query('select settle_subscription($1,$2,$3)', [invoiceId, 'lunas', 498000]);
const endDate = (await db.query('select expires_at from subscriptions where account_id=$1', [a]))
  .rows[0].expires_at;
await db.query('select settle_subscription($1,$2,$3)', [invoiceId, 'lunas', 498000]);
assert.equal(
  String(
    (await db.query('select expires_at from subscriptions where account_id=$1', [a])).rows[0]
      .expires_at,
  ),
  String(endDate),
);
assert.equal((await db.query('select tier from accounts where id=$1', [a])).rows[0].tier, 'skala');
await db.query("update subscriptions set expires_at=now()-interval '1 day' where account_id=$1", [
  a,
]);
assert.equal((await db.query('select expire_subscriptions() n')).rows[0].n, 1);
assert.equal((await db.query('select tier from accounts where id=$1', [a])).rows[0].tier, 'rintis');
console.log(
  'PASS: subscription payment is amount-checked, idempotent, and expires back to Rintis.',
);
const manualPayload = {
  ...payload,
  method: 'transfer',
  requestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  items: [{ productId: pid, variantId: vid, quantity: 1 }],
};
const manualOrder = (
  await db.query('select checkout_order($1::jsonb) data', [JSON.stringify(manualPayload)])
).rows[0].data;
await assert.rejects(
  db.query('select confirm_manual_payment($1,$2,$3)', [manualOrder.id, 1, 'BANK-001']),
  /Jumlah/,
);
await db.query('select confirm_manual_payment($1,$2,$3)', [manualOrder.id, 115000, 'BANK-001']);
await db.query('select confirm_manual_payment($1,$2,$3)', [manualOrder.id, 115000, 'BANK-001']);
assert.equal(
  (
    await db.query('select count(*)::int n from wallet_transactions where order_id=$1', [
      manualOrder.id,
    ])
  ).rows[0].n,
  1,
);
await db.query('select complete_withdrawal($1,$2)', [
  'abababab-abab-4bab-8bab-abababababab',
  'PAYOUT-001',
]);
assert.equal(
  (
    await db.query('select status from wallet_transactions where id=$1', [
      'abababab-abab-4bab-8bab-abababababab',
    ])
  ).rows[0].status,
  'selesai',
);
await asUser(a);
await assert.rejects(
  db.query('select confirm_manual_payment($1,$2,$3)', [manualOrder.id, 115000, 'FORGED-REF']),
  /permission denied/,
);
console.log(
  'PASS: manual transfers require operator authority, exact amounts and unique settlement; payout completion records audit.',
);
await db.exec('reset role');
await db.query("update stores set status='live' where id=$1",[sid]);
const leaseA='dededede-dede-4ede-8ede-dededededede';
await db.exec('set role service_role');
await assert.rejects(db.query('select begin_store_deploy($1,$2,$3)',[b,sid,leaseA]),/Toko tidak/);
const firstDeploy=(await db.query('select begin_store_deploy($1,$2,$3) data',[a,sid,leaseA])).rows[0].data;
assert.equal(firstDeploy.pending,false);
const retryDeploy=(await db.query('select begin_store_deploy($1,$2,$3) data',[a,sid,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'])).rows[0].data;
assert.equal(retryDeploy.pending,true);
assert.equal(retryDeploy.lease_id,leaseA);
await db.exec('reset role');
const publicBefore=(await db.query('select public_storefront($1,false) data',['toko-a'])).rows[0].data;
assert.equal(publicBefore.store.publicUrl,null);
const versionCount=(await db.query('select count(*)::int n from store_layouts where store_id=$1',[sid])).rows[0].n;
await db.query("update stores set draft=jsonb_set(draft,'{sections,0,title}','\"Edited during deploy\"') where id=$1",[sid]);
await db.query("update store_deployments set state='deploying',site_id='site-test',site_url='https://kiosku-test.netlify.app',deploy_id='deploy-test' where store_id=$1",[sid]);
await db.exec('set role service_role');
await db.query('select finish_store_deploy($1,$2)',[sid,'deploy-test']);
await db.query('select finish_store_deploy($1,$2)',[sid,'deploy-test']);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int n from store_layouts where store_id=$1',[sid])).rows[0].n,versionCount+1);
const finalStore=(await db.query('select draft,published from stores where id=$1',[sid])).rows[0];
assert.equal(finalStore.draft.sections[0].title,'Edited during deploy');
assert.deepEqual(finalStore.published,firstDeploy.candidate_layout);
await asUser(b);
assert.equal((await db.query('select * from store_deployments')).rows.length,0);
await assert.rejects(db.query('select finish_store_deploy($1,$2)',[sid,'deploy-test']),/permission denied/);
await db.exec('reset role;set role anon');
const publicAfter=(await db.query('select public_storefront($1,false) data',['toko-a'])).rows[0].data;
assert.equal(publicAfter.store.publicUrl,'https://kiosku-test.netlify.app');
assert.equal(publicAfter.store.deployment,null);
console.log('PASS: Netlify ownership, deployment lease, private status, captured layout, and idempotent publish.');
await db.close();
