import { createClient } from '@supabase/supabase-js';
import type { CheckoutInput, Command, Order, Product, Store, Workspace, Tier } from './types';
import { applyCommand, createOrder } from './domain';
import { emptyWorkspace, seedWorkspace } from './seed';
import { uid } from './utils';

export const isDemo = import.meta.env.VITE_DATA_MODE !== 'supabase';
// Temporary password registration; restore OTP with VITE_AUTH_MODE=otp and email confirmations.
export const emailOtpEnabled = import.meta.env.VITE_AUTH_MODE === 'otp';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = !isDemo && url && key ? createClient(url, key) : null;
const DATA_KEY = 'kiosku.demo.v1';
const SESSION_KEY = 'kiosku.demo.session';
function client() {
  if (!supabase)
    throw new Error(
      'Konfigurasi Supabase belum lengkap. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.',
    );
  return supabase;
}
function readLocal(): Workspace {
  const raw = localStorage.getItem(DATA_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw) as Workspace;
      if (
        s.account &&
        Array.isArray(s.stores) &&
        Array.isArray(s.products) &&
        Array.isArray(s.orders) &&
        Array.isArray(s.transactions)
      )
        return s;
    } catch {
      /* surface corrupted data, do not overwrite */
    }
    throw new Error(
      'Data demo tidak terbaca. Ekspor atau pulihkan data browser sebelum melanjutkan.',
    );
  }
  const s = seedWorkspace();
  writeLocal(s);
  return s;
}
function writeLocal(s: Workspace) {
  localStorage.setItem(DATA_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event('kiosku-update'));
}
async function locked<T>(action: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request('kiosku-demo-write', action) : action();
}
async function rpc<T>(name: string, params = {}): Promise<T> {
  const { data, error } = await client().rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}
