-- Storefront payments go directly to each merchant. Kiosku only records proof and status.
alter table public.stores add column if not exists payment_settings jsonb not null default
 '{"bankEnabled":false,"bank":"","bankNumber":"","bankName":"","qrisEnabled":false,"qrisImage":""}'::jsonb;
alter table public.orders add column if not exists payment_proof_path text;
alter table public.orders add column if not exists payment_proof_submitted_at timestamptz;
alter table public.orders add column if not exists payment_proof_rejected_reason text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('payment-proofs','payment-proofs',false,3145728,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.store_json(s public.stores,private_data boolean default false) returns jsonb
 language sql stable security definer set search_path=public as $$
 select s.info || jsonb_build_object(
  'id',s.id,'accountId',case when private_data then s.account_id::text else '' end,
  'name',s.name,'slug',s.slug,'status',s.status,
  'draft',case when private_data then s.draft else s.published end,'published',s.published,
  'createdAt',s.created_at,
  'paymentSettings',s.payment_settings,
  'versions',case when private_data then coalesce((select jsonb_agg(jsonb_build_object('at',l.created_at,'layout',l.layout_json) order by l.version desc) from store_layouts l where l.store_id=s.id),'[]'::jsonb) else '[]'::jsonb end)
$$;

-- Remove the retired external per-store deployment system when upgrading an existing database.
drop function if exists public.begin_store_deploy(uuid,uuid,uuid);
drop function if exists public.finish_store_deploy(uuid,text);
drop function if exists public.public_store_slug(uuid);
do $$ begin
 if to_regclass('public.store_deployments') is not null and exists(select 1 from pg_publication where pubname='supabase_realtime') then
  execute 'alter publication supabase_realtime drop table public.store_deployments';
 end if;
end $$;
drop table if exists public.store_deployments;
delete from storage.objects where bucket_id='deployment-assets';
delete from storage.buckets where id='deployment-assets';

create or replace function public.order_json(o public.orders) returns jsonb
 language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'id',o.id,'storeId',o.store_id,'code',o.code,'token',o.token,'customer',o.customer,
  'total',o.total,'shippingFee',o.shipping_fee,'status',o.status,'payment',o.payment,'method',o.method,
  'tracking',o.tracking,'courier',o.courier,'createdAt',o.created_at,'events',o.events,
  'paymentUrl',null,'paymentInstructions',o.payment_instructions,
  'paymentProofSubmitted',o.payment_proof_submitted_at is not null,
  'paymentProofSubmittedAt',o.payment_proof_submitted_at,
  'paymentProofRejectedReason',o.payment_proof_rejected_reason,
  'items',coalesce((select jsonb_agg(jsonb_build_object('productId',i.product_id,'variantId',i.variant_id,'name',i.name,'variant',i.variant,'quantity',i.quantity,'price',i.price,'image',i.image)) from order_items i where i.order_id=o.id),'[]'::jsonb))
$$;

create or replace function public.save_store_payment(target_store uuid,settings jsonb) returns void
 language plpgsql security definer set search_path=public as $$
declare owner_id uuid:=auth.uid(); normalized jsonb; bank_on boolean; qris_on boolean;
begin
 if owner_id is null or not exists(select 1 from stores where id=target_store and account_id=owner_id) then raise exception 'Toko tidak ditemukan.'; end if;
 bank_on:=coalesce((settings->>'bankEnabled')::boolean,false);
 qris_on:=coalesce((settings->>'qrisEnabled')::boolean,false);
 if bank_on and (length(trim(coalesce(settings->>'bank',''))) not between 1 and 50 or coalesce(settings->>'bankNumber','') !~ '^\d{8,20}$' or length(trim(coalesce(settings->>'bankName',''))) not between 2 and 100) then raise exception 'Lengkapi rekening pembayaran dengan benar.'; end if;
 if qris_on and (coalesce(settings->>'qrisImage','') not like 'https://%' or coalesce(settings->>'qrisImage','') not like '%/storage/v1/object/public/products/'||owner_id::text||'/%') then raise exception 'Unggah QRIS melalui Kiosku lebih dulu.'; end if;
 normalized:=jsonb_build_object('bankEnabled',bank_on,'bank',trim(coalesce(settings->>'bank','')),'bankNumber',coalesce(settings->>'bankNumber',''),'bankName',trim(coalesce(settings->>'bankName','')),'qrisEnabled',qris_on,'qrisImage',coalesce(settings->>'qrisImage',''));
 update stores set payment_settings=normalized where id=target_store and account_id=owner_id;
