import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CurrencyCircleDollar,
  ShoppingBag,
  Package,
  Wallet,
  Storefront,
  Plus,
  ArrowRight,
  ArrowDownRight,
} from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { money, number, balanceOf, revenueOf, date, safeImage } from '../lib/utils';
import { PageHeading, Panel, PanelHeading, Badge, TextLink, Select, Empty } from '../components/ui';
import RevenueChart from '../components/RevenueChart';
export default function Dashboard({ analytics = false }: { analytics?: boolean }) {
  const { data: d, activeStore } = useApp();
  const [days, setDays] = useState(7);
  if (!d) return null;
  const stores = d.stores.filter((s) => activeStore === 'all' || s.id === activeStore);
  const orders = d.orders.filter((o) => stores.some((s) => s.id === o.storeId));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);
  const period = orders.filter((o) => new Date(o.createdAt) >= cutoff);
  const previous = orders.filter((o) => {
    const dt = new Date(o.createdAt).getTime();
    return dt < cutoff.getTime() && dt >= cutoff.getTime() - days * 86400000;
  });
  const revenue = revenueOf(period);
  const prevRevenue = revenueOf(previous);
  const change = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
  const sold = period
    .filter((o) => o.payment === 'lunas')
    .flatMap((o) => o.items)
    .reduce((s, i) => s + i.quantity, 0);
  const top = d.products
    .filter((p) => stores.some((s) => s.id === p.storeId))
    .map((p) => ({
      ...p,
      sold: period
        .filter((o) => o.payment === 'lunas')
        .flatMap((o) => o.items)
        .filter((i) => i.productId === p.id)
        .reduce((s, i) => s + i.quantity, 0),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  const stats = [
    {
      title: 'Total pendapatan',
      value: money(revenue),
      icon: CurrencyCircleDollar,
      note:
        change === null ? 'Belum ada pembanding' : `${Math.abs(change)}% dari periode sebelumnya`,
      positive: change !== null && change >= 0,
    },
    {
      title: 'Total pesanan',
      value: number(period.length),
      icon: ShoppingBag,
      note: `${period.filter((o) => o.status === 'baru').length} pesanan perlu diproses`,
    },
    {
      title: 'Produk terjual',
      value: number(sold),
      icon: Package,
      note: `Dari ${stores.length} toko dalam periode ini`,
    },
    {
      title: 'Saldo tersedia',
      value: money(balanceOf(d.transactions)),
      icon: Wallet,
      note: 'Gabungan semua toko',
      wallet: true,
    },
  ];
  return (
    <>
      <PageHeading
        title={analytics ? 'Analitik bisnis' : 'Ringkasan bisnis'}
        description={
          analytics
            ? 'Kenali performa tokomu dan temukan peluang berikutnya.'
            : `Halo, ${d.account.name.split(' ')[0]}! Yuk, lihat perkembangan bisnismu hari ini.`
        }
        action={
          <>
            <Select
              aria-label="Periode laporan"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 hari terakhir</option>
              <option value={30}>30 hari terakhir</option>
              <option value={90}>90 hari · per minggu</option>
              <option value={365}>365 hari · per bulan</option>
            </Select>
            <Link to="/app/toko/baru" className="btn btn-primary">
              <Plus size={17} />
              Tambah toko
            </Link>
          </>
        }
      />
      {!d.stores.length && (
        <div className="onboarding-banner">
          <div>
            <h2>Yuk, buat toko pertamamu</h2>
            <p>Mulai dari nama toko, tambahkan produk, lalu siap jualan.</p>
          </div>
          <Link to="/app/toko/baru" className="btn btn-primary">
            Buat toko pertama <ArrowRight />
          </Link>
        </div>
      )}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <Panel key={stat.title} className={`stat-card ${stat.wallet ? 'wallet-stat' : ''}`}>
            <div className="stat-top">
              <span>{stat.title}</span>
              <stat.icon size={21} weight="duotone" />
            </div>
            <strong className="stat-value">{stat.value}</strong>
            <div className="stat-foot">
              {i === 0 &&
                change !== null &&
                (stat.positive ? <ArrowUpRight /> : <ArrowDownRight />)}
              <span>{stat.note}</span>
              {stat.wallet && (
                <Link to="/app/saldo" aria-label="Lihat saldo">
                  <ArrowUpRight size={19} />
                </Link>
              )}
            </div>
          </Panel>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel className="revenue-panel">
          <PanelHeading
            title="Tren pendapatan"
            description="Pendapatan dari pesanan yang sudah dibayar"
            action={
              <span className="chart-legend">
                <i />
                Pendapatan
              </span>
            }
          />
          <div className="chart-total">
            {money(revenue)} <small>dalam {days} hari terakhir</small>
          </div>
          <RevenueChart orders={orders} days={days} />
        </Panel>
        <Panel className="performance-panel">
          <PanelHeading title="Performa toko" action={<Storefront size={20} className="muted" />} />
          <div className="store-performance">
            {stores.map((store, i) => {
              const value = revenueOf(period.filter((o) => o.storeId === store.id));
              return (
                <div className="performance-item" key={store.id}>
                  <div className={`store-avatar store-color-${i % 3}`}>
                    <Storefront size={23} />
                  </div>
                  <div className="grow">
                    <div className="flex-between">
                      <strong>{store.name}</strong>
                      <Badge status={store.status} />
                    </div>
                    <small>{store.category}</small>
                    <div className="performance-value">
                      {money(value)}
                      <span>{period.filter((o) => o.storeId === store.id).length} pesanan</span>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: `${revenue ? (value / revenue) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {!stores.length && <Empty title="Tokomu akan tampil di sini" />}
          </div>
          <Link className="panel-bottom-link" to="/app/toko">
            Kelola semua toko <ArrowRight size={16} />
          </Link>
        </Panel>
      </div>
      <div className="dashboard-grid lower">
        <Panel>
          <PanelHeading
            title="Pesanan terbaru"
            description="Pantau setiap pesanan dari satu tempat"
            action={<TextLink to="/app/pesanan">Lihat semua</TextLink>}
          />
          {orders.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>No. pesanan</th>
                    <th>Pelanggan</th>
                    <th>Toko</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link className="order-code" to={`/app/pesanan/${o.id}`}>
                          {o.code}
                        </Link>
                        <small>{date(o.createdAt)}</small>
                      </td>
                      <td>{o.customer.name}</td>
                      <td className="muted">{d.stores.find((s) => s.id === o.storeId)?.name}</td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                      <td className="text-right font-semibold">{money(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Belum ada pesanan" description="Pesanan pertama akan tampil di sini." />
          )}
        </Panel>
        <Panel>
          <PanelHeading
            title="Produk terlaris"
            description={`${days} hari terakhir`}
            action={<Package size={20} className="muted" />}
          />
          <div className="top-products">
            {top.map((p, i) => (
              <Link to="/app/produk" className="top-product" key={p.id}>
                <span className="rank">{i + 1}</span>
                <img src={safeImage(p.images[0] || '')} alt={p.name} />
                <div>
                  <strong>{p.name}</strong>
                  <small>{d.stores.find((s) => s.id === p.storeId)?.name}</small>
                </div>
                <span className="sold-count">
                  {p.sold}
                  <small>terjual</small>
                </span>
              </Link>
            ))}
            {!top.length && <Empty title="Belum ada produk" />}
          </div>
          <Link className="panel-bottom-link" to="/app/produk">
            Lihat semua produk <ArrowRight size={16} />
          </Link>
        </Panel>
      </div>
      {!analytics && (
        <div className="growth-banner">
          <div className="growth-icon">
            <Storefront size={30} weight="duotone" />
            <Plus size={16} />
          </div>
          <div>
            <h3>Satu akun, lebih banyak peluang.</h3>
            <p>Punya usaha lain? Tambah toko baru tanpa perlu verifikasi ulang.</p>
          </div>
          <Link to="/app/toko/baru" className="text-link">
            Kembangkan bisnismu <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </>
  );
}
