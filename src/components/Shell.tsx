import { useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import {
  SquaresFour,
  Storefront,
  Package,
  ShoppingBag,
  PaintBrush,
  ChartLineUp,
  Wallet,
  Crown,
  GearSix,
  Bell,
  Question,
  SignOut,
  List,
  X,
  CaretDown,
  ArrowUpRight,
  Plus,
  ArrowRight,
} from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { isDemo } from '../lib/repository';
import { plans } from '../lib/types';
import { Brand, Loading, Select, Modal, Button, Badge } from './ui';
export const navItems = [
  { to: '/app', label: 'Ringkasan', icon: SquaresFour },
  { to: '/app/toko', label: 'Toko saya', icon: Storefront },
  { to: '/app/produk', label: 'Produk', icon: Package },
  { to: '/app/pesanan', label: 'Pesanan', icon: ShoppingBag },
  { to: '/app/editor', label: 'Tampilan toko', icon: PaintBrush },
  { to: '/app/analitik', label: 'Analitik', icon: ChartLineUp },
  { to: '/app/saldo', label: 'Saldo', icon: Wallet },
  { to: '/app/langganan', label: 'Langganan', icon: Crown },
  { to: '/app/pengaturan', label: 'Pengaturan', icon: GearSix },
];
export default function Shell() {
  const { data, loading, authenticated, activeStore, setActiveStore, logout } = useApp();
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState(false);
  const [help, setHelp] = useState(false);
  const location = useLocation();
  if (loading) return <Loading />;
  if (!authenticated || !data) return <Navigate to="/masuk" replace />;
  const plan = plans.find((p) => p.id === data.account.tier)!;
  const active = data.stores.filter((s) => s.status !== 'nonaktif');
  const pending = data.orders.filter((o) => o.status === 'baru');
  const page = navItems.find((i) => i.to === location.pathname)?.label || 'Toko saya';
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-btn mobile-only"
            aria-label="Tutup menu"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE BISNIS</div>
        <nav aria-label="Navigasi merchant">
          {navItems.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={i === 0}
              onClick={() => setMobile(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''} ${i === 6 ? 'nav-divider' : ''}`
              }
            >
              <item.icon size={21} weight={location.pathname === item.to ? 'fill' : 'regular'} />
              <span>{item.label}</span>
              {item.label === 'Pesanan' && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-mini">
            <div>
              <Crown size={19} />
              <strong>Paket {plan.name}</strong>
              <span>
                {active.length}/{plan.quota}
              </span>
            </div>
            <p>Ruang untuk bisnismu bertumbuh.</p>
            <div className="progress-track">
              <i style={{ width: `${(active.length / plan.quota) * 100}%` }} />
            </div>
            <Link to="/app/langganan">
              Lihat paket <ArrowUpRight size={15} />
            </Link>
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <Question size={21} />
            <span>Pusat bantuan</span>
            <ArrowUpRight size={15} />
          </button>
          <button className="nav-item" onClick={() => void logout()}>
            <SignOut size={21} />
            <span>Keluar</span>
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-only"
              aria-label="Buka menu"
              onClick={() => setMobile(true)}
            >
              <List size={24} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <strong>{page}</strong>
            </span>
          </div>
          <div className="topbar-right">
            {isDemo && <span className="demo-pill">Mode demo</span>}
            <button
              className="icon-btn notification-btn"
              aria-label="Lihat pemberitahuan"
              onClick={() => setNotice(true)}
            >
              <Bell size={22} />
              {pending.length > 0 && <i />}
            </button>
            <div className="topbar-divider" />
            <Link to="/app/pengaturan" className="profile">
              <span className="avatar">
                {data.account.name
                  .split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')}
              </span>
              <span className="profile-name">
                <strong>{data.account.name}</strong>
                <small>Pemilik bisnis</small>
              </span>
              <CaretDown size={14} />
            </Link>
          </div>
        </header>
        <div className="workspace-bar">
          <div className="store-switch">
            <Storefront size={19} />
            <Select
              aria-label="Toko aktif"
              value={activeStore}
              onChange={(e) => setActiveStore(e.target.value)}
            >
              <option value="all">Semua toko</option>
              {data.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.status === 'nonaktif' ? ' (Nonaktif)' : ''}
                </option>
              ))}
            </Select>
            <span>{active.length} toko aktif</span>
          </div>
          <Link className="text-link" to="/app/toko/baru">
            <Plus size={15} />
            Tambah toko
          </Link>
        </div>
        <main id="main-content" className="page-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} Kiosku.id</span>
          <span>Satu akun. Banyak peluang.</span>
        </footer>
      </div>
      {notice && (
        <Modal title="Pemberitahuan" onClose={() => setNotice(false)}>
          <div className="notice-row">
            <ShoppingBag size={26} />
            <div>
              <h3>{pending.length} pesanan baru</h3>
              <p>Periksa pembayaran dan proses pesanan pelanggan.</p>
              <Link to="/app/pesanan" className="text-link" onClick={() => setNotice(false)}>
                Lihat pesanan <ArrowRight />
              </Link>
            </div>
          </div>
          <div className="notice-row">
            <Crown size={26} />
            <div>
              <h3>
                {active.length} dari {plan.quota} kuota toko terpakai
              </h3>
              <p>Punya usaha lain? Tambah toko tanpa verifikasi ulang.</p>
            </div>
          </div>
          {isDemo && (
            <div className="info-box">
              Ini workspace demo. Semua transaksi dan perubahan paket adalah simulasi lokal.
            </div>
          )}
        </Modal>
      )}
      {help && (
        <Modal title="Pusat bantuan" onClose={() => setHelp(false)}>
          <div className="help-list">
            {[
              [
                'Bagaimana membuka toko kedua?',
                'Buka Toko saya → Tambah toko. Jika kuota penuh, pilih paket Tumbuh atau Skala. Verifikasi akun cukup sekali.',
              ],
              [
                'Ke mana pembayaran pelanggan masuk?',
                'Pembayaran terkonfirmasi masuk ke Saldo akun. Kontribusi tiap toko dapat dilihat pada halaman Saldo.',
              ],
              [
                'Bagaimana mempublikasikan toko?',
                'Tambahkan produk, buka Tampilan toko, susun bagian, lalu klik Publish toko. Draft tidak mengubah tampilan yang sudah live.',
              ],
            ].map(([q, a]) => (
              <details key={q} open>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <Badge status={data.account.verification} />
          <Button className="mt" variant="secondary" onClick={() => setHelp(false)}>
            Mengerti
          </Button>
        </Modal>
      )}
    </div>
  );
}
