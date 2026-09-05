# Kiosku.id

Web multi-toko berdasarkan tujuh dokumen PRD di folder ini. React 19, TypeScript, Vite, Tailwind, Supabase, dan Midtrans. Desain dibuat dengan **Google Stitch** lalu diimplementasikan sebagai aplikasi yang dapat digunakan.

## Jalankan lokal

```sh
npm install
npm run dev
```

Buka **http://127.0.0.1:5173**. Workspace ini sekarang memakai Supabase melalui `.env.local`. Untuk demo lokal, ubah `VITE_DATA_MODE=demo` dan jalankan ulang dev server. Demo memiliki dua toko, produk, pesanan, dan saldo simulasi yang disimpan di browser; jangan masukkan KTP atau rekening asli dalam mode demo.

```sh
npm test           # aturan bisnis dan idempotensi
npm run test:db    # migrasi + RLS + transaksi dalam PostgreSQL PGlite
npm run check:edge # typecheck lima Supabase Edge Functions
npm run test:edge  # signature, status pembayaran, ukuran request, CORS
npm run build     # build produksi ke dist/
```

## Fitur

- Dashboard gabungan/per toko, periode laporan, grafik dan produk terlaris.
- Multi-toko dengan kuota Rintis 1, Tumbuh 2, Skala 3; downgrade tidak menghapus data.
- Produk, foto, varian, stok, arsip, pencarian, kategori, impor/ekspor CSV.
- Editor drag-and-drop, tema, warna/font/logo, autosave, preview, publish dan riwayat versi.
- Storefront, katalog, detail produk, keranjang, checkout dan pelacakan privat.
- Pesanan, tahapan pengiriman, resi, cetak invoice/label melalui dialog cetak atau Save as PDF.
- Saldo gabungan, kontribusi per toko, riwayat, permintaan penarikan dan pemeriksaan rekening.
- Adaptor Supabase untuk OTP, database dengan RLS, storage privat KTP, Realtime, checkout dan webhook.

## Status dan aktivasi

**Web sudah online:** https://kioskuapp.netlify.app. Tombol Publish membuat project Netlify per toko dengan alamat `.netlify.app` dan memakai kembali alamat tersebut untuk pembaruan. Lihat [panduan Netlify](docs/deployment/NETLIFY.md).

**Supabase sudah terhubung** ke proyek `mbackiawysjbjvqlntfs`: 14 tabel dengan RLS, tiga bucket, delapan tabel Realtime dan lima Edge Functions sudah dipasang. Build memakai konfigurasi cloud asli. Atas permintaan pemilik, verifikasi email/OTP sementara dinonaktifkan: daftar dengan nama, email dan password langsung masuk dashboard; login memakai email/password. Provider pembayaran, scheduler, SMTP/SMS dan domain sendiri belum aktif. Detail dan bukti ada di [catatan koneksi Supabase](docs/deployment/SUPABASE.md).

- [Panduan Supabase, pembayaran dan deployment](docs/SETUP.md)
- [Hasil pemeriksaan dan batas implementasi](docs/IMPLEMENTATION.md)
- [Catatan kelanjutan proyek](HANDOFF.md)
- [Proyek desain Stitch](https://stitch.withgoogle.com/projects/3226115365701511664)
- Ekspor asli Stitch: `stitch_kiosku_multi_store_saas.zip` dan `design/stitch/export/`.

Tujuh dokumen PRD asli tetap dipertahankan. Status implementasi dicatat terpisah agar spesifikasi awal tidak tertimpa.
