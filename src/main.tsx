import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import './styles.css';
import { AppProvider } from './lib/context';
import { Loading, Empty } from './components/ui';
import Shell from './components/Shell';
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Stores = lazy(() => import('./pages/Stores'));
const NewStore = lazy(() => import('./pages/Stores').then((m) => ({ default: m.NewStore })));
const Products = lazy(() => import('./pages/Products'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/Orders').then((m) => ({ default: m.OrderDetail })));
const Wallet = lazy(() => import('./pages/Wallet'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Builder = lazy(() => import('./pages/Builder'));
const Settings = lazy(() => import('./pages/Settings'));
const Verification = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Verification })),
);
const Storefront = lazy(() => import('./pages/Storefront'));
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Empty
        title="Ada kendala saat memuat halaman"
        description="Data yang sudah tersimpan tetap aman. Muat ulang untuk mencoba kembali."
        action={
          <button className="btn btn-primary" onClick={() => location.reload()}>
            Muat ulang
          </button>
        }
      />
    ) : (
      this.props.children
    );
  }
}
function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
    if (pathname.startsWith('/app')) document.title = 'Workspace — Kiosku.id';
    else if (!pathname.startsWith('/toko/')) {
      document.title =
        pathname === '/masuk'
          ? 'Masuk — Kiosku.id'
          : pathname === '/daftar'
            ? 'Buat akun — Kiosku.id'
            : 'Kiosku.id — Satu Akun, Semua Toko Kamu';
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute(
          'content',
          'Buat dan kelola beberapa toko online dalam satu akun. Satu saldo, satu verifikasi, satu langganan.',
        );
    }
  }, [pathname]);
  return null;
}
function AppRoutes() {
  const domain = import.meta.env.VITE_BASE_DOMAIN || 'kiosku.id';
  const host = window.location.hostname;
  const subdomain = host.endsWith(`.${domain}`) ? host.slice(0, -(domain.length + 1)) : '';
  const location = useLocation();
  if (subdomain && !['www', 'app'].includes(subdomain) && !location.pathname.startsWith('/toko/'))
    return (
      <Navigate
        to={`/toko/${subdomain}${location.pathname === '/' ? '' : location.pathname}${location.search}`}
        replace
      />
    );
  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Auth />} />
          <Route path="/daftar" element={<Auth />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="toko" element={<Stores />} />
            <Route path="toko/baru" element={<NewStore />} />
            <Route path="produk" element={<Products />} />
            <Route path="pesanan" element={<Orders />} />
            <Route path="pesanan/:id" element={<OrderDetail />} />
            <Route path="saldo" element={<Wallet />} />
            <Route path="analitik" element={<Dashboard analytics />} />
            <Route path="langganan" element={<Pricing />} />
            <Route path="editor" element={<Builder />} />
            <Route path="pengaturan" element={<Settings />} />
            <Route path="verifikasi" element={<Verification />} />
          </Route>
          <Route path="/toko/:slug" element={<Storefront />} />
          <Route path="/toko/:slug/produk/:productId" element={<Storefront />} />
          <Route path="/toko/:slug/:page" element={<Storefront />} />
          <Route
            path="*"
            element={
              <Empty
                title="Halaman tidak ditemukan"
                action={
                  <a className="btn btn-primary" href="/">
                    Kembali ke beranda
                  </a>
                }
              />
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
