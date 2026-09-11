# Kelanjutan Kiosku

Workspace: `D:\kiosku`. Baca README.md dan docs/IMPLEMENTATION.md sebelum melanjutkan. Tujuh dokumen `*-Kiosku.id.md` adalah PRD asli. Preferensi pengguna: langsung kerjakan, minim pertanyaan, gunakan Google Stitch.

Desain: https://stitch.withgoogle.com/projects/3226115365701511664. Ekspor sumber dan screenshot ada di `design/stitch/export/`; frontend ada di `src/`.

Mode demo sepenuhnya lokal. Mode aktif sekarang Supabase: `.env.local` berisi URL dan public anon key proyek `mbackiawysjbjvqlntfs`. Migrasi database dan Edge Functions ada di folder `supabase/`. Baca `docs/deployment/SUPABASE.md`, terutama langkah sinkronisasi riwayat sebelum memakai CLI db push. Seluruh otoritas akun, kuota, stok, checkout, dan pembayaran ada di database/Edge. Jangan memindahkan service key ke frontend.

Storefront memakai route internal `/toko/{slug}` pada aplikasi Kiosku. Publish menyalin draft menjadi versi published di Supabase dan tidak membuat deployment eksternal per toko.

Perintah verifikasi: `npm test`, `npm run test:db`, `npm run check:edge`, `npm run build`. Hindari `deno --node-modules-dir=auto` di root; konfigurasi `supabase/deno.json` menggunakan cache terpisah. Pada Windows jangan menjalankan `npm ci` saat Vite memegang native DLL; `npm install` cukup untuk setup normal.

Vite dev menggunakan port 5173, strict port. Jika sedang berjalan, gunakan server itu; jangan mematikan proses lain. Akses demo lewat landing → Lihat demo dashboard. Tombol daftar demo membuat workspace kosong dan mengganti data demo browser itu, dengan penjelasan eksplisit di UI.

Jika sisa usage Codex mendekati habis, pengguna telah meminta mencoba ZCode pada folder ini, lalu Claude Code CLI bila ZCode tidak dapat dibuka. Pada pemeriksaan awal, `claude` terpasang dan login; `zcode` tidak tersedia di PATH. Catatan ini menyiapkan konteks kelanjutan, bukan klaim bahwa handoff sudah dilakukan.

Untuk aktivasi eksternal ikuti docs/SETUP.md. Jangan menganggap pengujian lokal membuktikan transaksi/OTP/penarikan produksi. Simpan pekerjaan yang ada dan teruskan hanya langkah yang masih belum terverifikasi.

Pembaruan OTP: OTP/verifikasi email disembunyikan sementara. Supabase Confirm email OFF dan frontend default email/password (`VITE_AUTH_MODE=password`). Daftar dari web sudah diuji: nama/email/password menghasilkan akun dan langsung dashboard. Jangan aktifkan kembali konfirmasi tanpa permintaan pengguna. Verifikasi identitas/rekening tidak termasuk perubahan ini.

Toko contoh Ruang Rona memiliki slug `ruang-rona-contoh`, 8 produk/23 varian/9 foto, 4 bagian beranda, deskripsi dan kebijakan contoh. Spesifikasi contoh ada di `docs/examples/ruang-rona.json`.
