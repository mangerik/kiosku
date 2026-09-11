# Status implementasi — 3 September 2026

## Dasar pekerjaan

Semua tujuh dokumen asli telah dibaca: README-Kiosku.id.md, PRD-Kiosku.id.md, MVP-Scope-Kiosku.id.md, Architecture-Kiosku.id.md, Tasks-Kiosku.id.md, User-Journey-Kiosku.id.md dan Project-Content-Kiosku.id.md. Scope mengikuti MVP; fitur fase berikutnya tidak ditampilkan seolah sudah aktif.

Desain dibuat di Google Stitch: lima screen merchant/dashboard, produk, builder, saldo dan storefront; termasuk design system. Ekspor asli 5,6 MB ada di root, dengan HTML/screenshot/design system di `design/stitch/export/`. Aplikasi React menerapkan desain forest green, mint, Plus Jakarta Sans dan sidebar merchant; berkas HTML Stitch digunakan sebagai referensi, bukan iframe pengganti aplikasi.

## Implementasi

| Area       | Hasil                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | Daftar langsung nama/email/password, login password; OTP disembunyikan sementara atas permintaan pemilik; demo terpisah                      |
| Identitas  | KTP privat, rekening, pengajuan menunggu, pemeriksaan operator dengan audit, gate penarikan                                                  |
| Toko       | Wizard, validasi slug, kuota server, switch toko, tier dan penonaktifan tanpa hapus                                                          |
| Builder    | Empat jenis section, seret dan tombol urutan, properti, tema, logo, autosave, preview, publish, versi                                        |
| Produk     | CRUD/arsip, multi-foto, varian/harga/stok, kategori, filter, pagination, impor/ekspor CSV                                                    |
| Pesanan    | Daftar/detail/status/resi, invoice dan label lewat cetak/Save as PDF, histori kejadian                                                       |
| Storefront | Published layout, katalog/filter/sort, produk/varian, cart, checkout, link pelacakan privat, meta toko/produk                                |
| Pembayaran | Transfer/QRIS langsung milik toko, bukti privat, konfirmasi atau penolakan manual oleh pemilik                                               |
| Saldo      | Pembayaran manual tidak masuk saldo platform; riwayat lama tetap dapat dibaca                                                                |
| Langganan  | Prabayar 30 hari, server menentukan harga, aktivasi webhook, quota downgrade/expiry                                                          |
| Analitik   | Angka dihitung dari pesanan pada workspace, gabungan/per toko, tren harian 7/30 hari, mingguan 90 hari, bulanan 365 hari dan produk terlaris |
| Backend    | Migrasi SQL, RLS, private storage, RPC transaksi, Edge Functions, outbox email, Realtime                                                     |
| Hosting    | Satu aplikasi SPA; storefront memakai route internal berdasarkan slug                                                                        |

## Pemeriksaan yang dijalankan

- `npm test`: **8 tes lulus**, mencakup akses toko, stok, retry checkout, settlement, penarikan, tier, pemisahan draft/publish dan transisi pesanan.
- `npm run test:edge`: pemeriksaan helper pembayaran dan request Edge.
- `npm run test:db`: pemeriksaan migrasi, RLS, storefront, checkout/stok, token tracking, langganan, serta pembayaran langsung tanpa kredit saldo platform.
- Typecheck Deno mencakup checkout, bukti pembayaran, billing, webhook langganan, dan maintenance.
- `npm run build`: TypeScript dan production build lulus. Build mode Supabase dengan placeholder konfigurasi juga lulus di `.artifacts/cloud-build`; tidak mengakses backend sungguhan dan bukan build untuk deployment.
- Browser desktop: landing, dashboard, produk tambah/filter, storefront, cart/checkout, simulasi bayar, saldo, draft dan publish.
- Checkout nyata di **demo lokal**: produk Rp25.000 + ongkir Rp15.000 menghasilkan pesanan Rp40.000; simulasi lunas menambah saldo tepat Rp40.000 dan stok berkurang.
- Draft banner baru tidak tampil publik sebelum publish; setelah publish, judul storefront berubah sesuai draft.
- Browser Chrome pada **390 × 844**: landing, dashboard, menu, kuota, upgrade, wizard, produk dan publish. Angka KPI yang semula terpotong sudah diperbaiki. Toko ketiga `Studio Rona` berhasil dibuat tanpa verifikasi ulang, diisi satu produk dan berstatus Aktif setelah publish.

## Batas yang masih memerlukan lingkungan eksternal

- Proyek Supabase `mbackiawysjbjvqlntfs` sudah dihubungkan. Daftar/login password langsung sudah diuji; OTP sementara disembunyikan atas permintaan pemilik. Migrasi pembayaran manual terbaru masih perlu diterapkan oleh pemilik ke proyek tersebut.
- Midtrans server key/sandbox transaction dan rekening penerimaan platform belum tersedia. QRIS sungguhan, webhook provider dan rekonsiliasi bank live belum diuji.
- Verifikasi identitas memerlukan operator. Payout bank memerlukan transfer operator/provider; pencatatan `selesai` tidak melakukan transfer uang.
- Email outbox memerlukan provider dan scheduler yang aktif. Tidak ada email/SMS sungguhan dikirim selama pengujian ini.
- Domain produksi, wildcard DNS/TLS, load test dan soft launch UMKM belum dilaksanakan.
- Invoice/PDF memakai fitur cetak browser. Refund terbayar, verifikasi identitas otomatis, payout otomatis, custom domain, staf/multi-role dan logistik realtime belum diimplementasikan.

Karena syarat eksternal tersebut, Definition of Done untuk transaksi dan onboarding **produksi** belum dapat dinyatakan tercapai. Demo, source code, migrasi dan integrasi siap dilanjutkan mengikuti docs/SETUP.md.
