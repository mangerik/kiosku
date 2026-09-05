import { useEffect, useState } from 'react';
import { Link, useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Trash,
  ShieldCheck,
  Truck,
  CheckCircle,
  CreditCard,
  Storefront as StoreIcon,
  MagnifyingGlass,
  WhatsappLogo,
  Clock,
  Copy,
} from '@phosphor-icons/react';
import { repository, isDemo } from '../lib/repository';
import { useApp } from '../lib/context';
import type { CartItem, Customer, Order, Product, Store } from '../lib/types';
import { money, priceOf, safeImage, stockOf, uid, errorText, date } from '../lib/utils';
import { customerSchema } from '../lib/domain';
import { StoreRenderer, ProductCard } from '../components/StoreRenderer';
import {
  Button,
  Input,
  Field,
  Textarea,
  Select,
  Search,
  Loading,
  Empty,
  Badge,
  FormError,
} from '../components/ui';
function cartRead(slug: string): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(`kiosku.cart.${slug}`) || '[]');
  } catch {
    return [];
  }
}
export default function Storefront() {
  const { slug = '', productId } = useParams();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const { authenticated, toast } = useApp();
  const [loaded, setLoaded] = useState<{ store: Store; products: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => cartRead(slug));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError('');
    repository
      .storefront(slug, preview)
      .then((s) => {
        if (alive) setLoaded(s);
      })
      .catch((e) => {
        if (alive) setLoadError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    setCart(cartRead(slug));
    return () => {
      alive = false;
    };
  }, [slug, preview]);
  useEffect(() => {
    if (loaded) {
      const selected = loaded.products.find((p) => p.id === productId);
      document.title = selected
        ? `${selected.name} — ${loaded.store.name}`
        : `${loaded.store.name} — Kiosku.id`;
      const meta = document.querySelector('meta[name="description"]');
      meta?.setAttribute(
        'content',
        selected?.description ||
          loaded.store.description ||
          `Belanja koleksi pilihan ${loaded.store.name}.`,
      );
    }
  }, [loaded, productId]);
  function updateCart(items: CartItem[]) {
    setCart(items);
    localStorage.setItem(`kiosku.cart.${slug}`, JSON.stringify(items));
  }
  function add(p: Product, variantId: string, quantity: number) {
    const existing = cart.find((x) => x.variantId === variantId && x.productId === p.id);
    const v = p.variants.find((v) => v.id === variantId)!;
    if ((existing?.quantity || 0) + quantity > v.stock) {
      toast('Jumlah di keranjang melebihi stok tersedia.', true);
      return;
    }
    updateCart(
      existing
        ? cart.map((x) => (x === existing ? { ...x, quantity: x.quantity + quantity } : x))
        : [...cart, { productId: p.id, variantId, quantity }],
    );
    toast('Produk ditambahkan ke keranjang.');
  }
  if (loading) return <Loading />;
  if (!loaded)
    return (
      <main className="shop-unavailable">
        <StoreIcon size={46} />
        <h1>{loadError ? 'Toko belum dapat dimuat' : 'Toko belum tersedia'}</h1>
        <p>{loadError || 'Toko sedang disiapkan atau sementara tidak aktif.'}</p>
        <Link className="btn btn-primary" to="/">
          Kembali ke Kiosku
        </Link>
      </main>
    );
  const { store, products } = loaded;
  const layout = preview && authenticated ? store.draft : store.published;
  if (!layout) return <Empty title="Toko belum dipublikasikan" />;
  const path = `/toko/${slug}`;
  const product = products.find((p) => p.id === productId);
  const isCart = pathname.endsWith('/keranjang');
  const isCheckout = pathname.endsWith('/checkout');
  const isTracking = pathname.endsWith('/lacak');
  const isCatalog = pathname.endsWith('/katalog');
  const isAbout = pathname.endsWith('/tentang');
  let filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'all' || p.category === category),
  );
  if (sort !== 'default')
    filtered = [...filtered].sort((a, b) =>
      sort === 'low' ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a),
    );
  return (
    <div
      className={`shop font-${layout.font}`}
      style={{ '--shop-color': layout.color } as React.CSSProperties}
    >
      {(isDemo || preview) && (
        <div className="shop-demo-strip">
          {preview
            ? 'Preview draft — perubahan belum dipublikasikan'
            : 'Toko demo — pesanan dan pembayaran adalah simulasi'}
          {authenticated && (
            <Link to="/app">
              Kembali ke dashboard <ArrowUpRightText />
            </Link>
          )}
        </div>
      )}
      <div className="shop-announcement">
        Pilihan yang dipikirkan dengan baik, untuk keseharianmu.
      </div>
      <header className="shop-nav">
        <Link className="shop-brand" to={path}>
          {layout.logo && <img src={safeImage(layout.logo)} alt="" />}
          {store.name}
          <span>.</span>
        </Link>
        <nav>
          <Link to={path}>Beranda</Link>
          <Link to={`${path}/katalog`}>Koleksi</Link>
          <Link to={`${path}/tentang`}>Tentang kami</Link>
          <Link to={`${path}/lacak`}>Lacak pesanan</Link>
        </nav>
        <div>
          <Link className="icon-btn" to={`${path}/katalog`} aria-label="Cari produk">
            <MagnifyingGlass size={22} />
          </Link>
          <Link
            className="cart-button"
            to={`${path}/keranjang`}
            aria-label={`Keranjang, ${cart.reduce((s, i) => s + i.quantity, 0)} item`}
          >
            <ShoppingBag size={23} />
            <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </Link>
        </div>
      </header>
      <main id="main-content">
        {isTracking ? (
          <Tracking slug={slug} />
        ) : isCart || isCheckout ? (
          <CartCheckout
            store={store}
            products={products}
            cart={cart}
            setCart={updateCart}
            checkout={isCheckout}
          />
        ) : productId ? (
          product ? (
            <ProductDetail key={product.id} product={product} store={store} add={add} />
          ) : (
            <Empty
              title="Produk tidak tersedia"
              action={<Link to={`${path}/katalog`}>Kembali ke koleksi</Link>}
            />
          )
        ) : isCatalog ? (
          <section className="shop-catalog">
            <div className="shop-catalog-heading">
              <span className="eyebrow">DIKURASI DENGAN SEPENUH HATI</span>
              <h1>Koleksi kami</h1>
              <p>Temukan sesuatu yang terasa seperti kamu.</p>
            </div>
            <div className="table-toolbar">
              <Search value={query} onChange={setQuery} placeholder="Cari produk favoritmu..." />
              <Select
                aria-label="Kategori produk"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">Semua kategori</option>
                {[...new Set(products.map((p) => p.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Select
                aria-label="Urutkan produk"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="default">Pilihan toko</option>
                <option value="low">Harga terendah</option>
                <option value="high">Harga tertinggi</option>
              </Select>
            </div>
            <p className="muted">{filtered.length} produk</p>
            <div className="shop-products">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} slug={slug} />
              ))}
            </div>
            {!filtered.length && (
              <Empty
                title="Belum menemukan yang dicari"
                description="Coba kata kunci atau kategori lain."
              />
            )}
          </section>
        ) : isAbout ? (
          <section className="shop-about">
            <span className="eyebrow">CERITA KAMI</span>
            <h1>{store.name}</h1>
            <p>
              {store.description ||
                'Selamat datang di toko kami. Temukan koleksi pilihan yang kami siapkan untukmu.'}
            </p>
            <h2>Pengiriman & pengembalian</h2>
            <p>{store.policy}</p>
            <p>Ongkir tetap: {money(store.shippingFee)} per pesanan.</p>
            {store.contact && (
              <a
                className="btn shop-btn"
                href={`https://wa.me/${store.contact.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                <WhatsappLogo size={20} />
                Hubungi toko
              </a>
            )}
          </section>
        ) : (
          <StoreRenderer layout={layout} store={store} products={products} preview={preview} />
        )}
      </main>
      <section className="shop-promises">
        <div>
          <ShieldCheck />
          <span>Pembayaran aman</span>
        </div>
        <div>
          <Truck />
          <span>Dikirim dengan perhatian</span>
        </div>
        <div>
          <ShoppingBag />
          <span>Produk pilihan untukmu</span>
        </div>
      </section>
      <footer className="shop-footer">
        <div>
          <Link to={path} className="shop-brand">
            {store.name}.
          </Link>
          <p>{store.description || 'Temukan hal baik untuk setiap hari.'}</p>
        </div>
        <div>
          <h4>Jelajahi</h4>
          <Link to={`${path}/katalog`}>Koleksi produk</Link>
          <Link to={`${path}/tentang`}>Tentang & kebijakan toko</Link>
          <Link to={`${path}/lacak`}>Lacak pesanan</Link>
        </div>
        <div>
          <h4>Dibuat dengan Kiosku.id</h4>
          <p>Satu akun, semua toko kamu.</p>
          <Link to="/">
            Buat toko sendiri <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
function ArrowUpRightText() {
  return <span>↗</span>;
}
function ProductDetail({
  product: p,
  store,
  add,
}: {
  product: Product;
  store: Store;
  add: (p: Product, v: string, q: number) => void;
}) {
  const [variant, setVariant] = useState(p.variants[0].id);
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState(p.images[0] || '');
  const v = p.variants.find((v) => v.id === variant)!;
  return (
    <section className="shop-product-detail">
      <Link className="back-link" to={`/toko/${store.slug}/katalog`}>
        <ArrowLeft />
        Kembali ke koleksi
      </Link>
      <div className="product-detail-grid">
        <div>
          <img className="product-main-image" src={safeImage(image)} alt={p.name} />
          <div className="product-thumbnails">
            {p.images.map((src) => (
              <button key={src} onClick={() => setImage(src)} aria-label="Lihat foto produk">
                <img src={safeImage(src)} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="product-description">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="product-price">{money(v.price)}</div>
          <p>{p.description}</p>
          <Field label="Pilih varian">
            <div className="variant-options">
              {p.variants.map((x) => (
                <button
                  className={x.id === variant ? 'selected' : ''}
                  key={x.id}
                  onClick={() => {
                    setVariant(x.id);
                    setQty(1);
                  }}
                >
                  {x.name}
                  {x.stock === 0 ? ' · Habis' : ''}
                </button>
              ))}
            </div>
          </Field>
          <small className={v.stock ? 'text-green' : 'text-red'}>
            {v.stock ? `${v.stock} tersedia` : 'Stok habis'}
          </small>
          <div className="product-buy">
            <div className="quantity">
              <button
                aria-label="Kurangi jumlah"
                disabled={qty <= 1}
                onClick={() => setQty(qty - 1)}
              >
                <Minus />
              </button>
              <span>{qty}</span>
              <button
                aria-label="Tambah jumlah"
                disabled={qty >= v.stock}
                onClick={() => setQty(qty + 1)}
              >
                <Plus />
              </button>
            </div>
            <Button className="shop-btn" disabled={!v.stock} onClick={() => add(p, v.id, qty)}>
              <ShoppingBag />
              Tambah ke keranjang
            </Button>
          </div>
          <Link to={`/toko/${store.slug}/keranjang`} className="text-link">
            Lihat keranjang <ArrowRight />
          </Link>
          <details open>
            <summary>Pengiriman & kebijakan</summary>
            <p>{store.policy}</p>
            <p>Ongkir: {money(store.shippingFee)} per pesanan.</p>
          </details>
        </div>
      </div>
    </section>
  );
}
function CartCheckout({
  store,
  products,
  cart,
  setCart,
  checkout,
}: {
  store: Store;
  products: Product[];
  cart: CartItem[];
  setCart: (c: CartItem[]) => void;
  checkout: boolean;
}) {
  const navigate = useNavigate();
  const path = `/toko/${store.slug}`;
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    note: '',
  });
  const [method, setMethod] = useState<'transfer' | 'qris'>('qris');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requestId] = useState(() => {
    const key = `kiosku.checkout.${store.slug}`;
    const id = sessionStorage.getItem(key) || uid();
    sessionStorage.setItem(key, id);
    return id;
  });
  const items = cart.map((i) => {
    const p = products.find((p) => p.id === i.productId);
    const v = p?.variants.find((v) => v.id === i.variantId);
    return { ...i, p, v };
  });
  const invalid = items.some((i) => !i.p || !i.v || i.quantity > i.v.stock);
  const subtotal = items.reduce((s, i) => s + (i.v?.price || 0) * i.quantity, 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const parsed = customerSchema.safeParse(customer);
      if (!parsed.success)
        throw new Error(
          'Lengkapi nama, email, HP, alamat, kota, dan kode pos 5 digit dengan benar.',
        );
      const order = await repository.checkout({
        storeId: store.id,
        items: cart,
        customer: parsed.data,
        method,
        requestId,
      });
      setCart([]);
      sessionStorage.removeItem(`kiosku.checkout.${store.slug}`);
      navigate(`${path}/lacak?code=${order.code}&token=${order.token}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="shop-checkout">
      <Link to={checkout ? `${path}/keranjang` : `${path}/katalog`} className="back-link">
        <ArrowLeft />
        {checkout ? 'Kembali ke keranjang' : 'Lanjut belanja'}
      </Link>
      <h1>{checkout ? 'Sedikit lagi, jadi milikmu.' : 'Keranjang belanja'}</h1>
      {!cart.length ? (
        <Empty
          title="Keranjangmu masih kosong"
          description="Ada banyak pilihan baik yang menunggumu."
          action={
            <Link className="btn shop-btn" to={`${path}/katalog`}>
              Jelajahi koleksi
            </Link>
          }
        />
      ) : (
        <form className="checkout-grid" onSubmit={submit}>
          <div>
            {checkout ? (
              <div className="form-stack checkout-form">
                <h2>Informasi pengiriman</h2>
                <div className="form-grid">
                  <Field label="Nama penerima">
                    <Input
                      required
                      autoComplete="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Nomor HP">
                    <Input
                      required
                      type="tel"
                      pattern="\+?[0-9]{9,15}"
                      autoComplete="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  />
                </Field>
                <Field label="Alamat lengkap">
                  <Textarea
                    required
                    minLength={8}
                    autoComplete="street-address"
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Kota / kabupaten">
                    <Input
                      required
                      autoComplete="address-level2"
                      value={customer.city}
                      onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    />
                  </Field>
                  <Field label="Kode pos">
                    <Input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      autoComplete="postal-code"
                      value={customer.postalCode}
                      onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Catatan (opsional)">
                  <Input
                    maxLength={500}
                    value={customer.note}
                    onChange={(e) => setCustomer({ ...customer, note: e.target.value })}
                  />
                </Field>
                <h2>Metode pembayaran</h2>
                <div className="payment-methods">
                  {(['qris', 'transfer'] as const).map((m) => (
                    <label className={method === m ? 'selected' : ''} key={m}>
                      <input
                        type="radio"
                        name="payment"
                        checked={method === m}
                        onChange={() => setMethod(m)}
                      />
                      <CreditCard size={24} />
                      <span>
                        <strong>{m === 'qris' ? 'QRIS' : 'Transfer bank manual'}</strong>
                        <small>
                          {m === 'qris'
                            ? 'Bayar melalui aplikasi pembayaran pilihanmu'
                            : 'Pembayaran dikonfirmasi setelah dana diterima'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="cart-items">
                {items.map((i) => (
                  <div className="cart-item" key={i.variantId}>
                    <img src={safeImage(i.p?.images[0] || '')} alt="" />
                    <div className="grow">
                      <strong>{i.p?.name || 'Produk tidak tersedia'}</strong>
                      <small>{i.v?.name}</small>
                      <span>{money(i.v?.price || 0)}</span>
                      <div className="quantity">
                        <button
                          type="button"
                          aria-label={`Kurangi ${i.p?.name}`}
                          disabled={i.quantity <= 1}
                          onClick={() =>
                            setCart(
                              cart.map((x) =>
                                x.variantId === i.variantId
                                  ? { ...x, quantity: x.quantity - 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Minus />
                        </button>
                        <span>{i.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Tambah ${i.p?.name}`}
                          disabled={i.quantity >= (i.v?.stock || 0)}
                          onClick={() =>
                            setCart(
                              cart.map((x) =>
                                x.variantId === i.variantId
                                  ? { ...x, quantity: x.quantity + 1 }
                                  : x,
                              ),
                            )
                          }
                        >
                          <Plus />
                        </button>
                      </div>
                    </div>
                    <div>
                      <strong>{money((i.v?.price || 0) * i.quantity)}</strong>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Hapus ${i.p?.name}`}
                        onClick={() => setCart(cart.filter((x) => x.variantId !== i.variantId))}
                      >
                        <Trash size={19} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="checkout-summary">
            <h2>Ringkasan belanja</h2>
            {checkout &&
              items.map((i) => (
                <div className="summary-line" key={i.variantId}>
                  <span>
                    {i.p?.name} × {i.quantity}
                  </span>
                  <strong>{money((i.v?.price || 0) * i.quantity)}</strong>
                </div>
              ))}
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Pengiriman</span>
              <strong>{money(store.shippingFee)}</strong>
            </div>
            <div className="summary-line total">
              <strong>Total</strong>
              <strong>{money(subtotal + store.shippingFee)}</strong>
            </div>
            {invalid && (
              <FormError message="Ada produk yang tidak tersedia atau jumlah melebihi stok. Perbarui keranjang sebelum melanjutkan." />
            )}
            <FormError message={error} />
            {checkout ? (
              <Button className="shop-btn" type="submit" disabled={busy || invalid}>
                {busy ? 'Membuat pesanan...' : 'Buat pesanan'}
                <ArrowRight />
              </Button>
            ) : (
              <Link
                className={`btn shop-btn ${invalid ? 'disabled-link' : ''}`}
                to={invalid ? '#' : `${path}/checkout`}
              >
                Lanjut checkout <ArrowRight />
              </Link>
            )}
            <small>
              <ShieldCheck size={16} />
              Detail pembayaran ditampilkan setelah pesanan dibuat.
            </small>
          </aside>
        </form>
      )}
    </section>
  );
}
function Tracking({ slug }: { slug: string }) {
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(params.get('code') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast, run } = useApp();
  useEffect(() => {
    const c = params.get('code'),
      t = params.get('token');
    if (!c || !t) return;
    let alive = true;
    const load = () =>
      repository
        .track(c, t)
        .then((o) => {
          if (!alive) return;
          setOrder(o);
          setError(o ? '' : 'Pesanan tidak ditemukan. Periksa nomor dan kode akses.');
        })
        .catch((e) => {
          if (alive) setError(errorText(e));
        });
    void load();
    const interval = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [params]);
  return (
    <section className="tracking-page">
      {order ? (
        <>
          <span className="tracking-icon">
            {order.payment === 'lunas' ? <CheckCircle size={42} /> : <Clock size={42} />}
          </span>
          <h1>
            {order.payment === 'lunas'
              ? 'Terima kasih sudah berbelanja.'
              : order.payment === 'gagal'
                ? 'Pesanan dibatalkan'
                : 'Pesananmu sudah kami terima.'}
          </h1>
          <p>
            {order.code} · {date(order.createdAt)}
          </p>
          <div className="tracking-card">
            <div className="flex-between">
              <h2>Status pesanan</h2>
              <Badge status={order.status} />
            </div>
            <div className="summary-line">
              <span>Pembayaran</span>
              <Badge status={order.payment} />
            </div>
            <div className="summary-line total">
              <span>Total</span>
              <strong>{money(order.total)}</strong>
            </div>
            {order.payment === 'menunggu' && (
              <div className="payment-instructions">
                {isDemo ? (
                  <>
                    <div className="info-box">
                      Mode demo. Simulasi berikut memperbarui status pesanan dan saldo lokal tanpa
                      transaksi sungguhan.
                    </div>
                    <Button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await run(
                            { type: 'pay-order', id: order.id, outcome: 'lunas' },
                            'Simulasi pembayaran berhasil.',
                          );
                          setOrder(await repository.track(order.code, order.token));
                        } catch (e) {
                          toast(errorText(e), true);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Simulasikan pembayaran berhasil
                    </Button>
                  </>
                ) : order.method === 'transfer' && order.paymentInstructions ? (
                  <div className="form-stack">
                    <strong>Transfer ke rekening penerimaan platform</strong>
                    <p>
                      {order.paymentInstructions.bank}
                      <br />
                      <strong>{order.paymentInstructions.number}</strong>
                      <br />
                      a.n. {order.paymentInstructions.name}
                    </p>
                    <p>
                      Transfer tepat {money(order.total)} dan cantumkan {order.code} pada berita
                      transfer. Batas pembayaran 24 jam sejak pesanan dibuat. Status berubah setelah
                      mutasi bank diperiksa pengelola.
                    </p>
                  </div>
                ) : order.paymentUrl && /^https:\/\//.test(order.paymentUrl) ? (
                  <a
                    className="btn shop-btn"
                    href={order.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Lanjutkan pembayaran <ArrowRight />
                  </a>
                ) : (
                  <p>
                    Tautan pembayaran belum tersedia. Hubungi toko dengan nomor pesanan ini. Jangan
                    melakukan transfer di luar halaman pembayaran.
                  </p>
                )}
              </div>
            )}
            {order.tracking && (
              <div className="info-box">
                <Truck />
                {order.courier} · Resi {order.tracking}
              </div>
            )}
            <ol className="timeline">
              {[...order.events].reverse().map((e, i) => (
                <li key={i}>
                  <span />
                  <div>
                    <strong>{e.text}</strong>
                    <small>{date(e.at, true)}</small>
                  </div>
                </li>
              ))}
            </ol>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast('Link pelacakan disalin. Simpan link ini untuk melihat status.');
                } catch {
                  toast('Salin alamat halaman ini untuk menyimpan link pelacakan.');
                }
              }}
            >
              <Copy />
              Salin link pelacakan
            </Button>
            <p className="muted">
              Simpan link ini. Kode akses bersifat privat dan digunakan untuk melihat pesananmu.
            </p>
          </div>
          <Link to={`/toko/${slug}/katalog`} className="text-link">
            Kembali belanja <ArrowRight />
          </Link>
        </>
      ) : (
        <>
          <h1>Lacak pesananmu</h1>
          <p>Gunakan nomor pesanan dan kode akses dari halaman konfirmasi.</p>
          <form
            className="form-stack tracking-card"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ code, token });
            }}
          >
            <Field label="Nomor pesanan">
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="KIO-..."
              />
            </Field>
            <Field label="Kode akses">
              <Input
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Kode privat dari link pesanan"
              />
            </Field>
            <FormError message={error} />
            <Button type="submit" className="shop-btn">
              Lacak pesanan <ArrowRight />
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
