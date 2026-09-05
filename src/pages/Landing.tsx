import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Storefront,
  ShieldCheck,
  Wallet,
  Cursor,
  Package,
  ShoppingBag,
  ChartLineUp,
  Plus,
} from '@phosphor-icons/react';
import { Brand, Button } from '../components/ui';
import { PricingCards, PricingFaq } from './Pricing';
import { useApp } from '../lib/context';
import { isDemo } from '../lib/repository';
export default function Landing() {
  const { loginDemo } = useApp();
  const navigate = useNavigate();
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
        </nav>
        <div>
          <Link to="/masuk" className="login-link">
            Masuk
          </Link>
          <Link to="/daftar" className="btn btn-primary">
            Buat toko gratis <ArrowUpRight size={17} />
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="status-dot" />
              BISNIS BERTUMBUH, KELOLA TETAP MUDAH
            </span>
            <h1>
              Satu Akun,
              <br />
              Semua <span>Toko Kamu.</span>
            </h1>
            <p>
              Bikin toko online sebanyak yang kamu mau — satu saldo, satu verifikasi, satu
              langganan. Tanpa ribet daftar ulang tiap buka usaha baru.
            </p>
            <div className="hero-actions">
              <Link to="/daftar" className="btn btn-primary">
                Buat Toko Gratis <ArrowRight size={19} />
              </Link>
              {isDemo ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await loginDemo();
                    navigate('/app');
                  }}
                >
                  Lihat demo dashboard
                </Button>
              ) : (
                <a href="#cara-kerja" className="btn btn-secondary">
                  Lihat Cara Kerjanya
                </a>
              )}
            </div>
            <div className="hero-promises">
              <span>
                <Check />
                Gratis mulai dari 1 toko
              </span>
              <span>
                <Check />
                Tanpa kartu kredit
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-store-window">
              <div className="hero-window-nav">
                <strong>ruang rupa.</strong>
                <span>KOLEKSI &nbsp; TENTANG</span>
                <ShoppingBag size={17} />
              </div>
              <div className="hero-window-image">
                <img src="/images/hero.jpg" alt="Koleksi fashion di toko lokal" />
                <span>
                  Untuk hari-hari
                  <br />
                  yang berarti.
                </span>
                <small>JELAJAHI KOLEKSI ↗</small>
              </div>
              <div className="hero-window-products">
                <img src="/images/shirt.jpg" alt="Kemeja pilihan" />
                <img src="/images/tote.jpg" alt="Tas koleksi" />
                <img src="/images/shoes.jpg" alt="Sepatu kasual" />
              </div>
            </div>
            <div className="floating-store">
              <span className="store-avatar warm">
                <Storefront size={24} />
              </span>
              <div>
                <strong>Kopi Senja</strong>
                <small>kopi-senja.kiosku.id</small>
              </div>
              <span className="badge status-live">Aktif</span>
            </div>
            <div className="floating-wallet">
              <span>
                <Wallet size={20} />
                Satu saldo, semua toko
              </span>
              <strong>Bisnis lebih rapi.</strong>
              <div>
                <i />
                Ruang Rupa <Plus size={12} /> Kopi Senja
                <Check size={17} />
              </div>
            </div>
            <div className="hero-note">
              Dua brand berbeda.
              <br />
              <strong>Satu tempat mengelola.</strong>
            </div>
          </div>
        </section>
        <section className="value-strip">
          <span>DIBUAT UNTUK USAHA INDONESIA</span>
          <div>
            <ShieldCheck />
            Verifikasi cukup sekali
          </div>
          <div>
            <Storefront />
            Identitas tiap toko tetap unik
          </div>
          <div>
            <Wallet />
            Satu saldo terpusat
          </div>
        </section>
        <section className="how-section" id="cara-kerja">
          <div className="section-intro">
            <span className="eyebrow">LEBIH SEDERHANA, LEBIH BERMAKNA</span>
            <h2>
              Punya lebih dari satu usaha?
              <br />
              Kelola dari satu tempat.
            </h2>
            <p>
              Waktu yang biasanya habis untuk administrasi,
              <br />
              sekarang bisa kamu pakai untuk mengembangkan usaha.
            </p>
          </div>
          <div className="how-grid">
            {[
              {
                n: '01',
                icon: ShieldCheck,
                title: 'Daftar & verifikasi sekali',
                text: 'KTP dan rekening bank cukup diverifikasi satu kali, berlaku untuk semua tokomu.',
              },
              {
                n: '02',
                icon: Cursor,
                title: 'Bangun toko dengan drag & drop',
                text: 'Susun tampilan toko tanpa perlu bisa coding. Pilih tema, lalu buat jadi milikmu.',
              },
              {
                n: '03',
                icon: Storefront,
                title: 'Tambah toko kapan saja',
                text: 'Mau ekspansi ke lini usaha baru? Tambah toko tanpa proses approval ulang.',
              },
              {
                n: '04',
                icon: Wallet,
                title: 'Satu dashboard untuk semua',
                text: 'Saldo gabungan, satu kali tarik dana, satu langganan untuk semua toko.',
              },
            ].map((x) => (
              <div className="how-item" key={x.n}>
                <div>
                  <x.icon size={28} />
                  <span>{x.n}</span>
                </div>
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="feature-section" id="fitur">
          <div className="feature-photo">
            <img src="/images/coffee.jpg" alt="Usaha kopi lokal" />
            <div>
              <span>SETIAP USAHA PUNYA CERITA.</span>
              <h3>
                Beri ruang
                <br />
                untuk tumbuh.
              </h3>
            </div>
          </div>
          <div className="feature-copy">
            <span className="eyebrow">SEMUA YANG KAMU BUTUHKAN</span>
            <h2>
              Dari produk pertama,
              <br />
              sampai toko berikutnya.
            </h2>
            {[
              {
                icon: Package,
                title: 'Katalog produk lengkap',
                text: 'Kelola stok, varian, foto, dan kategori dengan mudah.',
              },
              {
                icon: ShoppingBag,
                title: 'Pesanan tertata',
                text: 'Pantau setiap pesanan dari masuk sampai selesai.',
              },
              {
                icon: ChartLineUp,
                title: 'Tahu yang paling berarti',
                text: 'Lihat performa setiap toko dan pendapatan gabungan.',
              },
            ].map((x) => (
              <div className="feature-line" key={x.title}>
                <x.icon size={24} />
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
              </div>
            ))}
            <Link to="/daftar" className="text-link">
              Mulai cerita bisnismu <ArrowRight />
            </Link>
          </div>
        </section>
        <section className="landing-pricing" id="harga">
          <div className="section-intro">
            <span className="eyebrow">HARGA YANG IKUT TUMBUH BERSAMAMU</span>
            <h2>Satu harga, bukan per toko.</h2>
            <p>Mulai gratis. Tambah ruang saat bisnismu siap.</p>
          </div>
          <PricingCards />
          <PricingFaq />
        </section>
        <section className="landing-cta">
          <span className="eyebrow">LANGKAH BESAR DIMULAI DARI SINI</span>
          <h2>
            Siap kelola semua usahamu
            <br />
            dari satu tempat?
          </h2>
          <Link to="/daftar" className="btn btn-white">
            Mulai Gratis Sekarang — Tanpa Kartu Kredit <ArrowRight />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <span>© {new Date().getFullYear()} Kiosku.id</span>
        <span>Dibangun untuk usaha yang terus bertumbuh.</span>
      </footer>
    </div>
  );
}
