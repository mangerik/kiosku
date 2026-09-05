-- Prepaid 30-day subscriptions. Only a verified server payment activates a tier.
alter table public.orders add column payment_checked_at timestamptz not null default '1970-01-01';
alter table public.billing_requests add column payment_checked_at timestamptz not null default '1970-01-01';
alter table public.billing_requests add column amount bigint not null default 0,
 add column duration_days int not null default 30 check(duration_days=30),
 add column payment_url text, add column expires_at timestamptz not null default(now()+interval '24 hours');
create function public.create_subscription_invoice(owner_id uuid, requested_tier text, request_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a accounts; invoice billing_requests; cost bigint;
begin
 select * into a from accounts where id=owner_id for update;
 if not found then raise exception 'Akun tidak ditemukan.'; end if;
 if requested_tier not in ('tumbuh','skala') then raise exception 'Paket tidak valid.'; end if;
 select * into invoice from billing_requests where id=request_id;
 if found then
  if invoice.account_id<>owner_id or invoice.tier<>requested_tier then raise exception 'ID pembayaran sudah digunakan.'; end if;
  return to_jsonb(invoice);
 end if;
 -- Reuse a pending invoice across reloads and tabs, preventing accidental repeat purchases.
 select * into invoice from billing_requests where account_id=owner_id and status='menunggu' and expires_at>now() order by created_at desc limit 1;
 if found then
  if invoice.tier<>requested_tier then raise exception 'Selesaikan tagihan paket sebelumnya atau tunggu tagihan kedaluwarsa.'; end if;
  return to_jsonb(invoice);
 end if;
 cost:=case requested_tier when 'tumbuh' then 150000 else 498000 end;
 insert into billing_requests(id,account_id,tier,amount) values(request_id,owner_id,requested_tier,cost) returning * into invoice;
 return to_jsonb(invoice);
end $$;
create function public.settle_subscription(invoice_id uuid, outcome text, expected_amount bigint) returns void
language plpgsql security definer set search_path=public as $$
declare invoice billing_requests; owner_id uuid; quota int; end_date timestamptz;
begin
 if outcome not in ('lunas','gagal') then raise exception 'Status tidak valid.'; end if;
 select account_id into owner_id from billing_requests where id=invoice_id;
 if owner_id is null then raise exception 'Tagihan tidak ditemukan.'; end if;
 perform 1 from accounts where id=owner_id for update;
 select * into invoice from billing_requests where id=invoice_id for update;
 if invoice.amount<>expected_amount then raise exception 'Jumlah pembayaran tidak cocok.'; end if;
 if invoice.status<>'menunggu' then return; end if;
 update billing_requests set status=outcome where id=invoice.id;
 if outcome='gagal' then return; end if;
 quota:=case invoice.tier when 'tumbuh' then 2 else 3 end;
 select case when tier=invoice.tier then greatest(coalesce(expires_at,now()),now()) else now() end + make_interval(days=>invoice.duration_days) into end_date from subscriptions where account_id=owner_id;
 update accounts set tier=invoice.tier where id=owner_id;
 update subscriptions set tier=invoice.tier,store_quota=quota,status='aktif',expires_at=end_date,updated_at=now() where account_id=owner_id;
 with ranked as(select id,row_number() over(order by created_at,id) n from stores where account_id=owner_id)
 update stores set status=case when ranked.n>quota then 'nonaktif' when published is not null then 'live' else 'draft' end from ranked where stores.id=ranked.id;
end $$;
create function public.expire_subscriptions() returns int language plpgsql security definer set search_path=public as $$
declare owner_id uuid; changed int:=0;
begin
 for owner_id in select account_id from subscriptions where tier<>'rintis' and expires_at<=now() order by account_id loop
  perform 1 from accounts where id=owner_id for update;
  if not exists(select 1 from subscriptions where account_id=owner_id and tier<>'rintis' and expires_at<=now()) then continue; end if;
  update accounts set tier='rintis' where id=owner_id;
  update subscriptions set tier='rintis',store_quota=1,status='aktif',expires_at=null,updated_at=now() where account_id=owner_id;
  with ranked as(select id,row_number() over(order by created_at,id) n from stores where account_id=owner_id)
  update stores set status=case when ranked.n>1 then 'nonaktif' when published is not null then 'live' else 'draft' end from ranked where stores.id=ranked.id;
  changed:=changed+1;
 end loop; return changed;
end $$;
-- Verification/payout completion is an audited operator action, never a merchant grant.
create table public.operator_audit(id uuid primary key default gen_random_uuid(), action text not null, target_id uuid not null, reference text not null, created_at timestamptz not null default now());
alter table public.operator_audit enable row level security;
revoke all on public.operator_audit from public,anon,authenticated;
grant all on public.operator_audit to service_role;
create unique index manual_payment_reference on public.operator_audit(reference) where action='manual-payment-confirmed';
create function public.confirm_manual_payment(payment_order_id uuid, received_amount bigint, bank_reference text) returns void language plpgsql security definer set search_path=public as $$
declare o orders; owner_id uuid;
begin
 if length(trim(coalesce(bank_reference,'')))<5 then raise exception 'Referensi mutasi bank wajib diisi.'; end if;
 select s.account_id into owner_id from orders ord join stores s on s.id=ord.store_id where ord.id=payment_order_id;
 perform 1 from accounts where id=owner_id for update;
 select * into o from orders where id=payment_order_id for update;
 if not found or o.method<>'transfer' then raise exception 'Pesanan transfer tidak ditemukan.'; end if;
 if o.total<>received_amount then raise exception 'Jumlah pembayaran tidak cocok.'; end if;
 if o.payment='lunas' then return; end if;
 if o.payment<>'menunggu' then raise exception 'Pesanan sudah ditutup. Tangani transfer terlambat melalui rekonsiliasi operator.'; end if;
 insert into operator_audit(action,target_id,reference) values('manual-payment-confirmed',o.id,bank_reference);
 perform settle_order(o.id,'lunas',received_amount);
end $$;
revoke all on function public.confirm_manual_payment(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.confirm_manual_payment(uuid,bigint,text) to service_role;
create function public.review_identity(owner_id uuid, approved boolean, audit_reference text) returns void language plpgsql security definer set search_path=public as $$
begin
 if length(trim(coalesce(audit_reference,'')))<5 then raise exception 'Referensi pemeriksaan wajib diisi.'; end if;
 perform 1 from accounts where id=owner_id and verification='menunggu' for update;
 if not found then raise exception 'Pengajuan tidak ditemukan.'; end if;
 update accounts set verification=case when approved then 'terverifikasi' else 'belum' end where id=owner_id;
 insert into operator_audit(action,target_id,reference) values(case when approved then 'identity-approved' else 'identity-rejected' end,owner_id,audit_reference);
end $$;
create function public.complete_withdrawal(transaction_id uuid, bank_reference text) returns void language plpgsql security definer set search_path=public as $$
declare t wallet_transactions;
begin
 if length(trim(coalesce(bank_reference,'')))<5 then raise exception 'Referensi transfer bank wajib diisi.'; end if;
 select * into t from wallet_transactions where id=transaction_id and type='penarikan' for update;
 if not found then raise exception 'Penarikan tidak ditemukan.'; end if;
 if t.status='selesai' then return; end if;
 update wallet_transactions set status='selesai' where id=t.id;
 insert into operator_audit(action,target_id,reference) values('withdrawal-completed',t.id,bank_reference);
end $$;
revoke all on function public.create_subscription_invoice(uuid,text,uuid),public.settle_subscription(uuid,text,bigint),public.expire_subscriptions(),public.review_identity(uuid,boolean,text),public.complete_withdrawal(uuid,text) from public,anon,authenticated;
grant execute on function public.create_subscription_invoice(uuid,text,uuid),public.settle_subscription(uuid,text,bigint),public.expire_subscriptions(),public.review_identity(uuid,boolean,text),public.complete_withdrawal(uuid,text) to service_role;
-- Enable owner-scoped realtime when the Supabase publication is available.
do $$ declare table_name text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach table_name in array array['accounts','subscriptions','stores','products','product_variants','orders','wallet_transactions'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=table_name) then
    execute format('alter publication supabase_realtime add table public.%I',table_name);
   end if;
  end loop;
 end if;
end $$;
