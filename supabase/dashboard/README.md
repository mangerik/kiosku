# File untuk Supabase Dashboard

Gunakan file berdasarkan nomor urut:

1. `01-sql-editor.sql` — tempel seluruh isinya ke SQL Editor, lalu Run.
2. `02-checkout.ts` — ganti isi Edge Function `checkout`, lalu Deploy.
3. `03-payment-proof.ts` — buat Edge Function `payment-proof`, tempel isinya, lalu Deploy.
4. `04-payment-webhook.ts` — ganti isi Edge Function `payment-webhook`, lalu Deploy.

Matikan **Verify JWT with legacy secret** pada ketiga Edge Function tersebut. File dalam folder ini sudah dibundel agar dapat langsung ditempel ke editor dashboard. Source utama tetap berada di `supabase/functions/` dan `supabase/migrations/`.
