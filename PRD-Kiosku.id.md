# PRD: Kiosku.id
**Platform Toko Online Multi-Toko untuk UMKM Indonesia**

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Status** | Draft |
| **Kategori** | SaaS E-Commerce Platform |

---

## 1. Ringkasan Eksekutif

Kiosku.id adalah platform pembuatan toko online (storefront builder) untuk UMKM Indonesia, setara secara fungsional dengan Shopify — mencakup store builder, manajemen produk, manajemen pesanan, pembayaran, dan tema toko yang dapat dikustomisasi penuh.

Diferensiasi utama Kiosku.id dibanding kompetitor lokal (yang umumnya menerapkan model 1 akun = 1 toko) adalah **model Multi-Toko dalam Satu Akun**: satu pengguna dapat mengelola beberapa toko/brand berbeda (masing-masing dengan subdomain, katalog, pesanan, dan tampilan sendiri-sendiri) tanpa perlu registrasi ulang, verifikasi ulang, atau langganan terpisah per toko.

---

## 2. Latar Belakang & Masalah

### 2.1 Masalah yang Diamati
Banyak pelaku UMKM di Indonesia menjalankan lebih dari satu lini usaha (misalnya jualan fashion sekaligus makanan, atau memisahkan brand retail dan grosir). Pada platform toko online konvensional, ini menimbulkan friksi:

1. **Registrasi berulang** — setiap toko baru butuh akun baru
2. **Verifikasi berulang** — KTP dan rekening bank harus diverifikasi ulang di tiap akun
3. **Keuangan tercecer** — saldo dan penarikan dana terpisah per toko, menyulitkan rekonsiliasi
4. **Biaya berlipat** — langganan dibayar per toko, bukan per pemilik usaha

### 2.2 Peluang
Dengan menyatukan lapisan identitas (akun, saldo, verifikasi, langganan) sambil tetap mengisolasi lapisan operasional toko (katalog, pesanan, tema), Kiosku.id dapat menjadi pilihan utama bagi UMKM yang sedang bertumbuh dan melakukan ekspansi lini produk — sekaligus menciptakan *upsell trigger* alami (upgrade paket saat butuh toko tambahan).

---

## 3. Visi & Tujuan Produk

**Visi:** Menjadi platform toko online paling praktis bagi UMKM Indonesia yang mengelola lebih dari satu usaha sekaligus.

**Tujuan Utama:**
- Menyediakan tools toko online selengkap Shopify (store builder, katalog, order, pembayaran)
- Menghilangkan friksi administratif saat pemilik usaha membuka toko kedua/ketiga
- Menciptakan model monetisasi yang jelas dan mudah dipahami (berbasis kuota toko)

---

## 4. Target Pengguna

### Persona 1: "Pemilik Usaha Berkembang"
- UMKM yang sudah punya 1 toko online, mulai ekspansi ke lini produk baru
- Butuh: efisiensi administrasi, keuangan yang tetap rapi meski toko bertambah

### Persona 2: "Pemilik Multi-Brand"
- Menjalankan beberapa brand berbeda secara paralel (mis. reseller sekaligus produsen sendiri)
- Butuh: identitas brand terpisah (tampilan, subdomain) tapi backend operasional yang efisien

### Persona 3: "UMKM Pemula"
- Baru mulai jualan online, satu toko saja
- Butuh: platform gratis/murah, mudah dipakai, siap upgrade saat bisnis tumbuh

---

## 5. Lingkup Produk

### 5.1 Termasuk dalam Lingkup (In-Scope)
- Manajemen akun & multi-toko
- Storefront builder & tema
- Manajemen katalog produk
- Manajemen pesanan & fulfillment
- Sistem pembayaran & saldo terpusat
- Sistem langganan berbasis kuota toko
- Dashboard analitik per toko & gabungan
- Halaman toko publik (customer-facing)

### 5.2 Tidak Termasuk (Out-of-Scope untuk v1)
- Marketplace pihak ketiga (Kiosku.id bukan tempat jualan bersama, tiap toko berdiri sendiri)
- Dropshipping/supply produk dari platform
- Aplikasi mobile native (v1 fokus web responsif)
- Integrasi logistik pihak ketiga tingkat lanjut (fase berikutnya)

