# User Journey: Kiosku.id

## Journey 1 — Onboarding Merchant Baru (Toko Pertama)

| Langkah | Aksi Pengguna | Respons Sistem | Edge Case |
|---|---|---|---|
| 1 | Buka Kiosku.id, klik "Daftar" | Form email/HP muncul | Email sudah terdaftar → arahkan ke login |
| 2 | Isi email/HP, submit | Kirim kode OTP | OTP gagal terkirim → tombol kirim ulang setelah 30 detik |
| 3 | Masukkan OTP | Akun terverifikasi, masuk ke wizard onboarding | OTP salah 3x → cooldown 5 menit |
| 4 | Isi data verifikasi (KTP, rekening bank) | Data disimpan, status "menunggu verifikasi" atau langsung tervalidasi (jika pakai verifikasi otomatis) | Foto KTP buram → sistem minta upload ulang |
| 5 | Isi nama toko & pilih subdomain | Cek ketersediaan subdomain real-time | Subdomain dipakai → sarankan alternatif otomatis |
| 6 | Pilih tema toko | Preview tema langsung tampil | — |
| 7 | Diarahkan ke storefront builder | Editor drag-and-drop terbuka dengan tema terpilih | — |
| 8 | Tambah minimal 1 produk | Produk masuk katalog, tombol "Publish Toko" aktif | Produk tanpa foto → izinkan publish dengan placeholder, beri reminder |
| 9 | Klik "Publish Toko" | Toko live di `namatoko.kiosku.id` | — |

**Titik kritis:** Langkah 4 (verifikasi) dan 5 (subdomain) adalah titik drop-off tertinggi — perlu progress bar yang jelas agar pengguna tahu masih berapa langkah lagi.

---

## Journey 2 — Menambah Toko Kedua (Inti Diferensiasi Produk)

| Langkah | Aksi Pengguna | Respons Sistem | Edge Case |
|---|---|---|---|
| 1 | Dari dashboard akun, klik "Tambah Toko" | Sistem cek kuota tier aktif | Kuota penuh (mis. tier Rintis 1 toko) → tampilkan modal upgrade, bukan error mentah |
| 2 | (Jika kuota cukup) Isi nama toko baru & subdomain | Toko baru dibuat, **tanpa** ulang verifikasi KTP/rekening | — |
| 3 | Pilih tema (independen dari toko pertama) | Editor builder terbuka untuk toko baru | — |
| 4 | Tambah produk & publish | Toko kedua live | — |
| 5 | Kembali ke dashboard akun | Dashboard menampilkan 2 toko, saldo tetap satu gabungan | Pengguna bingung saldo gabungan → sediakan breakdown "kontribusi per toko" di halaman saldo |

**Nilai yang dibuktikan di sini:** dari klik "Tambah Toko" sampai toko kedua live, seharusnya **tidak ada** input verifikasi ulang, tidak ada proses approval manual, dan waktu total < 2 menit (di luar waktu isi produk).

---

## Journey 3 — Menggunakan Storefront Builder (Drag & Drop)

| Langkah | Aksi Pengguna | Respons Sistem | Edge Case |
|---|---|---|---|
| 1 | Buka editor builder dari dashboard toko | Kanvas menampilkan layout toko saat ini + panel komponen di sisi kiri | — |
| 2 | Drag komponen (mis. "Section Produk Unggulan") ke kanvas | Komponen ter-drop di posisi yang dipilih, muncul placeholder konten | Drop di area tidak valid → snap ke posisi terdekat yang valid |
| 3 | Klik komponen untuk edit (pilih produk, ubah teks, ganti gambar) | Panel properti muncul di sisi kanan | — |
| 4 | Reorder section (drag naik/turun) | Layout otomatis re-render | — |
| 5 | Klik "Preview" | Tampilan toko dari sisi pelanggan terbuka di tab baru | — |
| 6 | Klik "Simpan sebagai Draft" atau "Publish" | Draft tersimpan tanpa mengubah toko live / perubahan langsung tayang | Publish gagal (mis. koneksi putus) → autosave draft mencegah kehilangan progres |

**Catatan teknis:** builder menyimpan layout sebagai struktur blok (lihat Architecture.md §4) per toko, bukan per akun — dua toko dalam satu akun bisa punya layout builder yang sama sekali berbeda.

---

## Journey 4 — Pembelian oleh Pelanggan (Customer-Facing)

| Langkah | Aksi Pengguna | Respons Sistem | Edge Case |
|---|---|---|---|
| 1 | Buka `namatoko.kiosku.id` | Halaman toko tampil sesuai builder yang di-publish | Toko belum publish/nonaktif → halaman "toko tidak tersedia" |
| 2 | Cari/filter produk | Hasil filter tampil real-time | Stok kosong → badge "Habis", tombol beli nonaktif |
| 3 | Tambah ke keranjang, checkout | Form data pengiriman & pilih metode bayar | — |
| 4 | Bayar (QRIS/transfer) | Status "menunggu pembayaran" → webhook konfirmasi otomatis | Pembayaran gagal/timeout → status "gagal", stok dikembalikan |
| 5 | Pembayaran terkonfirmasi | Dana masuk **saldo akun** pemilik toko (bukan saldo toko terpisah) | — |
| 6 | Pelanggan terima notifikasi pesanan diproses | — | — |

---

## Journey 5 — Penarikan Saldo (Level Akun)

| Langkah | Aksi Pengguna | Respons Sistem | Edge Case |
|---|---|---|---|
| 1 | Buka halaman "Saldo" dari dashboard akun (bukan dashboard toko) | Total saldo gabungan dari semua toko ditampilkan, dengan breakdown per toko | — |
| 2 | Klik "Tarik Dana" | Form jumlah & rekening tujuan (rekening yang sudah diverifikasi) | Jumlah melebihi saldo → validasi ditolak |
| 3 | Konfirmasi penarikan | Satu kali proses pencairan untuk seluruh saldo gabungan | Rekening belum terverifikasi → arahkan ke halaman verifikasi akun |
| 4 | Dana cair sesuai jadwal tier | Notifikasi & catatan di riwayat transaksi | — |

**Nilai yang dibuktikan:** pemilik 3 toko tetap hanya melakukan **satu** proses penarikan, bukan tiga kali terpisah.
