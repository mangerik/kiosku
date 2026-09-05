# Koneksi Supabase — 3 September 2026

## Pembaruan: Netlify otomatis

Migrasi ketiga `202609030003_netlify.sql` sudah diterapkan melalui SQL Editor dalam transaksi. Snapshot definisi `store_json` sebelumnya ada di `store-json-before-netlify.txt`. Kini ada 14 tabel public dengan RLS, tiga bucket (termasuk `deployment-assets` privat), dan delapan tabel Realtime. Fungsi kelima `publish-store` sudah deployed dengan verifikasi JWT pengguna di dalam fungsi; `checkout` diperbarui untuk origin toko terdaftar dan callback alamat toko. Secret Netlify, URL bundle, APP_URL produksi dan ALLOWED_ORIGINS sudah tersimpan. Frontend utama aktif di https://kioskuapp.netlify.app. Rincian ada di [NETLIFY.md](NETLIFY.md). Catatan pemasangan awal di bawah mempertahankan bukti sebelum pembaruan ini.

## Pembaruan: pendaftaran langsung sementara

Atas permintaan pengguna, `Confirm email` dimatikan pada proyek ini. Endpoint Auth settings mengonfirmasi `mailer_autoconfirm=true`. Form daftar sekarang meminta nama, email dan password (minimal 8 karakter), menggunakan Supabase `signUp`, lalu membuka dashboard melalui sesi yang diterbitkan Supabase. Form login memakai email/password; pilihan OTP disembunyikan. Pendaftaran melalui browser berhasil membuat workspace Rintis kosong atas nama Uji Pendaftaran dan langsung masuk. Build produksi lulus. Verifikasi identitas/rekening untuk pencairan tetap mengikuti aturan sebelumnya.

Mode sementara ini menjadi default `VITE_AUTH_MODE=password` (juga ketika variabel tidak diisi). Untuk mengaktifkan kembali OTP, set `VITE_AUTH_MODE=otp`, aktifkan `Confirm email` di dashboard, kembalikan `auth.email.enable_confirmations=true` pada konfigurasi lokal, dan siapkan SMTP/template. Catatan pemasangan awal di bawah menggambarkan kondisi sebelum perubahan ini.

Target yang diverifikasi: `https://mbackiawysjbjvqlntfs.supabase.co`, organisasi **toko**. `.env.local` memakai `VITE_DATA_MODE=supabase` dan public anon key yang diberikan pengguna. Key tidak disalin ke dokumentasi ini; `.env.local` dikecualikan dari Git.

## Sudah dipasang

- Inventaris awal: tidak ada tabel public, pengguna Auth atau bucket. Hasil read-only disimpan di `supabase-before.json`.
- Migrasi `202609030001_kiosku.sql` dan `202609030002_billing.sql` diterapkan melalui SQL Editor, dibungkus dalam satu transaksi. Hasil sukses; 13 dari 13 tabel public memiliki RLS.
- Storage `products` publik untuk foto produk dan `verification` privat untuk dokumen identitas; keduanya memiliki batas ukuran dan tipe file.
- Tujuh tabel terdaftar pada publikasi `supabase_realtime`.
- Edge Functions: `checkout`, `payment-webhook`, `billing-checkout`, `maintenance`. Source berasal dari workspace, dibundel dengan esbuild untuk editor dashboard; file lokal asli tetap menjadi sumber implementasi. Konfigurasi JWT legacy mengikuti `supabase/config.toml`; billing memverifikasi pengguna di dalam fungsi, webhook memverifikasi signature provider dan maintenance memerlukan bearer privat.
- Site URL `http://127.0.0.1:5173/app`. Redirect diizinkan untuk `/app` dan `/app/verifikasi` pada `127.0.0.1:5173` serta `localhost:5173`.
- Build produksi dengan URL/key cloud asli berhasil. Halaman masuk cloud terbuka dan tidak menampilkan akses demo.

## Pemeriksaan cloud

`supabase-checks.json` menyimpan delapan hasil pemeriksaan. Storefront publik merespons HTTP 200/null untuk slug yang tidak ada. RPC workspace dan settlement menolak anon dengan HTTP 401. Checkout transfer/QRIS dan webhook menolak pemrosesan saat konfigurasi pembayaran belum tersedia (503). Billing dan maintenance menolak request tanpa autentikasi (401). Tidak ada email, pesanan, pembayaran atau akun percobaan dibuat.

## Yang masih diperlukan

Pembaruan akun uji: atas permintaan pengguna, akun merchant `uji.kiosku@example.com` dibuat melalui Supabase Auth (auto-confirm khusus akun ini, tanpa mengirim email). Login password ditambahkan sebagai pilihan pada `/masuk`; login ke dashboard cloud dengan paket Rintis sudah diverifikasi. Password diberikan langsung kepada pengguna dan tidak disimpan di repository. Akun ini tidak memiliki kedaluwarsa otomatis; hapus/nonaktifkan melalui Auth setelah tidak digunakan. Pemeriksaan API di atas dilakukan sebelum akun uji dibuat.

- **Email:** default template proyek Free berisi tautan sign-in, bukan kode OTP. Frontend mendukung kedua bentuk. Custom SMTP diperlukan untuk pengiriman umum dan template OTP kustom; dashboard juga menawarkan Pro untuk kustomisasi template dengan email bawaan. Belum ada pengiriman email end-to-end.
- **SMS:** provider telepon belum aktif.
- **Pembayaran:** Midtrans server key dan rekening penerimaan platform belum diberikan. Fungsi menolak transaksi sebelum stok/reservasi dibuat jika konfigurasi metode belum lengkap.
- **Scheduler/email pesanan:** secrets dan scheduler maintenance belum dipasang; Resend belum terhubung. Deploy fungsi tidak berarti job otomatis berjalan.
- **Domain sendiri:** hosting Netlify sudah aktif (lihat pembaruan di atas). Domain `kiosku.id` dan wildcard DNS/TLS belum diaktifkan; alamat Netlify tidak memerlukannya.

## Sebelum menggunakan Supabase CLI berikutnya

CLI belum login pada saat pemasangan, sehingga migrasi diterapkan melalui dashboard dan **riwayat CLI belum dicatat**. Jangan menjalankan `db push` pada proyek ini sebelum sinkronisasi riwayat; tabel sudah ada. Setelah login CLI, pastikan target tetap proyek di atas dan jalankan:

```sh
npx supabase login
npx supabase migration repair 202609030001 202609030002 202609030003 --status applied --project-ref mbackiawysjbjvqlntfs
```

Perintah repair hanya mencatat migrasi yang sudah dipasang; jangan mengulang SQL awal. Untuk perubahan berikutnya tambahkan migrasi baru. Kredensial CLI/database dimasukkan lewat mekanisme login resmi, bukan public anon key.