---

## 6. Fitur Utama

### 6.1 Manajemen Akun & Multi-Toko *(Fitur Pembeda Utama)*
- Satu akun (`account_id`) dapat memiliki 1–N toko (`store_id`)
- Verifikasi identitas (KTP, NPWP opsional, rekening bank) dilakukan sekali di level akun, berlaku untuk semua toko
- Saldo dan penarikan dana digabung di level akun (satu dompet, satu jadwal pencairan)
- Langganan berlaku di level akun; kuota jumlah toko ditentukan oleh tier langganan
- Tambah toko baru: instan aktif tanpa proses approval manual, selama masih dalam kuota

### 6.2 Storefront Builder
- Editor drag-and-drop untuk menyusun halaman toko (banner, section produk, testimoni, dll)
- Pilihan tema siap pakai + kustomisasi warna, font, logo per toko
- Setiap toko punya subdomain sendiri (`namatoko.kiosku.id`) dengan opsi custom domain (fase 2)
- Preview real-time sebelum publish

### 6.3 Manajemen Katalog Produk
- CRUD produk: nama, deskripsi, harga, foto, kategori
- Varian produk (ukuran, warna, dll) dengan stok per varian
- Bulk import/export produk (CSV)
- Manajemen stok otomatis berkurang saat pesanan masuk

### 6.4 Manajemen Pesanan & Fulfillment
- Dashboard pesanan per toko dengan status (baru, diproses, dikirim, selesai, dibatalkan)
- Cetak label pengiriman & invoice
- Riwayat pesanan pelanggan
- Notifikasi otomatis ke pembeli saat status berubah

### 6.5 Pembayaran & Saldo
- Integrasi payment gateway (transfer bank, e-wallet, QRIS, kartu kredit)
- Saldo terpusat di level akun (bukan per toko)
- Riwayat transaksi & laporan keuangan gabungan maupun per toko
- Jadwal penarikan dana (harian/mingguan, sesuai tier)

### 6.6 Langganan Berbasis Kuota Toko
Diadaptasi dari model referensi awal, dengan penyesuaian nama tier:

| Paket | Harga | Kuota Toko | Catatan |
|---|---|---|---|
| Rintis | Rp0 | 1 toko | Gratis selamanya, fitur inti lengkap |
| Tumbuh | Rp5.000/hari | 2 toko | Cocok untuk ekspansi lini kedua |
| Skala | Rp16.600/hari | 3 toko | Untuk pemilik multi-brand aktif |
| Custom | Sesuai kebutuhan | 4+ toko | Enterprise/reseller besar (fase 2) |

### 6.7 Dashboard Analitik
- Ringkasan performa gabungan semua toko (untuk pemilik akun)
- Drill-down analitik per toko (penjualan, produk terlaris, traffic)
- Grafik tren pendapatan harian/mingguan/bulanan

### 6.8 Halaman Toko Publik (Customer-Facing)
- Katalog produk dengan pencarian & filter
- Keranjang belanja & checkout
- Halaman profil toko (tentang, kontak, kebijakan)
- Responsif mobile-first

---

## 7. Arsitektur & Model Data (Level Konsep)

Prinsip inti: **shared di level akun, isolated di level toko.**

```
Account (1)
 ├─ account_id
 ├─ saldo (shared)
 ├─ status_verifikasi (shared)
 ├─ subscription_tier (shared, menentukan kuota toko)
 │
 └─ Store (1..N, dibatasi kuota tier)
     ├─ store_id
     ├─ account_id (FK)
     ├─ subdomain
     ├─ tema/tampilan
     ├─ Products (N)
     ├─ Orders (N)
     └─ Store Analytics
```

**Implikasi desain:**
- Hampir semua tabel operasional (produk, pesanan, tema) menyertakan `store_id` sebagai foreign key
- Tabel saldo, verifikasi, dan langganan hanya menyertakan `account_id`, tidak bergantung pada toko manapun
- Query dashboard gabungan perlu agregasi lintas `store_id` yang dimiliki satu `account_id`

