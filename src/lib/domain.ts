import { z } from 'zod';
import type { CheckoutInput, Command, Layout, Order, Product, Store, Workspace } from './types';
import { plans } from './types';
import { balanceOf, now, uid } from './utils';

export const slugSchema = z
  .string()
  .min(3, 'Alamat minimal 3 karakter.')
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Gunakan huruf kecil, angka, dan tanda hubung.')
  .refine(
    (s) => !['www', 'app', 'admin', 'api', 'mail', 'support'].includes(s),
    'Alamat ini tidak tersedia.',
  );
export const customerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().regex(/^\+?[0-9]{9,15}$/, 'Nomor telepon tidak valid.'),
  address: z.string().trim().min(8),
  city: z.string().trim().min(2),
  postalCode: z.string().regex(/^\d{5}$/),
  note: z.string().max(500),
});
export const defaultLayout = (theme = 'natural'): Layout => ({
  theme,
  color: theme === 'bold' ? '#272b37' : theme === 'warm' ? '#956a46' : '#176348',
  font: 'jakarta',
  logo: '',
  sections: [
    {
      id: uid(),
      type: 'hero',
      title: 'Pilihan baik untuk setiap hari.',
      text: 'Temukan koleksi pilihan kami. Dibuat dengan perhatian, untuk hal-hal yang berarti.',
      image: '/images/hero.jpg',
    },
    {
      id: uid(),
      type: 'products',
      title: 'Pilihan untukmu',
      text: 'Temukan favorit barumu di sini.',
      image: '',
    },
    {
      id: uid(),
      type: 'text',
      title: 'Cerita di balik toko kami',
      text: 'Kami percaya produk yang baik membuat keseharian terasa lebih istimewa.',
      image: '',
    },
  ],
});
export function validateProduct(p: Product) {
  if (!p.name.trim() || !p.category.trim() || !p.variants.length)
    throw new Error('Lengkapi nama, kategori, dan minimal satu varian.');
  if (new Set(p.variants.map((v) => v.id)).size !== p.variants.length)
    throw new Error('Varian duplikat.');
  for (const v of p.variants)
    if (
      !v.name.trim() ||
      !Number.isSafeInteger(v.stock) ||
      v.stock < 0 ||
      !Number.isSafeInteger(v.price) ||
      v.price <= 0
    )
      throw new Error('Harga harus positif dan stok berupa bilangan bulat minimal 0.');
}
function ownedStore(s: Workspace, id: string): Store {
  const store = s.stores.find((x) => x.id === id && x.accountId === s.account.id);
  if (!store) throw new Error('Toko tidak ditemukan.');
  return store;
}
function restoreStock(s: Workspace, order: Order) {
  for (const item of order.items) {
    const v = s.products
      .find((p) => p.id === item.productId && p.storeId === order.storeId)
      ?.variants.find((v) => v.id === item.variantId);
    if (v) v.stock += item.quantity;
  }
}
export function applyCommand(state: Workspace, command: Command): Workspace {
  const s = structuredClone(state);
  switch (command.type) {
    case 'create-store': {
      const quota = plans.find((p) => p.id === s.account.tier)!.quota;
      if (s.stores.filter((x) => x.status !== 'nonaktif').length >= quota)
        throw new Error('Kuota toko penuh. Upgrade paket untuk menambah toko.');
      const slug = slugSchema.parse(command.slug);
      if (s.stores.some((x) => x.slug === slug))
        throw new Error('Wah, nama ini sudah dipakai. Coba yang lain, ya.');
      if (!command.name.trim()) throw new Error('Nama toko wajib diisi.');
      s.stores.push({
        id: uid(),
        accountId: s.account.id,
        name: command.name.trim(),
        slug,
        category: command.category,
        description: '',
        contact: '',
        policy: 'Hubungi kami untuk pertanyaan pengiriman dan pengembalian.',
        shippingFee: 15000,
        paymentSettings: {
          bankEnabled: false,
          bank: '',
          bankNumber: '',
          bankName: '',
          qrisEnabled: false,
          qrisImage: '',
        },
        status: 'draft',
        draft: defaultLayout(command.theme),
        published: null,
        versions: [],
        createdAt: now(),
      });
      break;
    }
    case 'save-payment-settings': {
      const store = ownedStore(s, command.storeId);
      const p = command.settings;
      if (
        p.bankEnabled &&
        (!p.bank.trim() || !/^\d{8,20}$/.test(p.bankNumber) || p.bankName.trim().length < 2)
      )
        throw new Error('Lengkapi rekening pembayaran dengan benar.');
      if (p.qrisEnabled && !/^https:\/\//.test(p.qrisImage))
        throw new Error('Unggah gambar QRIS lebih dulu.');
      store.paymentSettings = structuredClone(p);
      break;
    }
    case 'save-store': {
      const store = ownedStore(s, command.store.id);
      const slug = slugSchema.parse(command.store.slug);
      if (s.stores.some((x) => x.id !== store.id && x.slug === slug))
        throw new Error('Alamat toko sudah digunakan.');
      if (
        !command.store.name.trim() ||
        !Number.isSafeInteger(command.store.shippingFee) ||
        command.store.shippingFee < 0
      )
        throw new Error('Nama toko dan ongkir tidak valid.');
      Object.assign(store, {
        name: command.store.name,
        slug,
        category: command.store.category,
        description: command.store.description,
        contact: command.store.contact,
        policy: command.store.policy,
        shippingFee: command.store.shippingFee,
      });
      break;
    }
    case 'save-product': {
      ownedStore(s, command.product.storeId);
      validateProduct(command.product);
      const existing = s.products.find((p) => p.id === command.product.id);
      if (existing && existing.storeId !== command.product.storeId)
        throw new Error('Produk tidak bisa dipindahkan ke toko lain.');
      if (existing) Object.assign(existing, command.product);
      else s.products.push(command.product);
      break;
    }
    case 'import-products':
      for (const p of command.products) {
        ownedStore(s, p.storeId);
        validateProduct(p);
        if (s.products.some((x) => x.id === p.id)) throw new Error('ID produk duplikat.');
        s.products.push(p);
      }
      break;
    case 'delete-product': {
      const p = s.products.find((p) => p.id === command.id);
      if (!p) throw new Error('Produk tidak ditemukan.');
      ownedStore(s, p.storeId);
      p.active = false;
      break;
    }
    case 'save-layout': {
      const store = ownedStore(s, command.storeId);
      if (!command.layout.sections.length || command.layout.sections.length > 20)
        throw new Error('Gunakan 1 sampai 20 bagian.');
      store.draft = command.layout;
      break;
    }
    case 'publish': {
      const store = ownedStore(s, command.storeId);
      if (store.status === 'nonaktif') throw new Error('Upgrade paket untuk mengaktifkan toko.');
      if (!s.products.some((p) => p.storeId === store.id && p.active))
        throw new Error('Tambahkan minimal satu produk sebelum publish.');
      store.published = structuredClone(store.draft);
      store.versions.unshift({ at: now(), layout: structuredClone(store.draft) });
      store.status = 'live';
      break;
    }
    case 'update-order': {
      const order = s.orders.find((o) => o.id === command.id);
      if (!order) throw new Error('Pesanan tidak ditemukan.');
      ownedStore(s, order.storeId);
      const allowed: Record<string, string[]> = {
        baru: ['diproses', 'batal'],
        diproses: ['dikirim'],
        dikirim: ['selesai'],
        selesai: [],
        batal: [],
      };
      if (!allowed[order.status].includes(command.status))
        throw new Error('Perubahan status tidak diizinkan.');
      if (command.status !== 'batal' && order.payment !== 'lunas')
        throw new Error('Pembayaran belum terkonfirmasi.');
      if (command.status === 'batal' && order.payment === 'lunas')
        throw new Error(
          'Pesanan sudah dibayar; pengembalian dana perlu diproses melalui penyedia pembayaran.',
        );
      if (command.status === 'dikirim' && (!command.tracking.trim() || !command.courier.trim()))
        throw new Error('Isi kurir dan nomor resi.');
      if (command.status === 'batal') {
        restoreStock(s, order);
        order.payment = 'gagal';
      }
      Object.assign(order, {
        status: command.status,
        tracking: command.tracking,
        courier: command.courier,
      });
      order.events.push({
        at: now(),
        text: `Pesanan ${command.status === 'batal' ? 'dibatalkan' : command.status}.`,
      });
      break;
    }
    case 'pay-order': {
      const order = s.orders.find((o) => o.id === command.id);
      if (!order) throw new Error('Pesanan tidak ditemukan.');
      ownedStore(s, order.storeId);
      if (order.payment !== 'menunggu') break;
      order.payment = command.outcome;
      if (command.outcome === 'lunas') {
        s.transactions.unshift({
          id: uid(),
          storeId: order.storeId,
          orderId: order.id,
          type: 'masuk',
          amount: order.total,
          status: 'selesai',
          description: `Pembayaran ${order.code}`,
          createdAt: now(),
        });
        order.events.push({ at: now(), text: 'Pembayaran terkonfirmasi.' });
      } else {
        restoreStock(s, order);
        order.status = 'batal';
        order.events.push({ at: now(), text: 'Pembayaran gagal. Stok dikembalikan.' });
      }
      break;
    }
    case 'review-payment': {
      const order = s.orders.find((o) => o.id === command.id);
      if (!order) throw new Error('Pesanan tidak ditemukan.');
      ownedStore(s, order.storeId);
      if (order.payment !== 'menunggu') throw new Error('Pembayaran sudah diperiksa.');
      if (command.decision === 'accept') {
        if (!order.paymentProofSubmitted) throw new Error('Bukti pembayaran belum diunggah.');
        order.payment = 'lunas';
        order.paymentProofRejectedReason = null;
        order.events.push({ at: now(), text: 'Pembayaran dikonfirmasi pemilik toko.' });
      } else {
        const reason = command.reason?.trim();
        if (!reason) throw new Error('Isi alasan penolakan bukti.');
        order.paymentProofSubmitted = false;
        order.paymentProofSubmittedAt = null;
        order.paymentProofRejectedReason = reason;
        order.events.push({ at: now(), text: `Bukti pembayaran ditolak: ${reason}` });
      }
      break;
    }
    case 'withdraw': {
      const existing = command.requestId && s.transactions.find((t) => t.id === command.requestId);
      if (existing) {
        if (existing.type !== 'penarikan' || existing.amount !== command.amount)
          throw new Error('ID penarikan sudah digunakan.');
        break;
      }
      if (s.account.verification !== 'terverifikasi')
        throw new Error('Verifikasi rekening terlebih dahulu.');
      if (
        !Number.isSafeInteger(command.amount) ||
        command.amount <= 0 ||
        command.amount > balanceOf(s.transactions)
      )
        throw new Error('Jumlah penarikan tidak valid atau melebihi saldo.');
      s.transactions.unshift({
        id: command.requestId || uid(),
        storeId: null,
        orderId: null,
        type: 'penarikan',
        amount: command.amount,
        status: 'diproses',
        description: `Penarikan ke ${s.account.bank} • ${s.account.bankNumber.slice(-4)}`,
        createdAt: now(),
      });
      break;
    }
    case 'change-tier': {
      s.account.tier = command.tier;
      const quota = plans.find((p) => p.id === command.tier)!.quota;
      s.stores.forEach((store, i) => {
        store.status = i >= quota ? 'nonaktif' : store.published ? 'live' : 'draft';
      });
      break;
    }
    case 'verify': {
      if (
        !command.documentPath ||
        !command.bankName.trim() ||
        !command.bank ||
        !/^\d{8,20}$/.test(command.bankNumber)
      )
        throw new Error('Lengkapi dokumen dan rekening dengan benar.');
      Object.assign(s.account, {
        bank: command.bank,
        bankNumber: command.bankNumber,
        bankName: command.bankName,
        verification: 'menunggu',
      });
      break;
    }
    case 'save-account': {
      if (command.name.trim().length < 2) throw new Error('Nama minimal dua karakter.');
      s.account.name = command.name.trim();
      break;
    }
  }
  return s;
}
export function createOrder(
  state: Workspace,
  input: CheckoutInput,
): { state: Workspace; order: Order } {
  const old = state.orders.find((o) => o.id === input.requestId);
  if (old) {
    const requested = new Map<string, number>();
    input.items.forEach((i) =>
      requested.set(i.variantId, (requested.get(i.variantId) || 0) + i.quantity),
    );
    if (
      old.storeId !== input.storeId ||
      old.method !== input.method ||
      JSON.stringify(old.customer) !== JSON.stringify(customerSchema.parse(input.customer)) ||
      old.items.length !== requested.size ||
      old.items.some(
        (i) =>
          requested.get(i.variantId) !== i.quantity ||
          !input.items.some((x) => x.productId === i.productId && x.variantId === i.variantId),
      )
    )
      throw new Error('ID checkout sudah digunakan.');
    return { state, order: old };
  }
  const s = structuredClone(state);
  const store = s.stores.find((x) => x.id === input.storeId && x.status === 'live');
  if (!store) throw new Error('Toko tidak tersedia.');
  const customer = customerSchema.parse(input.customer);
  const payment = store.paymentSettings;
  if (
    (input.method === 'transfer' && !payment.bankEnabled) ||
    (input.method === 'qris' && !payment.qrisEnabled)
  )
    throw new Error('Metode pembayaran tidak tersedia di toko ini.');
  if (!input.items.length || input.items.length > 50)
    throw new Error('Keranjang kosong atau terlalu banyak item.');
  const quantities = new Map<string, { productId: string; variantId: string; quantity: number }>();
  for (const item of input.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)
      throw new Error('Jumlah produk tidak valid.');
    const key = `${item.productId}:${item.variantId}`;
    const prev = quantities.get(key);
    quantities.set(key, { ...item, quantity: item.quantity + (prev?.quantity ?? 0) });
  }
  const items = [...quantities.values()].map((item) => {
    const p = s.products.find((p) => p.id === item.productId && p.storeId === store.id && p.active);
    const v = p?.variants.find((v) => v.id === item.variantId);
    if (!p || !v) throw new Error('Produk tidak tersedia di toko ini.');
    if (v.stock < item.quantity) throw new Error(`Stok ${p.name} (${v.name}) tidak cukup.`);
    v.stock -= item.quantity;
    return { ...item, name: p.name, variant: v.name, price: v.price, image: p.images[0] ?? '' };
  });
  const order: Order = {
    id: input.requestId,
    code: `KIO-${input.requestId.slice(0, 8).toUpperCase()}`,
    token: uid(),
    storeId: store.id,
    customer,
    items,
    shippingFee: store.shippingFee,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, store.shippingFee),
    status: 'baru',
    payment: 'menunggu',
    method: input.method,
    tracking: '',
    courier: '',
    createdAt: now(),
    events: [{ at: now(), text: 'Pesanan dibuat. Menunggu pembayaran.' }],
    paymentInstructions:
      input.method === 'transfer'
        ? { bank: payment.bank, number: payment.bankNumber, name: payment.bankName }
        : { qrisImage: payment.qrisImage },
    paymentProofSubmitted: false,
    paymentProofSubmittedAt: null,
    paymentProofRejectedReason: null,
  };
  if (!Number.isSafeInteger(order.total)) throw new Error('Total pesanan terlalu besar.');
  s.orders.unshift(order);
  return { state: s, order };
}
