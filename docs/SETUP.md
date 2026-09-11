# Setup Kiosku

## 1. Frontend

Gunakan Node.js 22.12+ atau 24. Jalankan `npm install`, lalu `npm run dev`. Salin `.env.example` menjadi `.env.local` untuk konfigurasi cloud:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=PUBLIC_ANON_OR_PUBLISHABLE_KEY
VITE_BASE_DOMAIN=kiosku.id
```

Hanya public key boleh memakai awalan `VITE_`. Service role dan Midtrans server key hanya disimpan sebagai secret Edge Function. Setelah mengubah environment Vite, jalankan ulang dev server atau build ulang. Mode default adalah demo lokal yang diberi label jelas.

## 2. Supabase

Workspace ini sudah dihubungkan ke `mbackiawysjbjvqlntfs` melalui dashboard. Baca `docs/deployment/SUPABASE.md` sebelum menjalankan `db push` pada proyek tersebut: migrasi yang dipasang manual perlu dicatat dengan `migration repair`. Perintah berikut untuk proyek baru yang belum menerima migrasi.

Buat proyek Supabase terpisah untuk staging dan production. Gunakan Supabase CLI pada direktori ini:

```sh
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy checkout
npx supabase functions deploy payment-webhook
npx supabase functions deploy billing-checkout
npx supabase functions deploy maintenance
npx supabase functions deploy payment-proof
```

`supabase/.env.local` berasal dari `supabase/.env.example` dan tidak masuk Git. Migrasi menyediakan tabel, RPC, RLS, bucket, audit, dan publikasi Realtime. Semua perubahan stok dan status pembayaran memakai transaksi database; client hanya memiliki akses baca miliknya dan RPC terkontrol. Checkout publik dijalankan oleh Edge Function dengan service role dan pembatasan request.

Untuk pengembangan Supabase lokal, pasang Docker dan jalankan `npx supabase start`. Pengujian PGlite tidak memerlukan Docker, tetapi tidak menggantikan pemeriksaan layanan Auth/Storage/Realtime di Supabase staging.

### Auth

**Mode aktif sementara:** daftar/login menggunakan email/password, tanpa konfirmasi email, sesuai permintaan pemilik. `VITE_AUTH_MODE=password` adalah default dan `enable_confirmations=false` sudah diselaraskan dengan dashboard proyek. Pendaftaran langsung masuk ke dashboard. Petunjuk OTP berikut berlaku saat verifikasi email diaktifkan kembali.

Aktifkan email OTP, gunakan template email yang memuat `{{ .Token }}`, dan konfigurasi SMTP. Dashboard proyek Free saat ini mensyaratkan custom SMTP atau Pro untuk mengedit template. Template bawaan mengirim tautan login; frontend juga mendukung tautan tersebut dengan callback `/app` atau `/app/verifikasi`. Untuk login HP, aktifkan penyedia SMS di Supabase. Atur Site URL dan redirect URL ke alamat frontend. UI menampilkan jeda kirim ulang 30 detik serta jeda 5 menit setelah tiga kode salah; rate limit server mengikuti konfigurasi Supabase (UI saja tidak menjadi batas keamanan).

Nama akun dapat diperbarui di Pengaturan. Dokumen verifikasi masuk bucket privat `verification`, dengan folder pemilik akun. Status pengajuan adalah `menunggu` hingga diperiksa operator. Pembuatan toko dan pengisian katalog bisa dilakukan sembari menunggu; penarikan memerlukan rekening terverifikasi.

## 3. Pembayaran dan saldo

### Pembayaran toko manual

Pemilik toko mengaktifkan transfer bank dan/atau mengunggah QRIS statis pada Pengaturan. Checkout menyimpan salinan petunjuk pembayaran pada pesanan. Pembeli membayar langsung ke pemilik toko, mengunggah bukti JPG/PNG/WebP maksimal 3 MB, lalu pemilik memeriksa mutasi rekening atau aplikasi QRIS dan memilih konfirmasi atau tolak bukti.

Bukti disimpan di bucket privat `payment-proofs` dan hanya dibuka pemilik toko melalui URL bertanda tangan yang singkat masa berlakunya. Konfirmasi mengubah pesanan menjadi lunas tanpa menambah saldo platform. Pengembalian dana dilakukan langsung antara pemilik toko dan pembeli.

### Langganan

Rintis gratis. Tumbuh Rp5.000/hari dan Skala Rp16.600/hari ditagihkan **prabayar 30 hari** (Rp150.000/Rp498.000), ditampilkan sebelum membayar. Ini adalah keputusan implementasi karena PRD tidak menetapkan periode tagihan. Pembayaran terverifikasi mengaktifkan kuota. Pembayaran berulang untuk tier sama menambah masa aktif; pindah tier memulai periode baru tanpa prorata. Turun ke gratis berlaku segera. Scheduler mengembalikan paket kedaluwarsa ke Rintis dan menonaktifkan toko di luar kuota tanpa menghapusnya.

### Verifikasi dan pencairan

Pengelola platform memeriksa KTP/rekening dengan proses operasional yang ditentukan pemilik layanan. Fungsi berikut hanya untuk service role/SQL operator tepercaya:

```sql
select public.review_identity('ACCOUNT_UUID', true, 'REVIEW-REFERENCE');
-- Lakukan transfer bank yang sebenarnya dahulu, lalu catat bukti penyelesaiannya:
select public.complete_withdrawal('WALLET_TRANSACTION_UUID', 'BANK-PAYOUT-REFERENCE');
```

Pengajuan penarikan mereservasi saldo, dengan ID request untuk mencegah pemrosesan ulang. `complete_withdrawal` hanya menandai hasil transfer; **fungsi ini tidak mengirim uang ke bank**. Payout otomatis dan dashboard operator bukan cakupan implementasi saat ini. Semua pemeriksaan dan penyelesaian tercatat di `operator_audit`.

## 4. Scheduler dan email

Panggil `maintenance` setiap lima menit menggunakan scheduler tepercaya, metode POST dan header `Authorization: Bearer MAINTENANCE_SECRET`. Secret ini berbeda dari public key. Fungsi memeriksa pembayaran gateway yang pending, kedaluwarsa transfer manual, masa langganan dan outbox notifikasi.

Untuk email isi `RESEND_API_KEY` dan `NOTIFICATION_FROM` dengan domain pengirim terverifikasi. Pesanan baru, pembayaran dan perubahan pengiriman masuk antrean. Pengiriman menggunakan idempotency key. Pesan yang gagal lima kali tetap tersimpan untuk pemeriksaan operator. Jadwal dan provider email harus benar-benar diaktifkan; kode antrean sendiri tidak berarti email sudah terkirim.

## 5. Hosting dan wildcard domain

Build command adalah `npm run build` dengan output `dist/`. Storefront setiap toko memakai route `/toko/SLUG` dalam aplikasi yang sama. Jika domain `kiosku.id` digunakan kelak, wildcard subdomain dapat diarahkan ke aplikasi yang sama; domain `www` dan `app` dicadangkan.

Sebelum soft launch, uji OTP email/SMS, private storage, cross-account RLS, event Realtime, QRIS sandbox sukses/gagal/duplikat, transfer manual, invoice, scheduler, penarikan dan wildcard TLS di staging. Uji beban dan soft launch UMKM belum dijalankan.

Referensi integrasi: [Supabase OTP](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [verifikasi OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp), [Midtrans webhook](https://docs.midtrans.com/docs/https-notification-webhooks), [Snap integration](https://docs.midtrans.com/docs/snap-snap-integration-guide).
