import { paymentOutcome } from './payment.ts';
import { hash, equal, body, cors } from './http.ts';
function assert(value: unknown, message = 'Assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
Deno.test('signature digest matches SHA-512 known vector; tampering is rejected', async () => {
  const expected =
    'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f';
  assert(equal(await hash('abc', 'SHA-512'), expected));
  assert(!equal(await hash('abd', 'SHA-512'), expected));
  assert(!equal(expected, expected + 'a'));
});
Deno.test('pending and fraud challenge never credit money', () => {
  for (const status of ['pending', 'authorize', 'refund', 'partial_refund', 'unknown'])
    assert(paymentOutcome({ transaction_status: status }) === null, status);
  assert(paymentOutcome({ transaction_status: 'capture', fraud_status: 'challenge' }) === null);
  assert(paymentOutcome({ transaction_status: 'capture' }) === null);
  assert(paymentOutcome({ transaction_status: 'capture', fraud_status: 'accept' }) === 'lunas');
  assert(paymentOutcome({ transaction_status: 'settlement' }) === 'lunas');
  for (const status of ['deny', 'cancel', 'expire', 'failure'])
    assert(paymentOutcome({ transaction_status: status }) === 'gagal', status);
});
Deno.test('public request body size is bounded', async () => {
  let rejected = false;
  try {
    await body(new Request('https://example.test', { method: 'POST', body: 'x'.repeat(100) }), 50);
  } catch {
    rejected = true;
  }
  assert(rejected);
});
Deno.test('CORS does not accept lookalike store domains', () => {
  const before = Deno.env.get('BASE_DOMAIN');
  Deno.env.set('BASE_DOMAIN', 'kiosku.id');
  try {
    assert(
      cors(new Request('https://example.test', { headers: { origin: 'https://store.kiosku.id' } }))[
        'Access-Control-Allow-Origin'
      ] === 'https://store.kiosku.id',
    );
    assert(
      cors(
        new Request('https://example.test', {
          headers: { origin: 'https://kiosku.id.attacker.test' },
        }),
      )['Access-Control-Allow-Origin'] !== 'https://kiosku.id.attacker.test',
    );
  } finally {
    if (before) Deno.env.set('BASE_DOMAIN', before);
    else Deno.env.delete('BASE_DOMAIN');
  }
});
