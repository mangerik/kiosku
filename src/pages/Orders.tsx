import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DownloadSimple,
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle,
  ShoppingBag,
  MapPin,
  CreditCard,
} from '@phosphor-icons/react';
import Papa from 'papaparse';
import { useApp } from '../lib/context';
import { isDemo } from '../lib/repository';
import type { OrderStatus } from '../lib/types';
import { date, downloadText, money, orderLabels, safeImage, errorText } from '../lib/utils';
import {
  PageHeading,
  Panel,
  PanelHeading,
  Badge,
  Search,
  Button,
  Empty,
  Pagination,
  Input,
  Field,
  Modal,
  FormError,
} from '../components/ui';
export default function Orders() {
  const { data: d, activeStore } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  if (!d) return null;
  const scoped = d.orders.filter((o) => activeStore === 'all' || activeStore === o.storeId);
  const orders = scoped.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      `${o.code} ${o.customer.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(orders.length / 8)));
  return (
    <>
      <PageHeading
        title="Pesanan"
        description="Setiap pesanan adalah awal hubungan yang baik."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              downloadText(
                'pesanan-kiosku.csv',
                '\uFEFF' +
                  Papa.unparse(
                    orders.map((o) => ({
                      nomor: o.code,
                      tanggal: o.createdAt,
                      pelanggan: o.customer.name,
                      toko: d.stores.find((s) => s.id === o.storeId)?.name,
                      total: o.total,
                      status: o.status,
                      pembayaran: o.payment,
                    })),
                    { escapeFormulae: true },
                  ),
              )
            }
          >
            <DownloadSimple />
            Ekspor pesanan
          </Button>
        }
      />
      <Panel>
        <div className="tabs overflow-tabs">
          {['all', 'baru', 'diproses', 'dikirim', 'selesai', 'batal'].map((id) => (
            <button
              key={id}
              className={id === status ? 'selected' : ''}
              onClick={() => {
                setStatus(id);
                setPage(1);
              }}
            >
              {id === 'all' ? 'Semua pesanan' : orderLabels[id]}
              <span>{scoped.filter((o) => id === 'all' || o.status === id).length}</span>
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
            placeholder="Cari nomor pesanan atau pelanggan..."
          />
          <span className="muted">{orders.length} pesanan</span>
        </div>
        {orders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No. pesanan</th>
                  <th>Pelanggan</th>
                  <th>Toko</th>
                  <th>Total</th>
                  <th>Pembayaran</th>
                  <th>Status pesanan</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.slice((currentPage - 1) * 8, currentPage * 8).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link className="order-code" to={`/app/pesanan/${o.id}`}>
                        {o.code}
                      </Link>
                      <small>{date(o.createdAt, true)}</small>
                    </td>
                    <td>
                      <strong>{o.customer.name}</strong>
                      <small>{o.customer.city}</small>
                    </td>
                    <td>{d.stores.find((s) => s.id === o.storeId)?.name}</td>
                    <td>
                      <strong>{money(o.total)}</strong>
                      <small>{o.items.reduce((s, i) => s + i.quantity, 0)} produk</small>
                    </td>
                    <td>
                      <Badge status={o.payment} />
                    </td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td>
                      <Link className="text-link" to={`/app/pesanan/${o.id}`}>
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Belum ada pesanan di sini"
            description="Pesanan yang cocok dengan filter akan muncul di sini."
          />
        )}
        <Pagination page={currentPage} total={orders.length} onChange={setPage} />
      </Panel>
    </>
  );
}
export function OrderDetail() {
  const { id } = useParams();
  const { data: d, run } = useApp();
  const o = d?.orders.find((o) => o.id === id);
  const [tracking, setTracking] = useState(o?.tracking || '');
  const [courier, setCourier] = useState(o?.courier || 'JNE');
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [printMode, setPrintMode] = useState<'invoice' | 'label'>('invoice');
  if (!d || !o)
    return (
      <Empty
        title="Pesanan tidak ditemukan"
        action={<Link to="/app/pesanan">Kembali ke pesanan</Link>}
      />
    );
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    baru: 'diproses',
    diproses: 'dikirim',
    dikirim: 'selesai',
  };
  const store = d.stores.find((s) => s.id === o.storeId)!;
  function print(mode: 'invoice' | 'label') {
    setPrintMode(mode);
    requestAnimationFrame(() => window.print());
  }
  return (
    <>
      <Link className="back-link no-print" to="/app/pesanan">
        <ArrowLeft />
        Semua pesanan
      </Link>
      <PageHeading
        title={o.code}
        description={`${date(o.createdAt, true)} · ${store.name}`}
        action={
          <>
            <Button variant="secondary" onClick={() => print('label')}>
              <Truck />
              Label pengiriman
            </Button>
            <Button variant="secondary" onClick={() => print('invoice')}>
              <Printer />
              Cetak invoice / PDF
            </Button>
          </>
        }
      />
      <div className="detail-grid no-print">
        <div className="form-stack">
          <Panel>
            <PanelHeading title="Rincian pesanan" action={<Badge status={o.status} />} />
            <div className="order-items">
              {o.items.map((i) => (
                <div className="order-item" key={i.variantId}>
                  <img src={safeImage(i.image)} alt="" />
                  <div className="grow">
                    <strong>{i.name}</strong>
                    <small>
                      {i.variant} · {i.quantity} × {money(i.price)}
                    </small>
                  </div>
                  <strong>{money(i.quantity * i.price)}</strong>
                </div>
              ))}
              <div className="summary-line">
                <span>Subtotal</span>
                <span>{money(o.total - o.shippingFee)}</span>
              </div>
              <div className="summary-line">
                <span>Ongkos kirim</span>
                <span>{money(o.shippingFee)}</span>
              </div>
              <div className="summary-line total">
                <strong>Total pembayaran</strong>
                <strong>{money(o.total)}</strong>
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeading title="Aktivitas pesanan" />
            <ol className="timeline">
              {[...o.events].reverse().map((event, i) => (
                <li key={`${event.at}-${i}`}>
                  <span />
                  <div>
                    <strong>{event.text}</strong>
                    <small>{date(event.at, true)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="form-stack">
          <Panel className="padded">
            <h3>
              <CreditCard />
              Pembayaran
            </h3>
            <Badge status={o.payment} />
            <p>{o.method === 'qris' ? 'QRIS' : 'Transfer bank'}</p>
            {o.payment === 'menunggu' && (
              <>
                {isDemo && (
                  <div className="info-box">
                    Simulasi demo: tombol ini tidak memindahkan uang sungguhan.
                  </div>
                )}
                <Button
                  disabled={busy || !isDemo}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await run(
                        { type: 'pay-order', id: o.id, outcome: 'lunas' },
                        'Pembayaran terkonfirmasi. Saldo akun diperbarui.',
                      );
                    } catch {
                      /* toast */
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <CheckCircle />
                  {isDemo
                    ? 'Simulasikan pembayaran'
                    : o.method === 'transfer'
                      ? 'Menunggu pemeriksaan transfer'
                      : 'Menunggu konfirmasi gateway'}
                </Button>
              </>
            )}
          </Panel>
          <Panel className="padded">
            <h3>
              <MapPin />
              Pelanggan & pengiriman
            </h3>
            <strong>{o.customer.name}</strong>
            <p>
              {o.customer.address}
              <br />
              {o.customer.city} {o.customer.postalCode}
            </p>
            <p>
              {o.customer.phone}
              <br />
              {o.customer.email}
            </p>
            {o.customer.note && <div className="info-box">Catatan: {o.customer.note}</div>}
            {o.tracking && (
              <p>
                <strong>{o.courier}</strong>
                <br />
                Resi: {o.tracking}
              </p>
            )}
          </Panel>
          <Panel className="padded">
            <h3>
              <ShoppingBag />
              Tindak lanjut
            </h3>
            {next[o.status] && (
              <Button disabled={o.payment !== 'lunas'} onClick={() => setConfirm(next[o.status]!)}>
                {o.status === 'baru'
                  ? 'Proses pesanan'
                  : o.status === 'diproses'
                    ? 'Kirim pesanan'
                    : 'Selesaikan pesanan'}
              </Button>
            )}
            {(isDemo || o.method === 'transfer') &&
              o.status === 'baru' &&
              o.payment !== 'lunas' && (
                <Button variant="danger" onClick={() => setConfirm('batal')}>
                  Batalkan pesanan
                </Button>
              )}
            {['selesai', 'batal'].includes(o.status) && (
              <p>Pesanan ini sudah {orderLabels[o.status].toLowerCase()}.</p>
            )}
            <Link
              to={`/toko/${store.slug}/lacak?code=${o.code}&token=${o.token}`}
              target="_blank"
              className="text-link"
            >
              Lihat pelacakan pelanggan →
            </Link>
          </Panel>
        </div>
      </div>
      {confirm && (
        <Modal
          title={confirm === 'batal' ? 'Batalkan pesanan?' : `${orderLabels[confirm]} pesanan`}
          onClose={() => setConfirm(null)}
        >
          <div className="form-stack">
            <p>
              {confirm === 'batal'
                ? 'Stok produk akan dikembalikan. Pesanan yang sudah dibatalkan tidak dapat diproses lagi.'
                : `Ubah status ${o.code} menjadi ${orderLabels[confirm].toLowerCase()}?`}
            </p>
            {confirm === 'dikirim' && (
              <>
                <Field label="Kurir">
                  <Input required value={courier} onChange={(e) => setCourier(e.target.value)} />
                </Field>
                <Field label="Nomor resi">
                  <Input required value={tracking} onChange={(e) => setTracking(e.target.value)} />
                </Field>
              </>
            )}
            <FormError message={error} />
            <Button
              disabled={busy}
              variant={confirm === 'batal' ? 'danger' : 'primary'}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await run(
                    { type: 'update-order', id: o.id, status: confirm, tracking, courier },
                    'Status pesanan diperbarui.',
                  );
                  setConfirm(null);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Konfirmasi
            </Button>
          </div>
        </Modal>
      )}
      <div className={`print-document ${printMode}`}>
        <h1>{printMode === 'invoice' ? 'INVOICE' : 'LABEL PENGIRIMAN'}</h1>
        <h2>{store.name}</h2>
        <p>
          {o.code} · {date(o.createdAt)}
        </p>
        <hr />
        <h3>Penerima: {o.customer.name}</h3>
        <p>
          {o.customer.address}
          <br />
          {o.customer.city} {o.customer.postalCode}
          <br />
          {o.customer.phone}
        </p>
        {printMode === 'invoice' ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Jumlah</th>
                  <th>Harga</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.variantId}>
                    <td>
                      {i.name} — {i.variant}
                    </td>
                    <td>{i.quantity}</td>
                    <td>{money(i.price)}</td>
                    <td>{money(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Ongkos kirim: {money(o.shippingFee)}</p>
            <h2>Total: {money(o.total)}</h2>
            <p>Pembayaran: {orderLabels[o.payment]}</p>
          </>
        ) : (
          <>
            <h2>{o.courier || 'Kurir belum ditentukan'}</h2>
            <p>Resi: {o.tracking || 'Belum tersedia'}</p>
            <p>Pengirim: {store.name}</p>
            <p>{o.items.reduce((s, i) => s + i.quantity, 0)} barang</p>
          </>
        )}
        <p>Terima kasih telah berbelanja.</p>
      </div>
    </>
  );
}
