# Architecture: Kiosku.id

## 1. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Frontend (Dashboard Merchant) | React + Vite + Tailwind CSS | Cepat, familiar, ekosistem luas |
| Frontend (Storefront Publik) | React + Vite (SSR/prerender dipertimbangkan untuk SEO) | Perlu SEO-friendly untuk halaman toko publik |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | Auth + DB + Storage dalam satu platform, mempercepat MVP |
| Payment Gateway | Midtrans / Xendit (evaluasi biaya & dukungan QRIS) | Dukungan metode pembayaran lokal lengkap |
| Mobile (fase depan) | Capacitor | Reuse codebase React untuk wrapper mobile |
| Desktop (fase depan) | Electron | Reuse codebase React untuk dashboard desktop |
| Hosting Frontend | Vercel/Netlify (dengan wildcard subdomain routing) | Mendukung multi-toko via subdomain |

---

## 2. Arsitektur Sistem (High-Level)

```
                    ┌─────────────────────────┐
                    │   Dashboard Merchant     │
                    │  (React SPA - Vite)      │
                    └───────────┬─────────────┘
                                │ REST/RPC via Supabase Client
                                ▼
                    ┌─────────────────────────┐
                    │   Supabase Backend       │
                    │  - Postgres (RLS)        │
                    │  - Auth                  │
                    │  - Storage (gambar)      │
                    │  - Edge Functions        │
                    │    (webhook payment,     │
                    │     kalkulasi kuota)     │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                                     ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │  Storefront Publik   │              │  Payment Gateway     │
   │  *.kiosku.id         │              │  (Midtrans/Xendit)   │
   │  (routing berdasarkan │              │  webhook → Edge Fn   │
   │   subdomain → store_id)│             └─────────────────────┘
   └─────────────────────┘
```

**Routing subdomain:** wildcard DNS (`*.kiosku.id`) diarahkan ke satu aplikasi frontend yang membaca `window.location.hostname`, mengekstrak subdomain, lalu query `store_id` yang cocok untuk merender konten toko yang tepat.

---

## 3. Skema Database (Konsep)

### Tabel Level Akun (shared, tidak bergantung toko)
```
accounts
  - id (uuid, PK)
  - email / phone
  - status_verifikasi (enum: belum, menunggu, terverifikasi)
  - ktp_url, rekening_bank
  - subscription_tier (enum: rintis, tumbuh, skala, custom)
  - saldo_balance (numeric)
  - created_at

wallet_transactions
  - id (uuid, PK)
  - account_id (FK → accounts)
  - store_id (FK → stores, nullable — untuk breakdown per toko)
  - type (enum: masuk, penarikan)
  - amount
  - status
  - created_at

subscriptions
  - id (uuid, PK)
  - account_id (FK → accounts)
  - tier
  - store_quota (int)
  - billing_cycle (harian)
  - status (aktif, kadaluarsa)
```

### Tabel Level Toko (isolated per store_id)
```
stores
  - id (uuid, PK)
  - account_id (FK → accounts)
  - name, subdomain (unique)
  - theme_id (FK → themes)
  - status (draft, live, nonaktif)
  - created_at

store_layouts   -- untuk storefront builder
  - id (uuid, PK)
  - store_id (FK → stores)
  - layout_json (jsonb)   -- struktur blok drag-and-drop
  - is_published (bool)
  - version

products
  - id (uuid, PK)
  - store_id (FK → stores)
  - name, description, price, category
  - images (array/jsonb)

product_variants
  - id (uuid, PK)
  - product_id (FK → products)
  - name (mis. "Merah - L")
  - stock, price_override

orders
  - id (uuid, PK)
  - store_id (FK → stores)
  - customer_info (jsonb)
  - status (baru, diproses, dikirim, selesai, batal)
  - total_amount
  - payment_status

order_items
  - id (uuid, PK)
  - order_id (FK → orders)
  - product_variant_id (FK → product_variants)
  - qty, price
```

**Prinsip kunci:** `account_id` hanya muncul di tabel `accounts`, `wallet_transactions`, dan `subscriptions`. Semua tabel operasional toko (`products`, `orders`, `store_layouts`, dst.) menyertakan `store_id`, tidak pernah langsung `account_id` — relasi ke akun selalu ditelusuri lewat `stores.account_id`.

---

## 4. Desain Storefront Builder (Drag & Drop)

Layout toko disimpan sebagai **JSON berbasis blok**, bukan HTML statis, supaya:
- Bisa di-render ulang di frontend dashboard (mode edit) maupun storefront publik (mode tampil)
- Mudah divalidasi/disanitasi sebelum publish
- Mendukung versioning (draft vs published)

Contoh struktur `layout_json`:
```json
{
  "sections": [
    { "id": "banner-1", "type": "hero_banner", "props": { "image": "...", "text": "..." } },
    { "id": "produk-1", "type": "featured_products", "props": { "product_ids": ["...", "..."] } },
    { "id": "testimoni-1", "type": "testimonial", "props": { "items": [...] } }
  ]
}
```

- **Editor (dashboard):** komponen React yang me-render setiap `type` section dalam mode editable (bisa di-drag reorder, klik untuk edit props)
- **Renderer (storefront publik):** komponen React yang sama, tapi me-render dalam mode read-only berdasarkan `layout_json` yang `is_published = true`
- Reorder = update urutan array `sections`, disimpan sebagai draft sebelum "Publish" menyalin draft → versi published

---

## 5. Multi-Tenancy & Keamanan Data

- Menggunakan **Row Level Security (RLS)** Supabase:
  - Policy di tabel `stores`: hanya bisa diakses jika `account_id = auth.uid()` (atau melalui akun yang memiliki toko tsb)
  - Policy di tabel operasional (`products`, `orders`, dst.): join ke `stores` untuk memastikan `store.account_id = auth.uid()`
  - Storefront publik (pelanggan) mengakses lewat endpoint terbatas (anon key) yang hanya boleh `SELECT` produk & submit order untuk toko yang `status = live`
- Isolasi ini memastikan **toko A tidak bisa diakses lewat kredensial toko B**, meski satu pemilik akun

---

## 6. Enforcement Kuota Toko

- Saat request "Tambah Toko": Edge Function mengecek `COUNT(stores WHERE account_id = X)` dibanding `subscriptions.store_quota`
- Jika melebihi kuota → request ditolak dengan kode error spesifik, frontend menampilkan modal upgrade (bukan pesan error generik)
- Downgrade tier saat toko aktif melebihi kuota baru → toko kelebihan otomatis diset `nonaktif` (bukan dihapus), pemilik bisa reaktivasi setelah upgrade lagi

---

## 7. Pertimbangan Non-Fungsional

| Aspek | Pendekatan |
|---|---|
| Skalabilitas | Partitioning `orders`/`products` per `store_id` sudah alami lewat indexing FK; monitor performa index seiring jumlah toko bertambah |
| Performa storefront publik | Cache `layout_json` published + katalog produk (CDN/edge cache), invalidasi saat publish baru |
| Keamanan pembayaran | Webhook payment gateway diverifikasi signature-nya di Edge Function sebelum update `orders.payment_status` |
| Audit trail | Setiap perubahan `layout_json` disimpan sebagai versi baru (bukan overwrite), memudahkan rollback |
