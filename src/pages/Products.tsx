import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Papa from 'papaparse';
import {
  Plus,
  UploadSimple,
  DownloadSimple,
  PencilSimple,
  Archive,
  Package,
  Warning,
  CheckCircle,
  X,
  Image,
} from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { repository } from '../lib/repository';
import type { Product } from '../lib/types';
import {
  uid,
  now,
  priceOf,
  stockOf,
  money,
  safeImage,
  downloadText,
  errorText,
} from '../lib/utils';
import { validateProduct } from '../lib/domain';
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Search,
  Badge,
  Modal,
  PageHeading,
  Panel,
  Empty,
  Pagination,
  FormError,
} from '../components/ui';

export function ProductForm({
  product,
  storeId,
  onClose,
}: {
  product?: Product;
  storeId: string;
  onClose: () => void;
}) {
  const { data, run, toast } = useApp();
  const [p, setP] = useState<Product>(
    product
      ? structuredClone(product)
      : {
          id: uid(),
          storeId,
          name: '',
          description: '',
          category: '',
          images: [],
          variants: [{ id: uid(), name: 'Reguler', price: 0, stock: 0 }],
          active: true,
          createdAt: now(),
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      validateProduct(p);
      await run(
        { type: 'save-product', product: p },
        product ? 'Produk diperbarui.' : 'Produk berhasil ditambahkan.',
      );
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function images(files: FileList | null) {
    if (!files) return;
    if (files.length + p.images.length > 5) {
      setError('Maksimal 5 foto produk.');
      return;
    }
    setBusy(true);
    try {
      const urls = await Promise.all(
        Array.from(files).map((file) => repository.upload(file, 'products')),
      );
      setP((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (e) {
      toast(errorText(e), true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={product ? 'Edit produk' : 'Tambah produk'} onClose={onClose} wide>
      <form onSubmit={save} className="form-stack">
        <Field label="Toko produk">
          <Select
            disabled={!!product}
            value={p.storeId}
            onChange={(e) => setP({ ...p, storeId: e.target.value })}
          >
            {data?.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="form-grid">
          <div className="form-stack">
            <Field label="Nama produk">
              <Input
                required
                maxLength={140}
                placeholder="Contoh: Everyday Linen Shirt"
                value={p.name}
                onChange={(e) => setP({ ...p, name: e.target.value })}
              />
            </Field>
            <Field label="Kategori / koleksi">
              <Input
                required
                maxLength={80}
                placeholder="Contoh: Atasan"
                value={p.category}
                onChange={(e) => setP({ ...p, category: e.target.value })}
              />
            </Field>
            <Field label="Deskripsi produk">
              <Textarea
                maxLength={3000}
                placeholder="Ceritakan bahan, ukuran, dan keunggulan produkmu..."
                value={p.description}
                onChange={(e) => setP({ ...p, description: e.target.value })}
              />
            </Field>
          </div>
          <div>
            <Field label="Foto produk" hint="JPG, PNG, WebP. Maks. 3 MB/foto, 5 foto.">
              <span className="upload-box">
                <Image size={30} />
                <strong>Unggah foto produk</strong>
                <small>atau klik untuk pilih berkas</small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  aria-label="Unggah foto produk"
                  onChange={(e) => void images(e.target.files)}
                />
              </span>
            </Field>
            <div className="image-previews">
              {p.images.map((src, i) => (
                <div key={src}>
                  <img src={safeImage(src)} alt={`Foto produk ${i + 1}`} />
                  <button
                    type="button"
                    aria-label={`Hapus foto ${i + 1}`}
                    onClick={() => setP({ ...p, images: p.images.filter((_, n) => n !== i) })}
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="section-label">
          <h3>Harga & varian</h3>
          <Button
            variant="ghost"
            onClick={() =>
              setP({
                ...p,
                variants: [
                  ...p.variants,
                  { id: uid(), name: '', price: p.variants[0]?.price || 0, stock: 0 },
                ],
              })
            }
          >
            <Plus />
            Tambah varian
          </Button>
        </div>
        {p.variants.map((v, i) => (
          <div className="variant-row" key={v.id}>
            <Field label="Nama varian">
              <Input
                required
                value={v.name}
                placeholder="Contoh: M / Putih"
                onChange={(e) =>
                  setP({
                    ...p,
                    variants: p.variants.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  })
                }
              />
            </Field>
            <Field label="Harga (Rp)">
              <Input
                type="number"
                required
                min={1}
                step={1}
                value={v.price || ''}
                onChange={(e) =>
                  setP({
                    ...p,
                    variants: p.variants.map((x, j) =>
                      j === i ? { ...x, price: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
            </Field>
            <Field label="Stok">
              <Input
                type="number"
                min={0}
                required
                step={1}
                value={v.stock}
                onChange={(e) =>
                  setP({
                    ...p,
                    variants: p.variants.map((x, j) =>
                      j === i ? { ...x, stock: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
            </Field>
            <Button
              variant="ghost"
              disabled={p.variants.length === 1}
              aria-label={`Hapus varian ${i + 1}`}
              onClick={() => setP({ ...p, variants: p.variants.filter((_, j) => j !== i) })}
            >
              <X />
            </Button>
          </div>
        ))}
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={p.active}
            onChange={(e) => setP({ ...p, active: e.target.checked })}
          />
          Tampilkan produk di toko
        </label>
        <FormError message={error} />
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Menyimpan...' : 'Simpan produk'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function Products() {
  const { data: d, activeStore, run, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState('active');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Product | null>(null);
  const [create, setCreate] = useState(false);
  const [archive, setArchive] = useState<Product | null>(null);
  const [importing, setImporting] = useState(false);
  const [csv, setCsv] = useState<Product[]>([]);
  const [csvError, setCsvError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedStore = activeStore !== 'all' ? activeStore : d?.stores[0]?.id || '';
  const all = useMemo(
    () => d?.products.filter((p) => activeStore === 'all' || p.storeId === activeStore) || [],
    [d, activeStore],
  );
  const filtered = all.filter(
    (p) =>
      (tab === 'active' ? p.active : !p.active) &&
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'all' || category === p.category),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  if (!d) return null;
  function exportCsv(template = false) {
    const rows = template
      ? [
          {
            product_key: 'produk-1',
            name: 'Nama Produk',
            description: 'Deskripsi',
            category: 'Kategori',
            variant: 'Reguler',
            price: 100000,
            stock: 10,
            image: '',
          },
        ]
      : filtered.flatMap((p) =>
          p.variants.map((v) => ({
            product_key: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            variant: v.name,
            price: v.price,
            stock: v.stock,
            image: p.images[0] || '',
          })),
        );
    downloadText(
      template ? 'template-produk-kiosku.csv' : 'produk-kiosku.csv',
      '\uFEFF' + Papa.unparse(rows, { escapeFormulae: true }),
    );
  }
  async function parseCsv(file?: File) {
    if (!file) return;
    setCsvError('');
    setCsv([]);
    try {
      if (file.size > 2e6) throw new Error('CSV maksimal 2 MB.');
      const parsed = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length) throw new Error(`CSV tidak valid: ${parsed.errors[0].message}`);
      if (!parsed.data.length || parsed.data.length > 500)
        throw new Error('CSV harus berisi 1–500 baris.');
      const groups = new Map<string, Product>();
      parsed.data.forEach((r, i) => {
        const group = r.product_key || `${r.name}|${r.category}`;
        const p = groups.get(group) || {
          id: uid(),
          storeId: selectedStore,
          name: r.name || '',
          description: r.description || '',
          category: r.category || '',
          images: r.image && /^https:\/\//.test(r.image) ? [r.image] : [],
          variants: [],
          active: true,
          createdAt: now(),
        };
        p.variants.push({
          id: uid(),
          name: r.variant || 'Reguler',
          price: Number(r.price),
          stock: r.stock?.trim() ? Number(r.stock) : NaN,
        });
        try {
          validateProduct(p);
        } catch (e) {
          throw new Error(`Baris ${i + 2}: ${errorText(e)}`);
        }
        groups.set(group, p);
      });
      setCsv([...groups.values()]);
    } catch (e) {
      setCsvError(errorText(e));
    }
  }
  return (
    <>
      <PageHeading
        title="Produk"
        description="Koleksi terbaikmu, tertata rapi dalam satu tempat."
        action={
          <>
            <Button variant="secondary" onClick={() => exportCsv()}>
              <DownloadSimple size={17} />
              Ekspor
            </Button>
            <Button
              variant="secondary"
              disabled={!selectedStore}
              onClick={() => setImporting(true)}
            >
              <UploadSimple size={17} />
              Impor CSV
            </Button>
            <Button disabled={!selectedStore} onClick={() => setCreate(true)}>
              <Plus size={17} />
              Tambah produk
            </Button>
          </>
        }
      />
      <div className="mini-stats">
        <div>
          <Package />
          <span>
            Total produk<strong>{all.length}</strong>
          </span>
        </div>
        <div>
          <CheckCircle />
          <span>
            Produk aktif<strong>{all.filter((p) => p.active).length}</strong>
          </span>
        </div>
        <div>
          <Warning />
          <span>
            Stok menipis<strong>{all.filter((p) => p.active && stockOf(p) <= 10).length}</strong>
          </span>
        </div>
      </div>
      <Panel>
        <div className="tabs">
          {[
            ['active', 'Produk aktif'],
            ['archived', 'Diarsipkan'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? 'selected' : ''}
              onClick={() => {
                setTab(id);
                setPage(1);
              }}
            >
              {label}
              <span>{all.filter((p) => (id === 'active' ? p.active : !p.active)).length}</span>
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <Search
            value={query}
            onChange={(s) => {
              setQuery(s);
              setPage(1);
            }}
            placeholder="Cari nama produk..."
          />
          <Select
            aria-label="Filter kategori"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Semua kategori</option>
            {[...new Set(all.map((p) => p.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Toko</th>
                  <th>Stok</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((currentPage - 1) * 8, currentPage * 8).map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button className="product-cell" onClick={() => setEdit(p)}>
                        <img src={safeImage(p.images[0] || '')} alt="" />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{p.variants.length} varian</small>
                        </span>
                      </button>
                    </td>
                    <td>{p.category}</td>
                    <td className="muted">{d.stores.find((s) => s.id === p.storeId)?.name}</td>
                    <td>
                      <span className={stockOf(p) <= 10 ? 'stock-low' : ''}>
                        {stockOf(p)} <small>tersedia</small>
                      </span>
                    </td>
                    <td className="font-semibold">{money(priceOf(p))}</td>
                    <td>
                      <Badge status={p.active ? (stockOf(p) ? 'live' : 'batal') : 'nonaktif'}>
                        {p.active ? (stockOf(p) ? 'Aktif' : 'Habis') : 'Diarsipkan'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          aria-label={`Edit ${p.name}`}
                          onClick={() => setEdit(p)}
                        >
                          <PencilSimple size={18} />
                        </button>
                        {p.active && (
                          <button
                            className="icon-btn"
                            aria-label={`Arsipkan ${p.name}`}
                            onClick={() => setArchive(p)}
                          >
                            <Archive size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={query ? 'Produk tidak ditemukan' : 'Belum ada produk'}
            description={
              selectedStore
                ? 'Tambahkan produk pertamamu dan mulai berjualan.'
                : 'Buat toko terlebih dahulu untuk menambah produk.'
            }
            action={
              !selectedStore ? (
                <Link className="btn btn-primary" to="/app/toko/baru">
                  Buat toko
                </Link>
              ) : (
                <Button onClick={() => setCreate(true)}>
                  <Plus />
                  Tambah produk
                </Button>
              )
            }
          />
        )}
        <Pagination page={currentPage} total={filtered.length} onChange={setPage} />
      </Panel>
      {(create || edit || params.get('new') === '1') && selectedStore && (
        <ProductForm
          storeId={selectedStore}
          product={edit || undefined}
          onClose={() => {
            setCreate(false);
            setEdit(null);
            setParams({});
          }}
        />
      )}
      {archive && (
        <Modal title="Arsipkan produk?" onClose={() => setArchive(null)}>
          <p>
            <strong>{archive.name}</strong> akan disembunyikan dari toko. Riwayat pesanan tetap
            tersimpan dan produk bisa diaktifkan kembali melalui Edit.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setArchive(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await run({ type: 'delete-product', id: archive.id }, 'Produk diarsipkan.');
                  setArchive(null);
                } catch {
                  /* toast */
                }
              }}
            >
              Arsipkan produk
            </Button>
          </div>
        </Modal>
      )}
      {importing && (
        <Modal title="Impor produk dari CSV" onClose={() => setImporting(false)}>
          <div className="form-stack">
            <p>
              Produk akan ditambahkan ke{' '}
              <strong>{d.stores.find((s) => s.id === selectedStore)?.name}</strong>. Baris dengan
              product_key sama digabung sebagai varian.
            </p>
            <Button variant="secondary" onClick={() => exportCsv(true)}>
              <DownloadSimple />
              Unduh template CSV
            </Button>
            <Field label="File CSV">
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void parseCsv(e.target.files?.[0])}
              />
            </Field>
            <FormError message={csvError} />
            {csv.length > 0 && (
              <div className="info-box">
                {csv.length} produk / {csv.reduce((s, p) => s + p.variants.length, 0)} varian siap
                diimpor. Produk yang sudah ada tidak ditimpa.
              </div>
            )}
            <Button
              disabled={!csv.length || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await run(
                    { type: 'import-products', products: csv },
                    `${csv.length} produk berhasil diimpor.`,
                  );
                  setImporting(false);
                  setCsv([]);
                } catch (e) {
                  toast(errorText(e), true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Mengimpor...' : 'Impor produk'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