end $$;

create or replace function public.review_store_payment(target_order uuid,decision text,rejection_reason text default '') returns void
 language plpgsql security definer set search_path=public as $$
declare o orders;
begin
 select ord.* into o from orders ord join stores s on s.id=ord.store_id where ord.id=target_order and s.account_id=auth.uid() for update of ord;
 if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
 if o.payment<>'menunggu' then raise exception 'Pembayaran sudah diperiksa.'; end if;
 if decision='accept' then
  if o.payment_proof_submitted_at is null or o.payment_proof_path is null then raise exception 'Bukti pembayaran belum diunggah.'; end if;
  update orders set payment='lunas',payment_proof_rejected_reason=null,events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pembayaran dikonfirmasi pemilik toko.')) where id=o.id;
 elsif decision='reject' then
  if o.payment_proof_submitted_at is null then raise exception 'Bukti pembayaran belum diunggah.'; end if;
  if length(trim(rejection_reason)) not between 2 and 250 then raise exception 'Isi alasan penolakan bukti.'; end if;
  update orders set payment_proof_submitted_at=null,payment_proof_rejected_reason=trim(rejection_reason),events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Bukti pembayaran ditolak: '||trim(rejection_reason))) where id=o.id;
 else raise exception 'Keputusan tidak valid.';
 end if;
end $$;

create or replace function public.submit_payment_proof(target_order uuid,expected_token uuid,object_path text) returns void
 language plpgsql security definer set search_path=public as $$
declare o orders;
begin
 select * into o from orders where id=target_order and token=expected_token for update;
 if not found or o.payment<>'menunggu' or o.status='batal' then raise exception 'Pesanan tidak tersedia.'; end if;
 if object_path<>o.store_id::text||'/'||o.id::text||'/proof' then raise exception 'Lokasi bukti tidak valid.'; end if;
 update orders set payment_proof_path=object_path,payment_proof_submitted_at=now(),payment_proof_rejected_reason=null,events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Bukti pembayaran diunggah. Menunggu pemeriksaan toko.')) where id=o.id;
end $$;

create or replace function public.update_store_order(target_order uuid,next_status text,tracking_number text default '',courier_name text default '') returns void
 language plpgsql security definer set search_path=public as $$
declare o orders; i order_items;
begin
 select ord.* into o from orders ord join stores s on s.id=ord.store_id where ord.id=target_order and s.account_id=auth.uid() for update of ord;
 if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
 if not ((o.status='baru' and next_status in ('diproses','batal')) or (o.status='diproses' and next_status='dikirim') or (o.status='dikirim' and next_status='selesai')) then raise exception 'Perubahan status tidak diizinkan.'; end if;
 if next_status='batal' then
  if o.payment='lunas' then raise exception 'Pesanan sudah dibayar. Hubungi pembeli untuk proses pengembalian dana.'; end if;
  for i in select * from order_items where order_id=o.id loop update product_variants set stock=stock+i.quantity where id=i.variant_id; end loop;
  update orders set status='batal',payment='gagal',events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pesanan dibatalkan. Stok dikembalikan.')) where id=o.id;
 else
  if o.payment<>'lunas' then raise exception 'Pembayaran belum terkonfirmasi.'; end if;
  if next_status='dikirim' and (length(trim(tracking_number))=0 or length(trim(courier_name))=0) then raise exception 'Isi kurir dan nomor resi.'; end if;
  update orders set status=next_status,tracking=coalesce(tracking_number,''),courier=coalesce(courier_name,''),events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pesanan '||next_status||'.')) where id=o.id;
 end if;
 insert into notification_outbox(store_id,order_id,recipient,subject,body) values(o.store_id,o.id,o.customer->>'email','Status pesanan '||o.code,'Pesanan '||o.code||' sekarang '||next_status||'.');
end $$;

