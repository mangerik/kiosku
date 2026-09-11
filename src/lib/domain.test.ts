import { describe, expect, it } from 'vitest';
import { applyCommand, createOrder } from './domain';
import { seedWorkspace } from './seed';
import { balanceOf, uid } from './utils';
import type { CheckoutInput } from './types';
const customer = {
  name: 'Pelanggan Test',
  email: 'test@example.com',
  phone: '081234567890',
  address: 'Jalan Pengujian nomor 12',
  city: 'Bandung',
  postalCode: '40111',
  note: '',
};
describe('Commerce invariants', () => {
  it('isolates stores and rejects cross-store cart items', () => {
    const s = seedWorkspace();
    expect(() =>
      createOrder(s, {
        storeId: s.stores[1].id,
        items: [
          { productId: s.products[0].id, variantId: s.products[0].variants[0].id, quantity: 1 },
        ],
        customer,
        method: 'qris',
        requestId: uid(),
      }),
    ).toThrow('toko ini');
  });
  it('aggregates duplicate variants and rejects overselling without partial mutation', () => {
    const s = seedWorkspace();
    const p = s.products[0];
    const item = { productId: p.id, variantId: p.variants[0].id, quantity: 25 };
    expect(() =>
      createOrder(s, {
        storeId: p.storeId,
        items: [item, item],
        customer,
        method: 'qris',
        requestId: uid(),
      }),
    ).toThrow('tidak cukup');
    expect(s.products[0].variants[0].stock).toBe(42);
  });
  it('keeps direct store payments out of the platform wallet and reserves stock once', () => {
    const s = seedWorkspace();
    const p = s.products[0];
    const before = balanceOf(s.transactions);
    const input: CheckoutInput = {
      storeId: p.storeId,
      items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 2 }],
      customer,
      method: 'qris',
      requestId: uid(),
    };
    const { state, order } = createOrder(s, input);
    expect(balanceOf(state.transactions)).toBe(before);
    expect(state.products[0].variants[0].stock).toBe(40);
    const retry = createOrder(state, input);
    expect(retry.state.products[0].variants[0].stock).toBe(40);
    expect(() => createOrder(state, { ...input, method: 'transfer' })).toThrow(
      'ID checkout sudah digunakan',
    );
    state.orders.find((candidate) => candidate.id === order.id)!.paymentProofSubmitted = true;
    const paid = applyCommand(state, { type: 'review-payment', id: order.id, decision: 'accept' });
    expect(paid.orders.find((candidate) => candidate.id === order.id)?.payment).toBe('lunas');
    expect(balanceOf(paid.transactions)).toBe(before);
  });
  it('restores stock exactly once after failed payment', () => {
    const s = seedWorkspace();
    const p = s.products[0];
    const { state, order } = createOrder(s, {
      storeId: p.storeId,
      items: [{ productId: p.id, variantId: p.variants[0].id, quantity: 2 }],
      customer,
      method: 'transfer',
      requestId: uid(),
    });
    const failed = applyCommand(state, { type: 'pay-order', id: order.id, outcome: 'gagal' });
    const retry = applyCommand(failed, { type: 'pay-order', id: order.id, outcome: 'gagal' });
    expect(retry.products[0].variants[0].stock).toBe(42);
    expect(retry.orders[0].status).toBe('batal');
  });
  it('rejects withdrawals above balance and unverified accounts', () => {
    const s = seedWorkspace();
    expect(() =>
      applyCommand(s, { type: 'withdraw', amount: balanceOf(s.transactions) + 1 }),
    ).toThrow('melebihi');
    s.account.verification = 'menunggu';
    expect(() => applyCommand(s, { type: 'withdraw', amount: 1 })).toThrow('Verifikasi');
  });
  it('enforces quota and preserves store data on downgrade/upgrade', () => {
    const s = seedWorkspace();
    expect(() =>
      applyCommand(s, {
        type: 'create-store',
        name: 'Toko Tiga',
        slug: 'toko-tiga',
        category: 'Umum',
        theme: 'natural',
      }),
    ).toThrow('Kuota');
    const down = applyCommand(s, { type: 'change-tier', tier: 'rintis' });
    expect(down.stores[1].status).toBe('nonaktif');
    expect(down.products).toEqual(s.products);
    const up = applyCommand(down, { type: 'change-tier', tier: 'tumbuh' });
    expect(up.stores[1].status).toBe('live');
  });
  it('keeps drafts separate from published content', () => {
    const s = seedWorkspace();
    const store = s.stores[0];
    const layout = structuredClone(store.draft);
    layout.sections[0].title = 'Judul baru';
    const changed = applyCommand(s, { type: 'save-layout', storeId: store.id, layout });
    expect(changed.stores[0].published?.sections[0].title).not.toBe('Judul baru');
    const published = applyCommand(changed, { type: 'publish', storeId: store.id });
    expect(published.stores[0].published?.sections[0].title).toBe('Judul baru');
    expect(published.stores[0].versions).toHaveLength(2);
  });
  it('rejects processing unpaid orders and cross-store product moves', () => {
    const s = seedWorkspace();
    const o = s.orders.find((o) => o.payment === 'menunggu')!;
    expect(() =>
      applyCommand(s, {
        type: 'update-order',
        id: o.id,
        status: 'diproses',
        tracking: '',
        courier: '',
      }),
    ).toThrow('Pembayaran');
    const p = structuredClone(s.products[0]);
    p.storeId = s.stores[1].id;
    expect(() => applyCommand(s, { type: 'save-product', product: p })).toThrow('dipindahkan');
  });
});
