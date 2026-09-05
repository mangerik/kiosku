import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Bank, UploadSimple, GearSix } from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { repository, isDemo } from '../lib/repository';
import { errorText } from '../lib/utils';
import {
  PageHeading,
  Panel,
  PanelHeading,
  Field,
  Input,
  Textarea,
  Button,
  Badge,
  FormError,
  Empty,
  Select,
} from '../components/ui';
import type { Store } from '../lib/types';
export default function Settings() {
  const { data: d, activeStore, run } = useApp();
  const [name, setName] = useState(d?.account.name || '');
  const [busy, setBusy] = useState(false);
  if (!d) return null;
  const store = d.stores.find((s) => s.id === activeStore) || d.stores[0];
  return (
    <>
      <PageHeading title="Pengaturan" description="Atur detail akun dan informasi tokomu." />
      <div className="settings-grid">
        <div>
          <h2>Akun pemilik</h2>
          <p>Informasi ini berlaku untuk semua toko dalam akunmu.</p>
        </div>
        <Panel className="padded">
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await run({ type: 'save-account', name });
              } catch {
                /* toast */
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Nama lengkap">
              <Input
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email / identitas login">
              <Input disabled value={d.account.email} />
            </Field>
            <div className="flex-between">
              <Badge status={d.account.verification} />
              <Link className="text-link" to="/app/verifikasi">
                Kelola verifikasi →
              </Link>
            </div>
            <Button type="submit" disabled={busy}>
              Simpan profil
            </Button>
          </form>
        </Panel>
        <div>
          <h2>Informasi toko</h2>
          <p>Pilih toko di bagian atas untuk mengatur detailnya.</p>
        </div>
        {store ? (
          <StoreSettings key={store.id} store={store} />
        ) : (
          <Panel>
            <Empty title="Belum ada toko" action={<Link to="/app/toko/baru">Buat toko</Link>} />
          </Panel>
        )}
      </div>
    </>
  );
}
function StoreSettings({ store }: { store: Store }) {
  const { run } = useApp();
  const [s, setS] = useState(store);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Panel className="padded">
      <h3>
        <GearSix />
        {s.name}
      </h3>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            await run({ type: 'save-store', store: s });
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Nama toko">
            <Input required value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
          </Field>
          <Field label="Subdomain">
            <Input
              required
              pattern="[a-z0-9-]{3,40}"
              value={s.slug}
              onChange={(e) => setS({ ...s, slug: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Tentang toko">
          <Textarea
            value={s.description}
            maxLength={3000}
            onChange={(e) => setS({ ...s, description: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Kontak WhatsApp" hint="Nomor dengan kode negara, contoh 6281234567890.">
            <Input
              value={s.contact}
              pattern="[0-9]{9,15}"
              onChange={(e) => setS({ ...s, contact: e.target.value })}
            />
          </Field>
          <Field label="Ongkir tetap (Rp)">
            <Input
              type="number"
              min={0}
              step={1}
              required
              value={s.shippingFee}
              onChange={(e) => setS({ ...s, shippingFee: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Kebijakan pengiriman & pengembalian">
          <Textarea
            maxLength={3000}
            value={s.policy}
            onChange={(e) => setS({ ...s, policy: e.target.value })}
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" disabled={busy}>
          Simpan pengaturan toko
        </Button>
      </form>
    </Panel>
  );
}
export function Verification() {
  const { data: d, run, toast } = useApp();
  const [bank, setBank] = useState(d?.account.bank || 'BCA');
  const [bankNumber, setBankNumber] = useState(d?.account.bankNumber || '');
  const [bankName, setBankName] = useState(d?.account.bankName || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!d) return null;
  return (
    <>
      <PageHeading title="Verifikasi akun" description="Cukup sekali, untuk semua usahamu." />
      <div className="verification-layout">
        <Panel className="padded">
          <PanelHeading
            title="Identitas & rekening"
            action={<Badge status={d.account.verification} />}
          />
          {d.account.verification === 'terverifikasi' ? (
            <div className="verified-card">
              <ShieldCheck size={50} weight="duotone" />
              <h2>Akunmu sudah terverifikasi</h2>
              <p>Verifikasi berlaku untuk setiap toko yang kamu miliki.</p>
              <div className="bank-detail">
                <Bank size={27} />
                <div>
                  <strong>
                    {d.account.bank} • {d.account.bankNumber.slice(-4)}
                  </strong>
                  <p>{d.account.bankName}</p>
                </div>
              </div>
              <Link className="btn btn-primary" to="/app/saldo">
                Lihat saldo
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
                  if (!file) throw new Error('Pilih foto identitas.');
                  const documentPath = await repository.upload(file, 'verification');
                  await run(
                    { type: 'verify', bank, bankNumber, bankName, documentPath },
                    'Dokumen dikirim untuk diperiksa.',
                  );
                  setFile(null);
                } catch (e) {
                  setError(errorText(e));
                  toast(errorText(e), true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {d.account.verification === 'menunggu' && (
                <div className="info-box">
                  Dokumen sedang menunggu pemeriksaan. Kamu tetap bisa menyiapkan toko.
                </div>
              )}
              {isDemo && (
                <div className="info-box">
                  Mode demo: gunakan gambar contoh, bukan KTP asli. Dokumen tidak disimpan;
                  persetujuan verifikasi tidak disimulasikan otomatis.
                </div>
              )}
              <Field
                label="Foto KTP"
                hint="JPG, PNG, WebP maksimal 3 MB. Dokumen produksi disimpan privat."
              >
                <span className="upload-box">
                  <UploadSimple size={30} />
                  <strong>{file?.name || 'Pilih foto identitas'}</strong>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    aria-label="Foto KTP"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </span>
              </Field>
              <Field label="Bank">
                <Select value={bank} onChange={(e) => setBank(e.target.value)}>
                  {[
                    'BCA',
                    'BNI',
                    'BRI',
                    'Mandiri',
                    'BSI',
                    'CIMB Niaga',
                    'Bank Jago',
                    'Permata',
                  ].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Nomor rekening">
                <Input
                  required
                  inputMode="numeric"
                  pattern="[0-9]{8,20}"
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                />
              </Field>
              <Field label="Nama pemilik rekening">
                <Input required value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </Field>
              <FormError message={error} />
              <Button disabled={busy} type="submit">
                {busy ? 'Mengirim...' : 'Kirim untuk verifikasi'}
              </Button>
              <Link className="text-link" to="/app/toko/baru">
                Lanjut siapkan toko →
              </Link>
            </form>
          )}
        </Panel>
        <div className="verification-aside">
          <ShieldCheck size={38} />
          <h2>
            Satu identitas.
            <br />
            Banyak peluang.
          </h2>
          <p>
            Verifikasi KTP dan rekening bank cukup dilakukan satu kali, berlaku untuk semua toko
            yang kamu buat.
          </p>
          <ul>
            <li>Rekening untuk saldo gabungan</li>
            <li>Dokumen privat di level akun</li>
            <li>Tambah toko tanpa verifikasi ulang</li>
          </ul>
        </div>
      </div>
    </>
  );
}
