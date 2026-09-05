# Tasks Breakdown: Kiosku.id

Format: `[ ]` belum, `[x]` selesai. Dikelompokkan per modul, urutan pengerjaan disarankan dari atas ke bawah.

## 1. Setup & Infrastruktur
- [ ] Init project React + Vite + Tailwind
- [ ] Setup project Supabase (Postgres, Auth, Storage)
- [ ] Konfigurasi wildcard subdomain routing (`*.kiosku.id`)
- [ ] Setup environment (dev/staging/prod)
- [ ] Setup CI/CD dasar (build & deploy otomatis)

## 2. Autentikasi & Akun
- [ ] Halaman register/login (email/HP)
- [ ] Integrasi OTP via Supabase Auth
- [ ] Skema tabel `accounts`
- [ ] Form input verifikasi KTP & rekening bank
- [ ] Upload dokumen verifikasi ke Supabase Storage
- [ ] Status verifikasi (belum/menunggu/terverifikasi)
- [ ] RLS policy dasar untuk tabel `accounts`

## 3. Manajemen Multi-Toko
- [ ] Skema tabel `stores`
- [ ] Wizard "Buat Toko Pertama" (nama, subdomain, tema)
- [ ] Validasi ketersediaan subdomain real-time
- [ ] Halaman "Tambah Toko" dengan pengecekan kuota tier
- [ ] Edge Function enforcement kuota toko
- [ ] Dashboard switch antar toko
- [ ] Handling toko nonaktif akibat downgrade tier

## 4. Storefront Builder
- [ ] Desain struktur `layout_json` (skema blok/section)
- [ ] Skema tabel `store_layouts` (draft & published)
- [ ] Komponen editor drag-and-drop (kanvas + panel komponen)
- [ ] Komponen tiap jenis section (hero banner, produk unggulan, teks, testimoni, dll)
- [ ] Panel properti untuk edit konten per section
- [ ] Fungsi reorder section (drag naik/turun)
- [ ] Autosave draft
- [ ] Tombol "Preview" (render mode read-only di tab baru)
- [ ] Tombol "Publish" (copy draft → published, invalidasi cache)
- [ ] Pilihan tema siap pakai + kustomisasi warna/font/logo

## 5. Manajemen Katalog Produk
- [ ] Skema tabel `products` dan `product_variants`
- [ ] CRUD produk (form tambah/edit)
- [ ] Upload multi-gambar produk
- [ ] Manajemen varian & stok per varian
- [ ] Fitur kategori/koleksi produk
- [ ] Import/export CSV produk
- [ ] Validasi stok otomatis berkurang saat order masuk

## 6. Manajemen Pesanan
- [ ] Skema tabel `orders` dan `order_items`
- [ ] Dashboard list pesanan dengan filter status
- [ ] Halaman detail pesanan
- [ ] Update status pesanan (baru → diproses → dikirim → selesai)
- [ ] Generate invoice & label pengiriman (PDF)
- [ ] Notifikasi otomatis ke pelanggan saat status berubah

## 7. Pembayaran & Saldo
- [ ] Integrasi payment gateway (QRIS, transfer bank manual dulu untuk MVP)
- [ ] Edge Function webhook konfirmasi pembayaran + verifikasi signature
- [ ] Skema tabel `wallet_transactions`
- [ ] Halaman saldo akun (total gabungan + breakdown per toko)
- [ ] Form & proses penarikan dana
- [ ] Validasi rekening terverifikasi sebelum penarikan

## 8. Langganan & Billing
- [ ] Skema tabel `subscriptions`
- [ ] Halaman pilih/upgrade paket (Rintis/Tumbuh/Skala)
- [ ] Logika kalkulasi kuota toko sesuai tier
- [ ] Notifikasi saat kuota toko hampir/sudah penuh
- [ ] Flow downgrade tier & nonaktifkan toko kelebihan

## 9. Dashboard Analitik
- [ ] Ringkasan performa gabungan semua toko
- [ ] Drill-down analitik per toko (penjualan, produk terlaris)
- [ ] Grafik tren pendapatan (harian/mingguan/bulanan)

## 10. Storefront Publik (Customer-Facing)
- [ ] Resolusi subdomain → `store_id` di frontend
- [ ] Render halaman toko dari `layout_json` published
- [ ] Halaman katalog & pencarian/filter produk
- [ ] Halaman detail produk
- [ ] Keranjang belanja (state management)
- [ ] Alur checkout & pilih metode pembayaran
- [ ] Halaman konfirmasi & lacak status pesanan
- [ ] Optimasi SEO dasar (meta tag per toko/produk)

## 11. Keamanan & RLS
- [ ] RLS policy lengkap untuk semua tabel operasional toko (join ke `stores.account_id`)
- [ ] Endpoint terbatas (anon key) untuk akses storefront publik
- [ ] Audit trail versi `layout_json`
- [ ] Rate limiting endpoint publik (checkout, OTP)

## 12. QA & Launch
- [ ] Testing end-to-end: onboarding → buat toko → tambah produk → publish
- [ ] Testing end-to-end: tambah toko kedua tanpa verifikasi ulang
- [ ] Testing end-to-end: checkout pelanggan → dana masuk saldo akun
- [ ] Testing beban (load testing) untuk skenario banyak toko per akun
- [ ] Review keamanan RLS & webhook payment
- [ ] Soft launch dengan beberapa UMKM pilot
