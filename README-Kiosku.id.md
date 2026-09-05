# Kiosku.id
**Platform Toko Online Multi-Toko untuk UMKM Indonesia**

## Ringkasan

Kiosku.id adalah SaaS pembuatan toko online setara Shopify (store builder drag-and-drop, katalog produk, manajemen pesanan, pembayaran) dengan diferensiasi utama: **satu akun bisa mengelola beberapa toko sekaligus** — satu saldo, satu verifikasi, satu langganan, tapi tiap toko punya subdomain, katalog, pesanan, dan tampilan sendiri-sendiri.

## Fitur Utama

- 🏬 **Multi-Toko Satu Akun** — kelola banyak toko tanpa daftar/verifikasi ulang
- 🎨 **Storefront Builder Drag & Drop** — susun halaman toko tanpa coding
- 📦 **Manajemen Katalog** — produk, varian, stok
- 🧾 **Manajemen Pesanan** — dari masuk sampai selesai
- 💳 **Pembayaran & Saldo Terpusat** — satu dompet untuk semua toko
- 📊 **Dashboard Analitik** — per toko maupun gabungan
- 💰 **Langganan Berbasis Kuota Toko** — Rintis, Tumbuh, Skala, Custom

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend & Database | Supabase (Postgres, Auth, Storage, Realtime) |
| Mobile (fase depan) | Capacitor |
| Desktop (fase depan) | Electron |
| Payment Gateway | Midtrans / Xendit (kandidat, lihat Architecture.md) |

## Struktur Dokumen Project

| Dokumen | Isi |
|---|---|
| [`PRD-Kiosku.id.md`](./PRD-Kiosku.id.md) | Product Requirements Document — visi, fitur, harga, KPI |
| [`MVP-Scope-Kiosku.id.md`](./MVP-Scope-Kiosku.id.md) | Rincian fitur MVP vs fase selanjutnya |
| [`User-Journey-Kiosku.id.md`](./User-Journey-Kiosku.id.md) | Alur pengguna detail per skenario |
| [`Architecture-Kiosku.id.md`](./Architecture-Kiosku.id.md) | Arsitektur sistem, skema database, desain multi-tenancy |
| [`Tasks-Kiosku.id.md`](./Tasks-Kiosku.id.md) | Breakdown task pengembangan per modul |
| [`Project-Content-Kiosku.id.md`](./Project-Content-Kiosku.id.md) | Copywriting landing page, onboarding, dan pricing |

## Status Project

📝 Tahap dokumentasi & perencanaan — belum masuk development.

## Model Bisnis Singkat

| Paket | Harga | Kuota Toko |
|---|---|---|
| Rintis | Rp0 | 1 toko |
| Tumbuh | Rp5.000/hari | 2 toko |
| Skala | Rp16.600/hari | 3 toko |
| Custom | Sesuai kebutuhan | 4+ toko |
