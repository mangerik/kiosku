# MVP Scope: Kiosku.id

## Prinsip Penentuan Scope

MVP fokus membuktikan **dua hal sekaligus**:
1. Produk toko online yang lengkap dan bisa dipakai (baseline setara Shopify)
2. Diferensiasi multi-toko satu akun benar-benar mengurangi friksi (bukan sekadar UI dashboard yang menampilkan banyak toko)

Fitur yang tidak menguji dua hal di atas didorong ke Fase 2/3.

---

## 1. Matriks Fitur

| Modul | Fitur | MVP | Fase 2 | Fase 3 |
|---|---|:---:|:---:|:---:|
| Akun | Registrasi & login (email/HP + OTP) | ✅ | | |
| Akun | Verifikasi KTP & rekening bank | ✅ | | |
| Akun | Multi-toko (hingga 3 toko sesuai tier) | ✅ | | |
| Akun | Tambah toko à la carte (di luar tier tetap) | | ✅ | |
| Akun | Role & multi-user per akun (staff/admin toko) | | | ✅ |
| Storefront Builder | Drag-and-drop section (banner, produk, teks) | ✅ | | |
| Storefront Builder | Tema siap pakai (pilih & kustom warna/font) | ✅ | | |
| Storefront Builder | Custom domain per toko | | ✅ | |
| Storefront Builder | Custom code/CSS injection | | | ✅ |
| Katalog | CRUD produk & varian | ✅ | | |
| Katalog | Bulk import/export CSV | ✅ | | |
| Katalog | Kategori & koleksi produk | ✅ | | |
| Katalog | Bundling/paket produk | | ✅ | |
| Pesanan | Dashboard status pesanan | ✅ | | |
| Pesanan | Cetak invoice & label | ✅ | | |
| Pesanan | Integrasi cek ongkir real-time | | ✅ | |
| Pesanan | Tracking otomatis dari kurir | | ✅ | |
| Pembayaran | QRIS, transfer bank manual | ✅ | | |
| Pembayaran | E-wallet & kartu kredit (via gateway) | | ✅ | |
| Pembayaran | Saldo & penarikan terpusat per akun | ✅ | | |
| Langganan | 3 tier tetap (Rintis/Tumbuh/Skala) | ✅ | | |
| Langganan | Tier Custom (4+ toko) | | ✅ | |
| Dashboard | Analitik dasar (penjualan, produk terlaris) | ✅ | | |
| Dashboard | Analitik lanjutan (funnel, retensi pelanggan) | | | ✅ |
| Platform | Web responsif | ✅ | | |
| Platform | Aplikasi mobile (Capacitor) | | | ✅ |
| Ekosistem | App/plugin pihak ketiga | | | ✅ |

---

## 2. Daftar Halaman/Layar MVP

### Area Merchant (Dashboard)
1. Login / Register / OTP
2. Onboarding wizard (buat toko pertama)
3. Verifikasi identitas (KTP, rekening)
4. Dashboard ringkasan akun (semua toko)
5. Pilih toko aktif / switch toko
6. Storefront builder (editor drag-and-drop)
7. Manajemen tema
8. Manajemen produk (list, tambah, edit, import CSV)
9. Manajemen pesanan (list, detail, ubah status)
10. Halaman saldo & riwayat transaksi
11. Halaman langganan & upgrade paket
12. Halaman tambah toko baru
13. Pengaturan toko (subdomain, kontak, kebijakan)
14. Analitik per toko

### Area Publik (Storefront)
1. Halaman utama toko
2. Halaman katalog/produk
3. Halaman detail produk
4. Keranjang belanja
5. Checkout
6. Halaman konfirmasi pesanan
7. Halaman lacak pesanan (status dasar)

---

## 3. Non-Goals MVP (Ditegaskan Agar Tidak Scope Creep)

- Tidak ada marketplace lintas toko (pencarian produk lintas seller)
- Tidak ada fitur dropship/supply produk dari Kiosku.id
- Tidak ada custom domain (masih subdomain `.kiosku.id`)
- Tidak ada aplikasi mobile native
- Tidak ada multi-user/staff role dalam satu toko (pemilik akun = satu-satunya pengelola)

## 4. Kriteria Keluar dari MVP (Definition of Done)

- Pengguna baru bisa daftar → verifikasi → buat toko pertama → tambah produk → toko live dalam satu sesi tanpa bantuan manual
- Pengguna existing bisa tambah toko kedua dalam < 2 menit tanpa verifikasi ulang
- Transaksi end-to-end (checkout pelanggan → dana masuk saldo akun) berjalan tanpa intervensi manual
- Dashboard analitik menampilkan data real (bukan dummy) untuk minimal 2 toko berbeda dalam satu akun