export const repository = {
  async publishStatus(
    storeId: string,
    action: 'publish' | 'status' = 'status',
  ): Promise<{ state: string; url?: string; error?: string }> {
    const { data, error } = await client().functions.invoke('publish-store', {
      body: { storeId, action },
    });
    if (error) {
      let message = error.message;
      if (error.context instanceof Response) {
        try {
          message = (await error.context.json()).error || message;
        } catch {
          /* keep transport error */
        }
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  },
  async publicStoreSlug(storeId: string) {
    return rpc<string | null>('public_store_slug', { target_store: storeId });
  },
  async subscribe(tier: Tier) {
    const key = `kiosku.subscription.${tier}`;
    const requestId = sessionStorage.getItem(key) || uid();
    sessionStorage.setItem(key, requestId);
    const { data, error } = await client().functions.invoke('billing-checkout', {
      body: { tier, requestId },
    });
    if (error || data?.error || !data?.paymentUrl)
      throw new Error(data?.error || error?.message || 'Tautan pembayaran belum tersedia.');
    if (!/^https:\/\/(app\.midtrans\.com|app\.sandbox\.midtrans\.com)\//.test(data.paymentUrl))
      throw new Error('Tautan pembayaran tidak valid.');
    sessionStorage.removeItem(key);
    window.location.assign(data.paymentUrl);
  },
  async session() {
    if (isDemo) return !!localStorage.getItem(SESSION_KEY);
    const { data, error } = await client().auth.getSession();
    if (error) throw error;
    return !!data.session;
  },
  async demoLogin() {
    if (!isDemo) throw new Error('Mode demo tidak aktif.');
    readLocal();
    localStorage.setItem(SESSION_KEY, 'demo');
  },
  async startFresh(name: string, email: string) {
    if (!isDemo) throw new Error('Gunakan registrasi OTP.');
    writeLocal(emptyWorkspace(name, email));
    localStorage.setItem(SESSION_KEY, 'demo');
  },
  async signOut() {
    if (isDemo) localStorage.removeItem(SESSION_KEY);
    else await client().auth.signOut();
  },
  async signInWithPassword(email: string, password: string) {
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  },
  async registerWithPassword(name: string, email: string, password: string) {
    const { data, error } = await client().auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw error;
    if (!data.session)
      throw new Error(
        'Akun belum dapat masuk langsung. Konfigurasi verifikasi email perlu diperiksa.',
      );
  },
  async sendOtp(identifier: string, register: boolean, name?: string) {
    const c = client();
    const contact = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    const { error } = await c.auth.signInWithOtp({
      ...contact,
      options: {
        shouldCreateUser: register,
        ...(identifier.includes('@')
          ? { emailRedirectTo: `${window.location.origin}/app${register ? '/verifikasi' : ''}` }
          : {}),
        ...(register && name ? { data: { name } } : {}),
      },
    });
    if (error) throw error;
  },
  async verifyOtp(identifier: string, token: string) {
    const contact = identifier.includes('@')
      ? { email: identifier, token, type: 'email' as const }
      : { phone: identifier, token, type: 'sms' as const };
    const { error } = await client().auth.verifyOtp(contact);
    if (error) throw error;
  },
  async load(): Promise<Workspace> {
    return isDemo ? readLocal() : rpc<Workspace>('merchant_workspace');
  },
  async command(command: Command): Promise<Workspace> {
    if (isDemo)
      return locked(() => {
        const s = applyCommand(readLocal(), command);
        writeLocal(s);
        return s;
      });
    if (command.type === 'publish') {
      let result = await this.publishStatus(command.storeId, 'publish');
      for (let attempt = 0; result.state !== 'ready' && attempt < 35; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        result = await this.publishStatus(command.storeId);
      }
      if (result.state !== 'ready')
        throw new Error(
          'Netlify masih menyiapkan toko. Klik Cek status publish untuk melanjutkan.',
        );
    } else await rpc('merchant_command', { command });
    return this.load();
  },
  async slugAvailable(slug: string, except?: string) {
    if (isDemo) return !readLocal().stores.some((s) => s.slug === slug && s.id !== except);
    return rpc<boolean>('slug_available', { candidate: slug, except_id: except || null });
  },
  async storefront(
    slug: string,
    preview = false,
  ): Promise<{ store: Store; products: Product[] } | null> {
    if (isDemo) {
      const s = readLocal();
      const store = s.stores.find(
        (x) =>
          x.slug === slug &&
          (x.status === 'live' || (preview && localStorage.getItem(SESSION_KEY))),
      );
      return store
        ? { store, products: s.products.filter((p) => p.storeId === store.id && p.active) }
        : null;
    }
    return rpc('public_storefront', { store_slug: slug, preview });
  },
  async checkout(input: CheckoutInput): Promise<Order> {
    if (isDemo)
      return locked(() => {
        const result = createOrder(readLocal(), input);
        writeLocal(result.state);
        return result.order;
      });
    const { data, error } = await client().functions.invoke('checkout', { body: input });
    if (error || data?.error) throw new Error(data?.error || error?.message);
    return data.order;
  },
  async track(code: string, token: string): Promise<Order | null> {
    if (isDemo) return readLocal().orders.find((o) => o.code === code && o.token === token) || null;
    return rpc('track_order', { order_code: code, access_token: token });
  },
  async upload(file: File, kind: 'products' | 'verification') {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    )
      throw new Error('Gunakan gambar JPG, PNG, atau WebP maksimal 3 MB.');
    if (isDemo) {
      if (kind === 'verification') return 'demo-document-not-stored';
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    const {
      data: { user },
    } = await client().auth.getUser();
    if (!user) throw new Error('Silakan masuk kembali.');
    const ext = file.type.split('/')[1];
    const path = `${user.id}/${uid()}.${ext}`;
    const { error } = await client()
      .storage.from(kind)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return kind === 'verification'
      ? path
      : client().storage.from(kind).getPublicUrl(path).data.publicUrl;
  },
};
