import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  Storefront,
  ArrowUpRight,
  PaintBrush,
  Check,
  CheckCircle,
  Globe,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { plans } from '../lib/types';
import { repository } from '../lib/repository';
import { slugSchema } from '../lib/domain';
import { money, revenueOf, errorText, safeImage, storefrontUrl } from '../lib/utils';
import {
  PageHeading,
  Panel,
  Badge,
  Button,
  Field,
  Input,
  Select,
  FormError,
} from '../components/ui';
export const themes = [
  {
    id: 'natural',
    name: 'Natural',
    color: '#176348',
    description: 'Bersih, tenang, dan serbaguna.',
  },
  {
    id: 'warm',
    name: 'Hangat',
    color: '#956a46',
    description: 'Karakter hangat untuk cerita lokal.',
  },
  {
    id: 'bold',
    name: 'Studio',
    color: '#272b37',
    description: 'Tegas dan minimal untuk brand modern.',
  },
];
export default function Stores() {
  const { data: d, setActiveStore } = useApp();
  if (!d) return null;
  const plan = plans.find((p) => p.id === d.account.tier)!;
  return (
    <>
      <PageHeading
        title="Toko saya"
        description="Brand boleh berbeda. Kelolanya tetap dari satu tempat."
        action={
          <Link className="btn btn-primary" to="/app/toko/baru">
            <Plus />
            Tambah toko
          </Link>
        }
      />
      <div className="info-banner">
        <ShieldCheck size={22} />
        <span>
          Satu verifikasi untuk semua tokomu. Kamu memakai{' '}
          <strong>
            {d.stores.filter((s) => s.status !== 'nonaktif').length} dari {plan.quota} kuota toko
          </strong>{' '}
          di paket {plan.name}.
        </span>
        <Link to="/app/langganan">
          Lihat paket <ArrowRight size={15} />
        </Link>
      </div>
      <div className="stores-grid">
        {d.stores.map((store) => (
          <Panel className="store-card" key={store.id}>
            <div className="store-cover" style={{ backgroundColor: store.draft.color }}>
              <img
                src={safeImage(store.draft.sections.find((s) => s.type === 'hero')?.image || '')}
                alt=""
              />
              <span className="store-cover-name">{store.name}</span>
              <Badge status={store.status} />
            </div>
            <div className="store-card-body">
              <div className="flex-between">
                <h2>{store.name}</h2>
                <span className="store-avatar">
                  <Storefront size={22} />
                </span>
              </div>
              <a
                href={storefrontUrl(store)}
                className="store-domain"
                target="_blank"
                rel="noopener noreferrer"
              >
                {store.publicUrl
                  ? new URL(storefrontUrl(store), window.location.origin).host
                  : `Lihat toko / ${store.slug}`}{' '}
                <ArrowUpRight size={14} />
              </a>
              <div className="store-card-metrics">
                <div>
                  <small>Produk aktif</small>
                  <strong>
                    {d.products.filter((p) => p.storeId === store.id && p.active).length}
                  </strong>
                </div>
                <div>
                  <small>Total pendapatan</small>
                  <strong>
                    {money(revenueOf(d.orders.filter((o) => o.storeId === store.id)))}
                  </strong>
                </div>
              </div>
              <div className="store-card-actions">
                <Link
                  className="btn btn-primary"
                  to="/app"
                  onClick={() => setActiveStore(store.id)}
                >
                  Kelola toko <ArrowRight />
                </Link>
                <Link
                  className="btn btn-secondary"
                  to="/app/editor"
                  onClick={() => setActiveStore(store.id)}
                  aria-label={`Edit tampilan ${store.name}`}
                >
                  <PaintBrush />
                </Link>
              </div>
              {store.status === 'nonaktif' && (
                <p className="form-error">
                  Toko nonaktif karena kuota paket. Upgrade untuk mengaktifkan kembali.
                </p>
              )}
            </div>
          </Panel>
        ))}
        <Link to="/app/toko/baru" className="new-store-card">
          <span>
            <Plus size={30} />
          </span>
          <h3>Usaha baru, peluang baru</h3>
          <p>
            Tambah toko tanpa daftar atau
            <br />
            verifikasi dari awal.
          </p>
          <strong>
            Tambah toko <ArrowRight size={17} />
          </strong>
        </Link>
      </div>
    </>
  );
}
export function NewStore() {
  const { data: d, run, setActiveStore } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Fashion & aksesori');
  const [theme, setTheme] = useState('natural');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAvailable(null);
    if (!slugSchema.safeParse(slug).success) return;
    let valid = true;
    const timer = setTimeout(() => {
      repository
        .slugAvailable(slug)
        .then((a) => {
          if (valid) setAvailable(a);
        })
        .catch(() => {
          if (valid) setAvailable(null);
        });
    }, 400);
    return () => {
      valid = false;
      clearTimeout(timer);
    };
  }, [slug]);
  if (!d) return null;
  const plan = plans.find((p) => p.id === d.account.tier)!;
  const full = d.stores.filter((s) => s.status !== 'nonaktif').length >= plan.quota;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      const result = slugSchema.safeParse(slug);
      if (!result.success) {
        setError(result.error.issues[0].message);
        return;
      }
      if (available !== true) {
        setError('Alamat belum tersedia atau masih diperiksa.');
        return;
      }
      setError('');
      setStep(2);
      return;
    }
    setBusy(true);
    try {
      const result = await run(
        { type: 'create-store', name, slug, category, theme },
        'Toko berhasil dibuat. Tambahkan produk pertamamu!',
      );
      const store = result.stores.find((s) => s.slug === slug)!;
      setActiveStore(store.id);
      navigate('/app/editor');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={d.stores.length ? 'Tambah toko baru' : 'Yuk, buat toko pertamamu'}
        description="Mulai langkah kecil untuk peluang yang lebih besar."
      />
      <div className="wizard">
        {full ? (
          <Panel className="quota-panel">
            <span className="empty-icon">
              <Storefront size={36} />
            </span>
            <h2>Bisnismu siap tumbuh lebih besar</h2>
            <p>
              Semua {plan.quota} kuota toko di paket {plan.name} sudah digunakan. Pilih paket
              berikutnya untuk membuka toko baru.
            </p>
            <Link className="btn btn-primary" to="/app/langganan">
              Lihat pilihan paket <ArrowRight />
            </Link>
            <Link to="/app/toko" className="text-link">
              Kembali ke toko saya
            </Link>
          </Panel>
        ) : (
          <>
            <div className="wizard-steps">
              <span className="done">
                <i>{step > 1 ? <Check /> : '1'}</i>Informasi toko
              </span>
              <div />
              <span className={step === 2 ? 'done' : ''}>
                <i>2</i>Pilih tampilan
              </span>
            </div>
            <Panel className="wizard-panel">
              <form onSubmit={submit} className="form-stack">
                {step === 1 ? (
                  <>
                    <div className="wizard-icon">
                      <Storefront size={30} />
                    </div>
                    <h2>Kenalan dengan toko barumu</h2>
                    <p>Setiap toko punya nama, alamat, dan ceritanya sendiri.</p>
                    <Field label="Nama toko">
                      <Input
                        autoFocus
                        required
                        maxLength={80}
                        placeholder="Contoh: Toko Baju Kekinian"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-|-$/g, '')
                              .slice(0, 40),
                          );
                        }}
                      />
                    </Field>
                    <Field
                      label="Alamat tokomu"
                      hint="Minimal 3 karakter, huruf kecil, angka, dan tanda hubung. Alamat lengkap tersedia setelah publish."
                    >
                      <div className="domain-input">
                        <Globe size={18} />
                        <input
                          required
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase())}
                        />
                      </div>
                    </Field>
                    {slug && (
                      <small
                        className={
                          available ? 'text-green' : available === false ? 'text-red' : 'muted'
                        }
                      >
                        {available
                          ? 'Alamat tersedia. Bisa jadi milik tokomu!'
                          : available === false
                            ? 'Wah, nama ini sudah dipakai. Coba yang lain, ya.'
                            : 'Memeriksa alamat...'}
                      </small>
                    )}
                    <Field label="Kategori usaha">
                      <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                        {[
                          'Fashion & aksesori',
                          'Makanan & minuman',
                          'Rumah & gaya hidup',
                          'Kecantikan',
                          'Elektronik',
                          'Lainnya',
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                    {d.stores.length > 0 && (
                      <div className="info-box">
                        <ShieldCheck />
                        Identitas dan rekening akunmu otomatis berlaku untuk toko ini.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <h2>Tampilan yang cocok dengan ceritamu</h2>
                    <p>Kamu bisa mengganti warna, font, dan susunan bagian kapan saja.</p>
                    <div className="theme-choices">
                      {themes.map((t) => (
                        <button
                          type="button"
                          className={`theme-choice ${theme === t.id ? 'selected' : ''}`}
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                        >
                          <div
                            className="theme-thumbnail"
                            style={{ '--theme': t.color } as React.CSSProperties}
                          >
                            <div />
                            <span />
                            <section>
                              <i />
                              <i />
                              <i />
                            </section>
                          </div>
                          <strong>
                            {t.name}
                            {theme === t.id && <CheckCircle size={19} weight="fill" />}
                          </strong>
                          <small>{t.description}</small>
                        </button>
                      ))}
                    </div>
                    <div className="info-box">
                      {name} akan dibuat sebagai draft. Tambahkan produk, lalu publish untuk mulai
                      menerima pesanan.
                    </div>
                  </>
                )}
                <FormError message={error} />
                <div className="modal-actions">
                  {step === 2 && (
                    <Button variant="secondary" onClick={() => setStep(1)}>
                      Kembali
                    </Button>
                  )}
                  <Button type="submit" disabled={busy || (step === 1 && available !== true)}>
                    {busy ? 'Membuat toko...' : step === 1 ? 'Lanjutkan' : 'Buat toko'}
                    <ArrowRight size={18} />
                  </Button>
                </div>
              </form>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