---

## 8. Alur Pengguna Utama (User Journeys)

### 8.1 Onboarding Pengguna Baru
1. Daftar akun (email/HP) → verifikasi OTP
2. Isi data verifikasi (KTP, rekening bank)
3. Buat toko pertama (nama, subdomain, pilih tema)
4. Tambah produk pertama
5. Toko live, siap terima pesanan

### 8.2 Menambah Toko Kedua
1. Pemilik akun klik "Tambah Toko" dari dashboard
2. Sistem cek kuota tier langganan
3. Jika kuota cukup → toko baru langsung aktif (tanpa approval)
4. Jika kuota penuh → diarahkan ke halaman upgrade paket
5. Isi nama toko, subdomain baru, tema → toko kedua live

### 8.3 Alur Pembelian Pelanggan
1. Pelanggan mengakses `namatoko.kiosku.id`
2. Browsing katalog → tambah ke keranjang
3. Checkout → pilih metode pembayaran
4. Pembayaran masuk ke saldo akun pemilik toko
5. Pemilik toko memproses & mengirim pesanan

---

## 9. Kebutuhan Non-Fungsional

- **Skalabilitas:** arsitektur multi-tenant harus mendukung pertumbuhan jumlah toko per akun tanpa migrasi skema
- **Keamanan:** isolasi data antar toko meski satu akun — toko A tidak boleh mengakses data toko B walau pemilik sama, kecuali lewat dashboard gabungan resmi
- **Performa:** waktu muat halaman toko publik < 2 detik
- **Ketersediaan:** uptime target 99.5%
- **Kepatuhan:** penyimpanan data KTP/rekening mengikuti standar keamanan data pribadi yang berlaku di Indonesia

---

## 10. Lingkup MVP vs Fase Selanjutnya

### MVP (Fase 1)
- Manajemen akun & multi-toko (hingga 3 toko)
- Storefront builder dasar (tema siap pakai, tanpa custom domain)
- Katalog, pesanan, pembayaran dasar (transfer bank + QRIS)
- Dashboard analitik dasar

### Fase 2
- Custom domain per toko
- Tier Custom untuk 4+ toko
- Integrasi logistik otomatis (cek ongkir, tracking)
- Aplikasi mobile
- App ecosystem/plugin pihak ketiga

---

## 11. Metrik Keberhasilan (KPI)

- Jumlah akun terdaftar & rasio aktivasi toko pertama
- Tingkat konversi Free → Tumbuh/Skala (upgrade karena butuh toko tambahan)
- Rata-rata jumlah toko per akun aktif
- Gross Merchandise Value (GMV) per toko dan gabungan
- Churn rate langganan bulanan

---

## 12. Risiko & Asumsi

| Risiko | Mitigasi |
|---|---|
| Kompleksitas backend multi-tenant meningkatkan waktu pengembangan | Rancang skema `store_id`/`account_id` sejak awal, hindari refactor besar di tengah jalan |
| Kanibalisasi harga (user pilih Free terus) | Batasi fitur non-kuota (mis. analitik lanjutan) di tier berbayar sebagai insentif tambahan |
| Kebingungan pengguna soal "1 saldo untuk banyak toko" | UI wajib menampilkan breakdown saldo per toko meski penarikan digabung |

**Asumsi:** Target pasar sudah familiar dengan konsep toko online dasar, sehingga fokus edukasi onboarding ada pada konsep multi-toko, bukan konsep e-commerce itu sendiri.

---

## 13. Pertanyaan Terbuka

- Apakah subdomain gratis (`.kiosku.id`) cukup untuk MVP, atau custom domain perlu masuk lebih awal karena ekspektasi brand UMKM?
- Perlu integrasi payment gateway pihak ketiga (Midtrans/Xendit) atau bangun sendiri untuk margin lebih baik?
- Apakah kuota toko sebaiknya bisa ditambah à la carte (bayar per toko ekstra) selain lewat tier tetap?
