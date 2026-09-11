import type { Workspace, Product, Store, Order } from './types';
import { defaultLayout } from './domain';
import { uid } from './utils';

export function emptyWorkspace(name = 'Pemilik Usaha', email = ''): Workspace {
  return {
    account: {
      id: uid(),
      name,
      email,
      tier: 'rintis',
      verification: 'belum',
      bank: '',
      bankNumber: '',
      bankName: '',
    },
    stores: [],
    products: [],
    orders: [],
    transactions: [],
  };
}
export function seedWorkspace(): Workspace {
  const s = emptyWorkspace('Nadia Putri', 'nadia@example.com');
  s.account = {
    ...s.account,
    tier: 'tumbuh',
    verification: 'terverifikasi',
    bank: 'BCA',
    bankNumber: '1234567890',
    bankName: 'Nadia Putri (Demo)',
  };
  const daysAgo = (d: number) => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(9 + (d % 9), 20);
    return date.toISOString();
  };
  s.stores = [
    {
      name: 'Ruang Rupa',
      slug: 'ruang-rupa',
      category: 'Fashion & aksesori',
      description:
        'Ruang untuk hal-hal sederhana yang berarti. Koleksi pilihan untuk keseharianmu.',
      contact: '',
      policy:
        'Pengiriman dalam 1–2 hari kerja. Pengembalian produk maksimal 7 hari setelah diterima.',
      theme: 'natural',
    },
    {
      name: 'Kopi Senja',
      slug: 'kopi-senja',
      category: 'Makanan & minuman',
      description: 'Secangkir cerita dari petani kopi Indonesia.',
      contact: '',
      policy: 'Kopi dipanggang segar setiap minggu. Hubungi kami jika ada kendala pada pesanan.',
      theme: 'warm',
    },
  ].map((x, i): Store => {
    const layout = defaultLayout(x.theme);
    if (i === 1)
      Object.assign(layout.sections[0], {
        title: 'Cerita baik dimulai dari secangkir kopi.',
        text: 'Biji kopi pilihan dari tanah Indonesia, disangrai dengan sepenuh hati.',
        image: '/images/coffee.jpg',
      });
    return {
      ...x,
      id: uid(),
      accountId: s.account.id,
      shippingFee: 15000,
      paymentSettings: {
        bankEnabled: true,
        bank: 'BCA',
        bankNumber: '1234567890',
        bankName: `${x.name} (Demo)`,
        qrisEnabled: true,
        qrisImage: '/images/placeholder.svg',
      },
      status: 'live',
      draft: layout,
      published: structuredClone(layout),
      versions: [{ at: daysAgo(30), layout: structuredClone(layout) }],
      createdAt: daysAgo(45),
    };
  });
  const specs = [
    ['Everyday Linen Shirt', 'Atasan', 'shirt.jpg', 189000, 42, 0],
    ['Canvas Everyday Tote', 'Aksesori', 'tote.jpg', 129000, 28, 0],
    ['Essential Cotton Tee', 'Atasan', 'tee.jpg', 99000, 5, 0],
    ['Classic White Sneakers', 'Sepatu', 'shoes.jpg', 349000, 16, 0],
    ['Signature House Blend', 'Biji kopi', 'coffee.jpg', 85000, 64, 1],
    ['Gayo Arabica 250g', 'Biji kopi', 'beans.jpg', 115000, 32, 1],
    ['Ceramic Coffee Cup', 'Peralatan', 'cup.jpg', 79000, 8, 1],
    ['Cold Brew Original', 'Minuman', 'coldbrew.jpg', 35000, 20, 1],
  ] as const;
  s.products = specs.map(([name, category, img, price, stock, si]): Product => ({
    id: uid(),
    storeId: s.stores[si].id,
    name,
    category,
    images: [`/images/${img}`],
    description: si
      ? 'Dibuat dari bahan pilihan. Nikmati pengalaman kopi yang hangat dan berkarakter setiap hari.'
      : 'Desain sederhana, bahan berkualitas, dan detail yang dipikirkan dengan baik. Pilihan nyaman untuk menemani aktivitas sehari-hari.',
    active: true,
    variants: [
      { id: uid(), name: si ? 'Reguler' : 'M / Natural', stock, price },
      ...(name.includes('Shirt') || name.includes('Tee')
        ? [{ id: uid(), name: 'L / Natural', stock: 14, price }]
        : []),
    ],
    createdAt: daysAgo(25),
  }));
  const names = [
    'Andi Pratama',
    'Sinta Maharani',
    'Budi Santoso',
    'Dewi Lestari',
    'Rizky Ramadhan',
    'Ayu Wulandari',
  ];
  s.orders = Array.from({ length: 48 }, (_, i): Order => {
    const p = s.products[(i * 3) % s.products.length];
    const item = {
      productId: p.id,
      variantId: p.variants[0].id,
      name: p.name,
      variant: p.variants[0].name,
      quantity: 1 + (i % 3),
      price: p.variants[0].price,
      image: p.images[0],
    };
    const payment = i === 2 || i === 5 ? 'menunggu' : 'lunas';
    return {
      id: uid(),
      code: `KIO-${String(1048 - i).padStart(6, '0')}`,
      token: uid(),
      storeId: p.storeId,
      customer: {
        name: names[i % names.length],
        email: `pelanggan${i}@example.com`,
        phone: '081234567890',
        address: 'Jl. Contoh No. 12',
        city: i % 2 ? 'Bandung' : 'Jakarta',
        postalCode: '40111',
        note: '',
      },
      items: [item],
      shippingFee: 15000,
      total: item.price * item.quantity + 15000,
      status:
        payment === 'menunggu' || i === 0
          ? 'baru'
          : i < 5
            ? 'diproses'
            : i < 8
              ? 'dikirim'
              : 'selesai',
      payment,
      method: i % 2 ? 'transfer' : 'qris',
      courier: i > 4 ? 'JNE' : '',
      tracking: i > 4 ? `DEMO${10000 + i}` : '',
      createdAt: daysAgo(Math.floor(i / 2)),
      events: [
        {
          at: daysAgo(Math.floor(i / 2)),
          text:
            payment === 'lunas'
              ? 'Pembayaran terkonfirmasi.'
              : 'Pesanan dibuat. Menunggu pembayaran.',
        },
      ],
    };
  });
  s.transactions = s.orders
    .filter((o) => o.payment === 'lunas')
    .map((o) => ({
      id: uid(),
      storeId: o.storeId,
      orderId: o.id,
      type: 'masuk',
      amount: o.total,
      status: 'selesai',
      description: `Pembayaran ${o.code}`,
      createdAt: o.createdAt,
    }));
  s.transactions.unshift({
    id: uid(),
    storeId: null,
    orderId: null,
    type: 'penarikan',
    amount: 3250000,
    status: 'selesai',
    description: 'Penarikan ke BCA • 7890',
    createdAt: daysAgo(7),
  });
  return s;
}
