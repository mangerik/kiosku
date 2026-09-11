import type { Order, Product, Transaction, Store } from './types';
export const storefrontUrl = (store: Store) => `/toko/${store.slug}`;
export const money = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
export const number = (n: number) => new Intl.NumberFormat('id-ID').format(n);
export const date = (v: string, time = false) =>
  new Date(v).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const priceOf = (p: Product) => Math.min(...p.variants.map((v) => v.price));
export const stockOf = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
export const balanceOf = (ts: Transaction[]) =>
  ts.reduce((sum, t) => sum + (t.type === 'masuk' ? t.amount : -t.amount), 0);
export const revenueOf = (os: Order[]) =>
  os.filter((o) => o.payment === 'lunas').reduce((s, o) => s + o.total, 0);
export const safeImage = (value: string) =>
  /^https:\/\//i.test(value) ||
  /^data:image\/(png|jpeg|webp);base64,/i.test(value) ||
  value.startsWith('/images/')
    ? value
    : '/images/placeholder.svg';
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Terjadi kendala. Silakan coba lagi.';
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export const orderLabels: Record<string, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  dikirim: 'Dikirim',
  selesai: 'Selesai',
  batal: 'Dibatalkan',
  lunas: 'Lunas',
  menunggu: 'Menunggu pembayaran',
  gagal: 'Gagal',
  live: 'Aktif',
  draft: 'Draft',
  nonaktif: 'Nonaktif',
  belum: 'Belum verifikasi',
  terverifikasi: 'Terverifikasi',
};
