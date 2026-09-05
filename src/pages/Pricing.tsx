import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Crown, ArrowRight, Storefront } from '@phosphor-icons/react';
import { useApp } from '../lib/context';
import { isDemo, repository } from '../lib/repository';
import { plans } from '../lib/types';
import type { Tier } from '../lib/types';
import { money, errorText } from '../lib/utils';
import { Button, PageHeading, Panel, Modal, FormError } from '../components/ui';
export function PricingCards({ merchant = false }: { merchant?: boolean }) {
  const { data, run } = useApp();
  const [selected, setSelected] = useState<Tier | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <div className="pricing-grid">
        {plans.map((plan) => (
          <Panel className={`pricing-card ${plan.id === 'tumbuh' ? 'featured' : ''}`} key={plan.id}>
            {plan.id === 'tumbuh' && <span className="recommended">RUANG UNTUK BERTUMBUH</span>}
            <span className="plan-symbol">
              <Storefront size={25} />
            </span>
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <div className="plan-price">
              {money(plan.price)}
              {plan.price > 0 && <span>/hari</span>}
            </div>
            <div className="plan-quota">
              <Check size={18} />
              <strong>{plan.quota} toko aktif</strong> dalam satu akun
            </div>
            <ul>
              {[
                'Storefront builder & pilihan tema',
                'Produk, varian & pesanan',
                'Saldo dan penarikan terpusat',
                'Analitik dasar per toko',
                ...(plan.id === 'skala' ? ['Prioritas dukungan pelanggan'] : []),
              ].map((f) => (
                <li key={f}>
                  <Check size={17} />
                  {f}
                </li>
              ))}
            </ul>
            {merchant ? (
              <Button
                variant={plan.id === 'tumbuh' ? 'primary' : 'secondary'}
                disabled={data?.account.tier === plan.id}
                onClick={() => {
                  setSelected(plan.id);
                  setError('');
                }}
              >
                {data?.account.tier === plan.id ? 'Paketmu saat ini' : `Pilih ${plan.name}`}
              </Button>
            ) : (
              <Link
                className={`btn btn-${plan.id === 'tumbuh' ? 'primary' : 'secondary'}`}
                to="/daftar"
              >
                Mulai dengan {plan.name}
                <ArrowRight size={16} />
              </Link>
            )}
          </Panel>
        ))}
      </div>
      {selected && (
        <Modal
          title={`Pindah ke paket ${plans.find((p) => p.id === selected)!.name}?`}
          onClose={() => setSelected(null)}
        >
          <div className="form-stack">
            <p>
              {data && data.stores.length > plans.find((p) => p.id === selected)!.quota
                ? 'Toko yang melebihi kuota akan dinonaktifkan sementara, tanpa menghapus produk atau pesanan. Toko aktif kembali setelah upgrade.'
                : 'Kuota toko akan menyesuaikan paket pilihanmu.'}
            </p>
            {isDemo ? (
              <div className="info-box">
                Perubahan paket dalam mode demo tidak menagih pembayaran.
              </div>
            ) : (
              <div className="info-box">
                {selected === 'rintis'
                  ? 'Pindah ke paket gratis berlaku langsung. Sisa masa aktif paket sebelumnya tidak diuangkan.'
                  : `Prabayar 30 hari: ${money(plans.find((p) => p.id === selected)!.price * 30)}. Paket aktif setelah pembayaran terverifikasi. Pergantian paket memulai masa aktif baru; sisa masa aktif paket berbeda tidak dibawa.`}
              </div>
            )}
            <FormError message={error} />
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (!isDemo && selected !== 'rintis') await repository.subscribe(selected);
                  else
                    await run(
                      { type: 'change-tier', tier: selected },
                      'Paket dan kuota toko diperbarui.',
                    );
                  setSelected(null);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? 'Memproses...'
                : isDemo
                  ? 'Konfirmasi perubahan paket'
                  : selected === 'rintis'
                    ? 'Konfirmasi paket gratis'
                    : 'Lanjut ke pembayaran'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export default function Pricing() {
  const { data } = useApp();
  return (
    <>
      <PageHeading
        title="Satu harga, bukan per toko"
        description="Bayar sesuai jumlah toko yang kamu butuh, bukan fitur yang dibatasi."
      />
      {data && (
        <div className="subscription-banner">
          <Crown size={24} />
          <div>
            <strong>Paket {plans.find((p) => p.id === data.account.tier)?.name}</strong>
            <p>Satu langganan untuk semua usahamu.</p>
          </div>
          <span>{data.stores.filter((s) => s.status !== 'nonaktif').length} toko aktif</span>
        </div>
      )}
      <PricingCards merchant />
      <div className="custom-plan">
        <div>
          <h3>Butuh lebih banyak ruang?</h3>
          <p>Paket Custom untuk 4+ toko direncanakan pada fase berikutnya.</p>
        </div>
        <span className="badge status-draft">Segera hadir</span>
      </div>
      <PricingFaq />
    </>
  );
}
export function PricingFaq() {
  return (
    <div className="pricing-faq">
      <h2>Pertanyaan yang sering ditanyakan</h2>
      {[
        [
          'Apakah saldo tiap toko terpisah?',
          'Tidak, semua toko dalam satu akun berbagi satu saldo dan satu proses penarikan dana — jadi keuanganmu tetap rapi meski toko bertambah.',
        ],
        [
          'Perlu verifikasi ulang kalau tambah toko?',
          'Tidak. Verifikasi KTP dan rekening bank cukup dilakukan sekali di awal, berlaku untuk semua toko yang kamu buat.',
        ],
        [
          'Bisa upgrade/downgrade kapan saja?',
          'Bisa. Kalau downgrade dan jumlah toko aktifmu melebihi kuota paket baru, toko kelebihan akan dinonaktifkan sementara (bukan dihapus) sampai kamu upgrade lagi.',
        ],
      ].map(([q, a]) => (
        <details key={q}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
