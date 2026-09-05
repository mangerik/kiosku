# Publikasi Netlify — 3 September 2026

Pembaruan katalog: toko QA kini bernama **Ruang Rona**, slug `ruang-rona-contoh`, dengan 8 produk, 23 varian, 9 foto di Supabase Storage, dan 4 bagian beranda. Seluruhnya data contoh. Alamat project toko tetap sama. Spesifikasi ada di `../examples/ruang-rona.json`, hasil verifikasi di `example-store.json`; snapshot sebelum perubahan disimpan di `.artifacts/backups/before-ruang-rona-20260903.json`. Perintah pemeriksaan terbaru: `node scripts/check-netlify-live.mjs ruang-rona-contoh`.

Project utama sudah berganti nama menjadi `kioskuapp` dengan site ID yang sama. `STOREFRONT_BUNDLE_URL`, `APP_URL`, dan `ALLOWED_ORIGINS` telah diselaraskan agar publish berfungsi kembali. Script deploy mengikuti site ID tersimpan sehingga tidak membuat ulang project hanya karena namanya berubah.

Frontend utama: https://kioskuapp.netlify.app. Tim Netlify `rekas-apriana`, paket Free. Metadata deployment ada di `netlify-main.json`.

Pengujian live berhasil dengan akun QA Uji Pendaftaran: membuat Toko Uji Netlify, menyimpan satu produk, publish, membuka storefront dan detail produk, lalu mengubah judul dan publish ulang. URL toko: https://kiosku-uji-netlify-0309-02ce7320c946422da87ec693c342e955.netlify.app. Kedua publish memakai site ID `e4eedc17-3b62-44b0-adb8-5a2b64b2e3fe` dan deploy ID `6a99276a080688007a8ca0c4`; jumlah deployment tetap satu. CORS checkout menerima origin toko ini dan menolak origin Netlify yang tidak terdaftar. Tidak ada pesanan atau pembayaran dibuat. Bukti pemeriksaan tersedia di `netlify-checks.json`; ulangi read-only dengan `node scripts/check-netlify-live.mjs uji-netlify-0309`.

## Alur merchant

Daftar/login, buat toko, tambahkan minimal satu produk aktif, lalu klik **Publish toko** di Tampilan toko. Edge Function `publish-store` memeriksa pemilik, kuota dan draft, membuat satu project Netlify, mengunggah bundle, menunggu deployment siap, lalu menerbitkan layout dan alamat toko.

Alamat memakai `kiosku-<20 karakter awal slug>-<UUID toko tanpa tanda hubung>.netlify.app`. UUID mencegah benturan nama; project dan alamat dipakai kembali. Mengubah isi toko tidak memerlukan deploy Netlify baru jika bundle aplikasi sama. Domain sendiri dan wildcard tidak diperlukan. Ini satu project Netlify per toko, bukan wildcard di bawah subdomain aplikasi utama.

Jika proses belum selesai, tombol **Cek status publish** melanjutkan pemeriksaan. Jika browser ditutup, buka editor dan cek status atau publish lagi. Draft diambil saat publish dimulai; perubahan draft selama deployment tetap tersimpan untuk publish berikutnya. Alamat publik baru ditampilkan sesudah Netlify siap. Storefront terikat pada UUID toko sehingga perubahan slug tidak memindahkan kepemilikan situs.

## Konfigurasi aktif

Secret berikut tersimpan di Supabase Edge Functions dan `supabase/.env.local` yang diabaikan Git:

- `NETLIFY_AUTH_TOKEN`: personal access token untuk publikasi; jangan gunakan awalan `VITE_`.
- `NETLIFY_TEAM_SLUG=rekas-apriana`.
- `STOREFRONT_BUNDLE_URL=https://kioskuapp.netlify.app/storefront.zip`.
- `APP_URL=https://kioskuapp.netlify.app`.
- `ALLOWED_ORIGINS`: alamat aplikasi utama dan kedua origin pengembangan lokal.

PAT dibuat melalui dashboard Netlify dengan masa berlaku **90 hari** (sekitar 2 Desember 2026). Perbarui token di secret Supabase dan file server lokal sebelum kedaluwarsa agar pembuatan/publish berikutnya tetap berjalan. Situs yang sudah aktif tidak bergantung pada token untuk menampilkan katalog.

Bundle ZIP publik hanya berisi build frontend dan public anon key Supabase; tidak mengandung secret server. Jika `STOREFRONT_BUNDLE_URL` kosong, fungsi menggunakan `deployment-assets/storefront.zip` dalam bucket privat Supabase. Bucket fallback sudah dibuat, tetapi belum diisi karena sumber aktif memakai URL Netlify.

## Memperbarui kode frontend

```sh
npm run bundle:storefront
node scripts/deploy-netlify-main.mjs
```

Script kedua menerbitkan `dist/` dan ZIP storefront pada project utama yang sama. Tunggu deployment Netlify berstatus `ready`. Toko menerima bundle baru pada publish berikutnya. Perubahan isi produk/layout tetap dibaca dari Supabase. Tidak ada Git auto-deploy yang dihubungkan.

Untuk perubahan Edge Function gunakan source `supabase/functions/` dan deploy `publish-store` serta fungsi lain yang berubah. Migrasi `202609030003_netlify.sql` sudah diterapkan live; baca SUPABASE.md sebelum `db push`. Checkout menerima CORS hanya untuk origin aplikasi dan alamat toko yang tercatat telah dipublikasikan.

Paket Free tetap tunduk pada kuota project, deployment, bandwidth dan kredit Netlify. Tidak ada upgrade paket atau metode pembayaran yang ditambahkan. Integrasi ini tidak mengaktifkan provider pembayaran.
