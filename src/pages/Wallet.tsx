import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Bank,
  Wallet as WalletIcon,
  ShieldCheck,
  DownloadSimple,
} from '@phosphor-icons/react';
import Papa from 'papaparse';
import { useApp } from '../lib/context';
import { isDemo } from '../lib/repository';
import { balanceOf, date, money, downloadText, errorText, uid } from '../lib/utils';
import {
  Button,
  PageHeading,
  Panel,
  PanelHeading,
  Badge,
  Modal,
  Field,
  Input,
  FormError,
  Pagination,
} from '../components/ui';
export default function Wallet() {
  const { data: d, run } = useApp();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [withdraw, setWithdraw] = useState(false);
  const [requestId, setRequestId] = useState(uid);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!d) return null;
  const balance = balanceOf(d.transactions);
  const incoming = d.transactions
    .filter((t) => t.type === 'masuk')
    .reduce((s, t) => s + t.amount, 0);
  const outgoing = d.transactions
    .filter((t) => t.type === 'penarikan')
    .reduce((s, t) => s + t.amount, 0);
  const transactions = d.transactions.filter((t) => filter === 'all' || t.type === filter);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(transactions.length / 8)));
  return (
    <>
      <PageHeading
        title="Saldo & transaksi"
        description="Satu dompet untuk setiap langkah bisnismu."
        action={
          <Button
            onClick={() => {
              setRequestId(uid());
              setError('');
              setWithdraw(true);
            }}
          >
            <ArrowUpRight />
            Tarik dana
          </Button>
        }
      />
      <div className="wallet-grid">
        <Panel className="balance-card">
          <div>
            <WalletIcon size={24} />
            <span>SALDO TERSEDIA</span>
            <ShieldCheck size={20} />
          </div>
          <strong>{money(balance)}</strong>
          <p>Gabungan seluruh toko dalam akunmu.</p>
          <div className="balance-bottom">
            <span>
              <Bank size={17} />
              {d.account.bank
                ? `${d.account.bank} • ${d.account.bankNumber.slice(-4)}`
                : 'Rekening belum ditambahkan'}
            </span>
            <Link to="/app/verifikasi">
              Kelola rekening <ArrowUpRight size={16} />
            </Link>
          </div>
        </Panel>
        <Panel className="wallet-summary">
          <div>
            <span className="transaction-icon">
              <ArrowDownLeft />
            </span>
            <span>
              Total pemasukan<strong>{money(incoming)}</strong>
            </span>
          </div>
          <div>
            <span className="transaction-icon neutral">
              <ArrowUpRight />
            </span>
            <span>
              Total penarikan<strong>{money(outgoing)}</strong>
            </span>
          </div>
        </Panel>
      </div>
      <Panel className="contribution">
        <PanelHeading
          title="Kontribusi per toko"
          description="Total pembayaran masuk dari setiap toko; penarikan tetap dilakukan dari saldo gabungan."
        />
        <div className="contribution-grid">
          {d.stores.map((store, i) => {
            const total = d.transactions
              .filter((t) => t.type === 'masuk' && t.storeId === store.id)
              .reduce((s, t) => s + t.amount, 0);
            return (
              <div key={store.id}>
                <div className="flex-between">
                  <span>
                    <i className={`legend-dot color-${i}`} />
                    {store.name}
                  </span>
                  <strong>{money(total)}</strong>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${incoming ? (total / incoming) * 100 : 0}%` }} />
                </div>
                <small>
                  {incoming ? Math.round((total / incoming) * 100) : 0}% dari total pemasukan
                </small>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel>
        <PanelHeading
          title="Riwayat transaksi"
          action={
            <Button
              variant="ghost"
              onClick={() =>
                downloadText(
                  'transaksi-kiosku.csv',
                  '\uFEFF' +
                    Papa.unparse(
                      transactions.map((t) => ({
                        tanggal: t.createdAt,
                        deskripsi: t.description,
                        toko: d.stores.find((s) => s.id === t.storeId)?.name || 'Gabungan',
                        jenis: t.type,
                        jumlah: t.amount,
                        status: t.status,
                      })),
                      { escapeFormulae: true },
                    ),
                )
              }
            >
              <DownloadSimple />
              Ekspor
            </Button>
          }
        />
        <div className="tabs">
          {[
            ['all', 'Semua transaksi'],
            ['masuk', 'Pemasukan'],
            ['penarikan', 'Penarikan'],
          ].map(([id, title]) => (
            <button
              key={id}
              className={id === filter ? 'selected' : ''}
              onClick={() => {
                setFilter(id);
                setPage(1);
              }}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transaksi</th>
                <th>Toko</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th className="text-right">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice((currentPage - 1) * 8, currentPage * 8).map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="transaction-cell">
                      <span
                        className={`transaction-icon ${t.type === 'penarikan' ? 'neutral' : ''}`}
                      >
                        {t.type === 'masuk' ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </span>
                      <strong>{t.description}</strong>
                    </div>
                  </td>
                  <td>{d.stores.find((s) => s.id === t.storeId)?.name || 'Semua toko'}</td>
                  <td>{date(t.createdAt)}</td>
                  <td>
                    <Badge status={t.status} />
                  </td>
                  <td
                    className={`text-right font-semibold ${t.type === 'masuk' ? 'text-green' : ''}`}
                  >
                    {t.type === 'masuk' ? '+' : '−'}
                    {money(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!transactions.length && <div className="empty">Belum ada transaksi.</div>}
        </div>
        <Pagination page={currentPage} total={transactions.length} onChange={setPage} />
      </Panel>
      {withdraw && (
        <Modal title="Tarik dana" onClose={() => setWithdraw(false)}>
          {d.account.verification !== 'terverifikasi' ? (
            <div className="form-stack">
              <ShieldCheck size={40} />
              <h3>Verifikasi rekening terlebih dahulu</h3>
              <p>Verifikasi cukup sekali dan berlaku untuk seluruh tokomu.</p>
              <Link to="/app/verifikasi" className="btn btn-primary">
                Verifikasi akun
              </Link>
            </div>
          ) : (
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                try {
                  await run(
                    { type: 'withdraw', amount: Number(amount), requestId },
                    'Permintaan penarikan dicatat. Saldo tersedia sudah dikurangi.',
                  );
                  setWithdraw(false);
                  setAmount('');
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="info-box">
                Saldo tersedia <strong>{money(balance)}</strong>
              </div>
              <Field label="Jumlah penarikan (Rp)">
                <Input
                  type="number"
                  min={1}
                  max={balance}
                  step={1}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </Field>
              <div className="bank-detail">
                <Bank size={26} />
                <div>
                  <strong>
                    {d.account.bank} • {d.account.bankNumber}
                  </strong>
                  <p>{d.account.bankName}</p>
                </div>
              </div>
              <p className="muted">
                Permintaan akan diproses ke rekening yang telah diverifikasi. Status dapat dilihat
                di riwayat transaksi.
              </p>
              {isDemo && (
                <div className="info-box">Mode demo: tidak ada pencairan dana sungguhan.</div>
              )}
              <FormError message={error} />
              <Button type="submit" disabled={busy || balance <= 0}>
                {busy ? 'Memproses...' : 'Konfirmasi penarikan'}
              </Button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
