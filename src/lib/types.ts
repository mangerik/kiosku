export type Tier = 'rintis' | 'tumbuh' | 'skala';
export type OrderStatus = 'baru' | 'diproses' | 'dikirim' | 'selesai' | 'batal';
export type PaymentStatus = 'menunggu' | 'lunas' | 'gagal';
export type Section = {
  id: string;
  type: 'hero' | 'products' | 'text' | 'testimonial';
  title: string;
  text: string;
  image: string;
};
export type Layout = {
  sections: Section[];
  color: string;
  font: string;
  logo: string;
  theme: string;
};
export type StorePaymentSettings = {
  bankEnabled: boolean;
  bank: string;
  bankNumber: string;
  bankName: string;
  qrisEnabled: boolean;
  qrisImage: string;
};
export type Account = {
  id: string;
  name: string;
  email: string;
  tier: Tier;
  verification: 'belum' | 'menunggu' | 'terverifikasi';
  bank: string;
  bankNumber: string;
  bankName: string;
};
export type Store = {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  contact: string;
  policy: string;
  shippingFee: number;
  paymentSettings: StorePaymentSettings;
  status: 'draft' | 'live' | 'nonaktif';
  draft: Layout;
  published: Layout | null;
  versions: { at: string; layout: Layout }[];
  createdAt: string;
};
export type Variant = { id: string; name: string; stock: number; price: number };
export type Product = {
  id: string;
  storeId: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  variants: Variant[];
  active: boolean;
  createdAt: string;
};
export type OrderItem = {
  productId: string;
  variantId: string;
  name: string;
  variant: string;
  quantity: number;
  price: number;
  image: string;
};
export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  note: string;
};
export type Order = {
  id: string;
  storeId: string;
  code: string;
  token: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  shippingFee: number;
  status: OrderStatus;
  payment: PaymentStatus;
  method: 'transfer' | 'qris';
  tracking: string;
  courier: string;
  createdAt: string;
  events: { at: string; text: string }[];
  paymentUrl?: string;
  paymentInstructions?: {
    bank?: string;
    number?: string;
    name?: string;
    qrisImage?: string;
  };
  paymentProofSubmitted?: boolean;
  paymentProofSubmittedAt?: string | null;
  paymentProofRejectedReason?: string | null;
};
export type Transaction = {
  id: string;
  storeId: string | null;
  orderId: string | null;
  type: 'masuk' | 'penarikan';
  amount: number;
  status: 'selesai' | 'diproses';
  description: string;
  createdAt: string;
};
export type Workspace = {
  account: Account;
  stores: Store[];
  products: Product[];
  orders: Order[];
  transactions: Transaction[];
};
export type CartItem = { productId: string; variantId: string; quantity: number };
export type Command =
  | { type: 'create-store'; name: string; slug: string; category: string; theme: string }
  | { type: 'save-store'; store: Store }
  | { type: 'save-payment-settings'; storeId: string; settings: StorePaymentSettings }
  | { type: 'save-product'; product: Product }
  | { type: 'delete-product'; id: string }
  | { type: 'import-products'; products: Product[] }
  | { type: 'save-layout'; storeId: string; layout: Layout }
  | { type: 'publish'; storeId: string }
  | { type: 'update-order'; id: string; status: OrderStatus; tracking: string; courier: string }
  | { type: 'pay-order'; id: string; outcome: 'lunas' | 'gagal' }
  | { type: 'review-payment'; id: string; decision: 'accept' | 'reject'; reason?: string }
  | { type: 'withdraw'; amount: number; requestId?: string }
  | { type: 'change-tier'; tier: Tier }
  | { type: 'verify'; bank: string; bankNumber: string; bankName: string; documentPath: string }
  | { type: 'save-account'; name: string };
export type CheckoutInput = {
  storeId: string;
  items: CartItem[];
  customer: Customer;
  method: 'transfer' | 'qris';
  requestId: string;
};
export const plans: {
  id: Tier;
  name: string;
  price: number;
  quota: number;
  description: string;
}[] = [
  { id: 'rintis', name: 'Rintis', price: 0, quota: 1, description: 'Cocok untuk yang baru mulai' },
  { id: 'tumbuh', name: 'Tumbuh', price: 5000, quota: 2, description: 'Untuk yang mulai ekspansi' },
  { id: 'skala', name: 'Skala', price: 16600, quota: 3, description: 'Untuk pemilik multi-brand' },
];