-- Checkout validates the store's currently enabled payment method and snapshots its instructions.
create or replace function public.checkout_order(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s stores; p products; v product_variants; o orders; c jsonb:=payload->'customer'; line record; oid uuid:=(payload->>'requestId')::uuid; v_total bigint:=0; fee bigint; request_signature text:=md5(payload::text); instructions jsonb;
begin
 select * into s from stores where id=(payload->>'storeId')::uuid;
 if not found or s.status<>'live' then raise exception 'Toko tidak tersedia.'; end if;
 perform 1 from accounts where id=s.account_id for update;
 select * into s from stores where id=s.id; if s.status<>'live' then raise exception 'Toko tidak tersedia.'; end if;
 select * into o from orders where id=oid;
 if found then if o.request_hash<>request_signature then raise exception 'ID checkout sudah digunakan.'; end if; return order_json(o); end if;
 if length(trim(coalesce(c->>'name',''))) not between 2 and 120 or coalesce(c->>'email','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or coalesce(c->>'phone','') !~ '^\+?[0-9]{9,15}$' or length(trim(coalesce(c->>'address',''))) not between 8 and 1000 or length(trim(coalesce(c->>'city','')))<2 or coalesce(c->>'postalCode','') !~ '^\d{5}$' then raise exception 'Informasi pengiriman tidak valid.'; end if;
 if payload->>'method'='transfer' and coalesce((s.payment_settings->>'bankEnabled')::boolean,false) then instructions:=jsonb_build_object('bank',s.payment_settings->>'bank','number',s.payment_settings->>'bankNumber','name',s.payment_settings->>'bankName');
 elsif payload->>'method'='qris' and coalesce((s.payment_settings->>'qrisEnabled')::boolean,false) then instructions:=jsonb_build_object('qrisImage',s.payment_settings->>'qrisImage');
 else raise exception 'Metode pembayaran tidak tersedia di toko ini.'; end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 50 then raise exception 'Keranjang tidak valid.'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'items') x where coalesce(x->>'quantity','') !~ '^\d+$' or (x->>'quantity')::numeric not between 1 and 999) then raise exception 'Jumlah produk tidak valid.'; end if;
 fee:=coalesce((s.info->>'shippingFee')::bigint,0); v_total:=fee;
 insert into orders(id,store_id,code,customer,method,total,shipping_fee,request_hash,events,payment_instructions) values(oid,s.id,'KIO-'||upper(replace(oid::text,'-','')),c,payload->>'method',1,fee,request_signature,jsonb_build_array(jsonb_build_object('at',now(),'text','Pesanan dibuat. Menunggu pembayaran.')),instructions) returning * into o;
 for line in select (x->>'productId')::uuid pid,(x->>'variantId')::uuid vid,sum((x->>'quantity')::int)::int qty from jsonb_array_elements(payload->'items') x group by 1,2 order by 2 loop
  select * into p from products where id=line.pid and store_id=s.id and active; if not found then raise exception 'Produk tidak tersedia di toko ini.'; end if;
  select * into v from product_variants where id=line.vid and product_id=p.id and active for update; if not found or v.stock<line.qty then raise exception 'Stok produk tidak cukup.'; end if;
  update product_variants set stock=stock-line.qty where id=v.id;
  insert into order_items(order_id,product_id,variant_id,quantity,price,name,variant,image) values(o.id,p.id,v.id,line.qty,v.price,p.name,v.name,coalesce(p.images->>0,'')); v_total:=v_total+v.price*line.qty;
 end loop;
 if v_total>9007199254740991 then raise exception 'Total pesanan terlalu besar.'; end if;
 update orders set total=v_total where id=o.id returning * into o;
 insert into notification_outbox(store_id,order_id,recipient,subject,body) values(s.id,o.id,c->>'email','Pesanan '||o.code,'Pesanan diterima. Kode akses: '||o.token::text||'. Simpan kode ini untuk melacak pesanan.');
 return order_json(o);
end $$;

revoke all on function public.save_store_payment(uuid,jsonb),public.review_store_payment(uuid,text,text),public.submit_payment_proof(uuid,uuid,text),public.update_store_order(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.save_store_payment(uuid,jsonb),public.review_store_payment(uuid,text,text),public.update_store_order(uuid,text,text,text) to authenticated;
grant execute on function public.submit_payment_proof(uuid,uuid,text) to service_role;
revoke execute on function public.confirm_manual_payment(uuid,bigint,text) from service_role;
