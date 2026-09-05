import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Storefront,
  ShieldCheck,
  Wallet,
  Check,
  Envelope,
} from '@phosphor-icons/react';
import { Brand, Button, Field, Input, FormError } from '../components/ui';
import { useApp } from '../lib/context';
import { repository, isDemo, emailOtpEnabled } from '../lib/repository';
import { errorText } from '../lib/utils';
export default function Auth() {
  const { loginDemo, refresh } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const register = pathname === '/daftar';
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState(!emailOtpEnabled);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isDemo) {
        if (register) {
          await repository.startFresh(name || 'Pemilik Usaha', identifier);
          await refresh();
          navigate('/app/verifikasi');
        } else {
          await loginDemo();
          navigate('/app');
        }
        return;
      }
      if (Date.now() < lockedUntil)
        throw new Error('Terlalu banyak percobaan. Tunggu 5 menit sebelum mencoba lagi.');
      if (passwordMode) {
        if (register) await repository.registerWithPassword(name, identifier, password);
        else await repository.signInWithPassword(identifier, password);
        await refresh();
        navigate('/app');
        return;
      }
      if (!sent) {
        await repository.sendOtp(identifier, register, name);
        setSent(true);
        setCooldown(30);
      } else {
        try {
          await repository.verifyOtp(identifier, token);
        } catch (e) {
          const count = attempts + 1;
          setAttempts(count);
          if (count >= 3) {
            setLockedUntil(Date.now() + 300000);
            setAttempts(0);
          }
          throw e;
        }
        await refresh();
        navigate(register ? '/app/verifikasi' : '/app');
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="auth-page">
      <section className="auth-story">
        <Brand light />
        <div>
          <span className="eyebrow">RUANG UNTUK SETIAP USAHA</span>
          <h1>
            Satu akun.
            <br />
            Semua toko.
            <br />
            <em>Lebih banyak peluang.</em>
          </h1>
          <p>
            Fokus pada hal yang kamu cintai.
            <br />
            Biar Kiosku membantu mengelola sisanya.
          </p>
          <div className="auth-benefits">
            <span>
              <ShieldCheck />
              Satu verifikasi
            </span>
            <span>
              <Wallet />
              Satu saldo
            </span>
            <span>
              <Storefront />
              Banyak toko
            </span>
          </div>
        </div>
        <small>© {new Date().getFullYear()} Kiosku.id</small>
      </section>
      <section className="auth-form-wrap">
        <Link to="/" className="back-link">
          <ArrowLeft />
          Kembali ke beranda
        </Link>
        <form className="auth-form form-stack" onSubmit={submit}>
          <span className="auth-form-icon">
            <Envelope size={27} />
          </span>
          <h2>
            {sent
              ? 'Cek pesan masukmu'
              : register
                ? 'Mulai cerita bisnismu'
                : 'Selamat datang kembali'}
          </h2>
          <p>
            {sent
              ? identifier.includes('@')
                ? `Buka tautan masuk di email ${identifier}. Jika email berisi kode OTP, masukkan di bawah.`
                : `Masukkan kode OTP yang dikirim ke ${identifier}.`
              : register
                ? 'Toko pertamamu dimulai dari sini. Gratis, tanpa kartu kredit.'
                : 'Semua tokomu menunggu. Yuk, lanjutkan langkah baikmu.'}
          </p>
          {!sent ? (
            <>
              {register && (
                <Field label="Nama lengkap">
                  <Input
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama kamu"
                    autoComplete="name"
                  />
                </Field>
              )}
              <Field
                label={passwordMode ? 'Email' : 'Email atau nomor HP'}
                hint={
                  !isDemo && !passwordMode
                    ? 'Gunakan kode negara untuk HP, contoh +6281234567890.'
                    : undefined
                }
              >
                <Input
                  required
                  type={passwordMode ? 'email' : 'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={passwordMode ? 'nama@email.com' : 'nama@email.com atau +62812...'}
                  autoComplete="username"
                />
              </Field>
              {passwordMode && !isDemo && (
                <Field label="Password" hint={register ? 'Minimal 8 karakter.' : undefined}>
                  <Input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={register ? 8 : undefined}
                    autoComplete={register ? 'new-password' : 'current-password'}
                    placeholder="Masukkan password"
                  />
                </Field>
              )}
            </>
          ) : (
            <Field label="Kode OTP">
              <Input
                required
                pattern="[0-9]{6,8}"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                className="otp-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="000000"
              />
            </Field>
          )}
          {isDemo && (
            <div className="info-box">
              {register
                ? 'Mode demo: buat workspace baru yang kosong. Ini mengganti data demo lokal saat ini. Jangan gunakan data pribadi asli.'
                : 'Mode demo lokal. Email tidak dikirim dan tidak ada pembayaran sungguhan.'}
            </div>
          )}
          <FormError message={error} />
          <Button type="submit" disabled={busy}>
            {busy
              ? 'Mohon tunggu...'
              : isDemo
                ? register
                  ? 'Buat workspace demo baru'
                  : 'Masuk ke demo'
                : passwordMode
                  ? register
                    ? 'Buat akun'
                    : 'Masuk'
                  : sent
                    ? 'Verifikasi & lanjutkan'
                    : identifier.includes('@')
                      ? 'Kirim email masuk'
                      : 'Kirim kode OTP'}
            <ArrowRight size={18} />
          </Button>
          {!isDemo && emailOtpEnabled && !register && !sent && (
            <Button
              variant="ghost"
              onClick={() => {
                setPasswordMode((value) => !value);
                setPassword('');
                setError('');
              }}
            >
              {passwordMode ? 'Masuk lewat email / OTP' : 'Masuk dengan password'}
            </Button>
          )}
          {sent && (
            <Button
              variant="ghost"
              disabled={cooldown > 0 || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await repository.sendOtp(identifier, register, name);
                  setCooldown(30);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {cooldown ? `Kirim ulang dalam ${cooldown} detik` : 'Kirim ulang'}
            </Button>
          )}
          {isDemo && (
            <Button
              variant="secondary"
              onClick={async () => {
                await loginDemo();
                navigate('/app');
              }}
            >
              Jelajahi demo yang tersedia
            </Button>
          )}
          <div className="auth-separator" />
          <p className="auth-switch">
            {register ? 'Sudah punya akun?' : 'Baru di Kiosku?'}{' '}
            <Link
              to={register ? '/masuk' : '/daftar'}
              onClick={() => {
                setSent(false);
                setPasswordMode(!emailOtpEnabled);
                setPassword('');
                setError('');
              }}
            >
              {register ? 'Masuk' : 'Buat toko gratis'}
            </Link>
          </p>
          <small className="auth-note">
            <Check size={15} />
            {passwordMode
              ? 'Gunakan email dan password akunmu.'
              : 'Tanpa password. Masuk aman lewat email atau kode sekali pakai.'}
          </small>
        </form>
      </section>
    </main>
  );
}
