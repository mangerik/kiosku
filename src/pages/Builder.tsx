import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  Image,
  SquaresFour,
  TextT,
  Quotes,
  Plus,
  DotsSixVertical,
  Trash,
  Desktop,
  DeviceMobile,
  Eye,
  CheckCircle,
  UploadSimple,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { repository } from '../lib/repository';
import type { Layout, Store, Section } from '../lib/types';
import { uid, errorText, safeImage, date, storefrontUrl } from '../lib/utils';
import {
  PageHeading,
  Button,
  Panel,
  Field,
  Input,
  Textarea,
  Select,
  Empty,
  Modal,
} from '../components/ui';
import { SectionView } from '../components/StoreRenderer';
import { themes } from './Stores';
const blocks = [
  { type: 'hero', title: 'Banner utama', icon: Image },
  { type: 'products', title: 'Produk unggulan', icon: SquaresFour },
  { type: 'text', title: 'Teks & cerita', icon: TextT },
  { type: 'testimonial', title: 'Testimoni', icon: Quotes },
] as const;
export default function Builder() {
  const { data, activeStore } = useApp();
  const store = data?.stores.find((s) => s.id === activeStore) || data?.stores[0];
  if (!store)
    return (
      <>
        <PageHeading
          title="Tampilan toko"
          description="Bangun etalase yang menceritakan brand-mu."
        />
        <Panel>
          <Empty
            title="Buat toko lebih dulu"
            action={
              <Link to="/app/toko/baru" className="btn btn-primary">
                Buat toko
              </Link>
            }
          />
        </Panel>
      </>
    );
  return <Editor key={store.id} store={store} />;
}
function Editor({ store }: { store: Store }) {
  const { data, run, toast, refresh } = useApp();
  const [layout, setLayout] = useState<Layout>(structuredClone(store.draft));
  const [selected, setSelected] = useState<string | undefined>(layout.sections[0]?.id);
  const [mode, setMode] = useState('desktop');
  const [panel, setPanel] = useState('blocks');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const layoutRef = useRef(layout);
  const dirtyRef = useRef(false);
  const products = data!.products.filter((p) => p.storeId === store.id && p.active);
  const section = layout.sections.find((s) => s.id === selected);
  function change(l: Layout) {
    layoutRef.current = l;
    dirtyRef.current = true;
    setLayout(l);
    setDirty(true);
  }
  function save(l: Layout) {
    setSaving(true);
    chain.current = chain.current
      .catch(() => {})
      .then(() => run({ type: 'save-layout', storeId: store.id, layout: l }, ''))
      .then(() => {
        if (layoutRef.current === l) {
          dirtyRef.current = false;
          setDirty(false);
        }
      })
      .finally(() => setSaving(false));
    return chain.current;
  }
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      void save(layout).catch(() => {});
    }, 900);
    return () => clearTimeout(timer);
  }, [layout, dirty]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(
    () => () => {
      if (dirtyRef.current) {
        const pending = structuredClone(layoutRef.current);
        void chain.current
          .catch(() => {})
          .then(() =>
            repository.command({ type: 'save-layout', storeId: store.id, layout: pending }),
          )
          .catch((e) => toast(errorText(e), true));
      }
    },
    [store.id],
  );
  function move(id: string, index: number) {
    const items = [...layout.sections];
    const previous = items.findIndex((s) => s.id === id);
    if (previous < 0) return;
    const [s] = items.splice(previous, 1);
    items.splice(Math.max(0, Math.min(index, items.length)), 0, s);
    change({ ...layout, sections: items });
  }
  function add(type: Section['type'], index = layout.sections.length) {
    if (layout.sections.length >= 20) {
      toast('Maksimal 20 bagian.', true);
      return;
    }
    const section: Section = {
      id: uid(),
      type,
      title: blocks.find((b) => b.type === type)!.title,
      text: '',
      image: type === 'hero' ? '/images/hero.jpg' : '',
    };
    const items = [...layout.sections];
    items.splice(index, 0, section);
    change({ ...layout, sections: items });
    setSelected(section.id);
  }
  function edit(patch: Partial<Section>) {
    change({
      ...layout,
      sections: layout.sections.map((s) => (s.id === selected ? { ...s, ...patch } : s)),
    });
  }
  async function publish() {
    setBusy(true);
    try {
      await save(layout);
      await run(
        { type: 'publish', storeId: store.id },
        `Selamat! ${store.name} sudah dipublikasikan.`,
      );
    } catch {
      /* surfaced by run */
    } finally {
      await refresh();
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Tampilan toko"
        description={`Berikan sentuhan brand-mu pada ${store.name}.`}
        action={
          <>
            <span className="save-status">
              <CheckCircle size={16} />
              {saving ? 'Menyimpan...' : dirty ? 'Belum tersimpan' : 'Draft tersimpan'}
            </span>
            <Button variant="secondary" onClick={() => setHistory(true)} aria-label="Riwayat versi">
              <ClockCounterClockwise />
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await save(layout);
                  window.open(`/toko/${store.slug}?preview=1`, '_blank', 'noopener,noreferrer');
                } catch {
                  /* surfaced */
                }
              }}
            >
              <Eye />
              Preview
            </Button>
            <Button disabled={busy || store.status === 'nonaktif'} onClick={() => void publish()}>
              <UploadSimple />
              {busy ? 'Memublikasikan...' : 'Publish toko'}
            </Button>
          </>
        }
      />
      {(store.publicUrl || store.deployment) && (
        <div className="info-banner">
          <span>
            {store.deployment?.state === 'ready'
              ? 'Toko sudah online.'
              : store.deployment?.error || 'Alamat toko sedang disiapkan.'}
          </span>
          {store.publicUrl && (
            <a href={storefrontUrl(store)} target="_blank" rel="noopener noreferrer">
              Buka toko
            </a>
          )}
          {store.deployment?.state !== 'ready' && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await repository.publishStatus(store.id);
                  if (result.state === 'ready') toast('Toko sudah online.');
                  else toast('Netlify masih menyiapkan toko. Cek lagi sebentar.');
                } catch (e) {
                  toast(errorText(e), true);
                } finally {
                  await refresh();
                  setBusy(false);
                }
              }}
            >
              Cek status publish
            </Button>
          )}
        </div>
      )}
      {!products.length && (
        <div className="info-banner">
          Tambahkan minimal satu produk agar toko siap dipublikasikan.
          <Link to="/app/produk?new=1">
            Tambah produk <Plus />
          </Link>
        </div>
      )}
      <div className="builder">
        <aside className="builder-library">
          <div className="tabs compact">
            <button
              className={panel === 'blocks' ? 'selected' : ''}
              onClick={() => setPanel('blocks')}
            >
              Bagian
            </button>
            <button
              className={panel === 'theme' ? 'selected' : ''}
              onClick={() => setPanel('theme')}
            >
              Tema
            </button>
          </div>
          {panel === 'blocks' ? (
            <>
              <h3>Bangun ceritamu</h3>
              <p className="muted">Seret atau klik untuk menambah bagian.</p>
              {blocks.map((b) => (
                <button
                  className="block-type"
                  key={b.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', `new:${b.type}`);
                  }}
                  onClick={() => add(b.type)}
                >
                  <b.icon size={22} />
                  <span>{b.title}</span>
                  <Plus size={15} />
                </button>
              ))}
              <div className="builder-tip">
                Urutkan bagian dengan menyeret atau memakai tombol panah. Perubahan draft tersimpan
                otomatis.
              </div>
            </>
          ) : (
            <div className="form-stack">
              <h3>Identitas toko</h3>
              <Field label="Tema">
                <Select
                  value={layout.theme}
                  onChange={(e) => {
                    const t = themes.find((t) => t.id === e.target.value)!;
                    change({ ...layout, theme: t.id, color: t.color });
                  }}
                >
                  {themes.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Warna brand">
                <Input
                  type="color"
                  value={layout.color}
                  onChange={(e) => change({ ...layout, color: e.target.value })}
                />
              </Field>
              <Field label="Font">
                <Select
                  value={layout.font}
                  onChange={(e) => change({ ...layout, font: e.target.value })}
                >
                  <option value="jakarta">Plus Jakarta Sans</option>
                  <option value="system">System Sans</option>
                </Select>
              </Field>
              <Field label="Logo toko">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      change({ ...layout, logo: await repository.upload(file, 'products') });
                    } catch (e) {
                      toast(errorText(e), true);
                    }
                  }}
                />
              </Field>
              {layout.logo && (
                <img className="logo-preview" src={safeImage(layout.logo)} alt="Logo toko" />
              )}
            </div>
          )}
        </aside>
        <div className="builder-stage">
          <div className="builder-stage-toolbar">
            <span>
              <span className="browser-dots">● ● ●</span>
              {store.publicUrl
                ? new URL(storefrontUrl(store), window.location.origin).host
                : `Preview / ${store.slug}`}
            </span>
            <div className="segmented">
              <button
                className={mode === 'desktop' ? 'selected' : ''}
                aria-label="Preview desktop"
                onClick={() => setMode('desktop')}
              >
                <Desktop size={18} />
              </button>
              <button
                className={mode === 'mobile' ? 'selected' : ''}
                aria-label="Preview mobile"
                onClick={() => setMode('mobile')}
              >
                <DeviceMobile size={18} />
              </button>
            </div>
          </div>
          <div
            className={`builder-canvas ${mode === 'mobile' ? 'mobile' : ''} font-${layout.font}`}
            style={{ '--shop-color': layout.color } as React.CSSProperties}
          >
            <div className="builder-shop-nav">
              {layout.logo && <img src={safeImage(layout.logo)} alt="" />}
              <strong>{store.name}</strong>
              <span>Koleksi &nbsp; Tentang kami</span>
            </div>
            {layout.sections.map((s, i) => (
              <div
                key={s.id}
                className={`builder-section ${selected === s.id ? 'selected' : ''}`}
                onClick={() => setSelected(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const value = e.dataTransfer.getData('text/plain');
                  if (value.startsWith('new:')) add(value.slice(4) as Section['type'], i);
                  else move(value, i);
                }}
              >
                <div className="section-controls">
                  <button
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', s.id)}
                    aria-label={`Seret ${s.title}`}
                  >
                    <DotsSixVertical />
                  </button>
                  <span>{blocks.find((b) => b.type === s.type)?.title}</span>
                  <button
                    disabled={i === 0}
                    aria-label={`Naikkan ${s.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      move(s.id, i - 1);
                    }}
                  >
                    <ArrowUp />
                  </button>
                  <button
                    disabled={i === layout.sections.length - 1}
                    aria-label={`Turunkan ${s.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      move(s.id, i + 1);
                    }}
                  >
                    <ArrowDown />
                  </button>
                </div>
                <SectionView section={s} store={store} products={products} preview />
              </div>
            ))}
            <button
              className="drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const value = e.dataTransfer.getData('text/plain');
                if (value.startsWith('new:')) add(value.slice(4) as Section['type']);
                else move(value, layout.sections.length - 1);
              }}
              onClick={() => add('text')}
            >
              <Plus />
              Tambahkan bagian
            </button>
          </div>
        </div>
        <aside className="builder-properties">
          <h3>Pengaturan bagian</h3>
          <p className="muted">Pilih bagian untuk mengedit konten.</p>
          {section && (
            <div className="form-stack">
              <span className="property-label">
                {blocks.find((b) => b.type === section.type)?.title}
              </span>
              <Field label="Judul">
                <Input
                  value={section.title}
                  maxLength={180}
                  onChange={(e) => edit({ title: e.target.value })}
                />
              </Field>
              <Field label={section.type === 'testimonial' ? 'Kutipan pelanggan' : 'Deskripsi'}>
                <Textarea
                  value={section.text}
                  maxLength={3000}
                  onChange={(e) => edit({ text: e.target.value })}
                />
              </Field>
              {section.type === 'hero' && (
                <>
                  <img className="banner-preview" src={safeImage(section.image)} alt="Banner" />
                  <Field label="Ganti gambar">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          edit({ image: await repository.upload(file, 'products') });
                        } catch (e) {
                          toast(errorText(e), true);
                        }
                      }}
                    />
                  </Field>
                </>
              )}
              {section.type === 'products' && (
                <small className="muted">Menampilkan 4 produk aktif pertama dari toko ini.</small>
              )}
              <Button
                variant="danger"
                disabled={layout.sections.length <= 1}
                onClick={() => {
                  change({ ...layout, sections: layout.sections.filter((s) => s.id !== selected) });
                  setSelected(layout.sections.find((s) => s.id !== selected)?.id);
                }}
              >
                <Trash />
                Hapus bagian
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => void save(layout).catch(() => {})}
              >
                Simpan sebagai draft
              </Button>
            </div>
          )}
        </aside>
      </div>
      {history && (
        <Modal title="Riwayat publikasi" onClose={() => setHistory(false)}>
          {store.versions.length ? (
            <div className="version-list">
              {store.versions.map((v, i) => (
                <div key={v.at}>
                  <div>
                    <strong>Versi {store.versions.length - i}</strong>
                    <small>{date(v.at, true)}</small>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      change(structuredClone(v.layout));
                      setSelected(v.layout.sections[0]?.id);
                      setHistory(false);
                      toast('Versi dipulihkan ke draft. Publish untuk menayangkan.');
                    }}
                  >
                    Pulihkan draft
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p>Belum ada publikasi. Riwayat tersimpan setiap kali publish.</p>
          )}
        </Modal>
      )}
    </>
  );
}
