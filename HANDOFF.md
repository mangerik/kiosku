# Kelanjutan Kiosku

Workspace: `D:\kiosku`. Baca README.md dan docs/IMPLEMENTATION.md sebelum melanjutkan. Tujuh dokumen `*-Kiosku.id.md` adalah PRD asli. Preferensi pengguna: langsung kerjakan, minim pertanyaan, gunakan Google Stitch.

Desain: https://stitch.withgoogle.com/projects/3226115365701511664. Ekspor sumber dan screenshot ada di `design/stitch/export/`; frontend ada di `src/`.

Mode demo sepenuhnya lokal. Mode aktif sekarang Supabase: `.env.local` berisi URL dan public anon key proyek `mbackiawysjbjvqlntfs`. Tiga migrasi sudah diterapkan lewat SQL Editor, lima Edge Functions sudah deployed. Baca `docs/deployment/SUPABASE.md`, terutama langkah sinkronisasi riwayat sebelum memakai CLI db push. Seluruh otoritas akun, kuota, stok dan saldo ada di database/Edge. Jangan mengaktifkan simulasi pembayaran dalam mode Supabase atau memindahkan service key ke frontend. Provider pembayaran/email/SMS belum dihubungkan.

Frontend live: https://kioskuapp.netlify.app. Publish otomatis membuat satu project Netlify per toko; alamat memakai slug dan UUID, lalu tetap dipakai ulang. Tim `rekas-apriana`, paket Free. Secret ada di Supabase Edge dan file ignored `supabase/.env.local`, bukan frontend. Baca `docs/deployment/NETLIFY.md`: bundle storefront disajikan oleh situs utama, token Netlify berlaku 90 hari (sekitar 2 Desember 2026), dan pembaruan frontend memakai `npm run bundle:storefront` lalu `node scripts/deploy-netlify-main.mjs`. Jangan menyentuh project Netlify lain. Akun QA Uji Pendaftaran kini memiliki Toko Uji Netlify dan satu produk berlabel pengujian; bukan katalog pengguna.

Perintah verifikasi: `npm test`, `npm run test:db`, `npm run check:edge`, `npm run build`. Hindari `deno --node-modules-dir=auto` di root; konfigurasi `supabase/deno.json` menggunakan cache terpisah. Pada Windows jangan menjalankan `npm ci` saat Vite memegang native DLL; `npm install` cukup untuk setup normal.

Vite dev menggunakan port 5173, strict port. Jika sedang berjalan, gunakan server itu; jangan mematikan proses lain. Akses demo lewat landing → Lihat demo dashboard. Tombol daftar demo membuat workspace kosong dan mengganti data demo browser itu, dengan penjelasan eksplisit di UI.

Jika sisa usage Codex mendekati habis, pengguna telah meminta mencoba ZCode pada folder ini, lalu Claude Code CLI bila ZCode tidak dapat dibuka. Pada pemeriksaan awal, `claude` terpasang dan login; `zcode` tidak tersedia di PATH. Catatan ini menyiapkan konteks kelanjutan, bukan klaim bahwa handoff sudah dilakukan.

Untuk aktivasi eksternal ikuti docs/SETUP.md. Jangan menganggap pengujian lokal membuktikan transaksi/OTP/penarikan produksi. Simpan pekerjaan yang ada dan teruskan hanya langkah yang masih belum terverifikasi.

Pembaruan OTP: OTP/verifikasi email disembunyikan sementara. Supabase Confirm email OFF dan frontend default email/password (`VITE_AUTH_MODE=password`). Daftar dari web sudah diuji: nama/email/password menghasilkan akun dan langsung dashboard. Jangan aktifkan kembali konfirmasi tanpa permintaan pengguna. Verifikasi identitas/rekening tidak termasuk perubahan ini.

Permintaan terbaru mengisi toko contoh sudah dilaksanakan pada toko QA yang sama: nama sekarang Ruang Rona, slug `ruang-rona-contoh`, 8 produk/23 varian/9 foto, 4 bagian beranda, deskripsi dan kebijakan contoh. Lihat docs/deployment/example-store.json dan docs/examples/ruang-rona.json. Tidak ada pesanan atau pembayaran contoh dimasukkan ke ledger live. Main Netlify berganti nama menjadi kioskuapp; secret URL sudah diperbaiki, dan script deploy kini mengikuti immutable site ID agar tidak membuat project duplikat setelah rename.
