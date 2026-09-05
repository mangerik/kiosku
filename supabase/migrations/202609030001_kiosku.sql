-- Kiosku MVP. Money is stored as integer rupiah. All money/stock mutations run in transactions.
create extension if not exists pgcrypto;
create table public.accounts (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Pemilik Usaha', email text not null default '',
 tier text not null default 'rintis' check(tier in ('rintis','tumbuh','skala')),
 verification text not null default 'belum' check(verification in ('belum','menunggu','terverifikasi')),
 bank text not null default '', bank_number text not null default '', bank_name text not null default '',
 document_path text, created_at timestamptz not null default now()
);
create table public.subscriptions (
 account_id uuid primary key references public.accounts(id), tier text not null default 'rintis',
 store_quota int not null default 1 check(store_quota between 1 and 3), status text not null default 'aktif',
 expires_at timestamptz, updated_at timestamptz not null default now()
);
create table public.stores (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id),
 name text not null check(length(name) between 1 and 80), slug text unique not null check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
 status text not null default 'draft' check(status in ('draft','live','nonaktif')),
 draft jsonb not null, published jsonb, info jsonb not null default '{}', created_at timestamptz not null default now()
);
create index stores_account on public.stores(account_id);
create table public.store_layouts (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
 version int not null, layout_json jsonb not null, created_at timestamptz not null default now(), unique(store_id, version)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id),
 name text not null, description text not null default '', category text not null, images jsonb not null default '[]',
 active boolean not null default true, created_at timestamptz not null default now()
);
create index products_store on public.products(store_id);
create table public.product_variants (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 name text not null, price bigint not null check(price > 0 and price <= 1000000000000), stock int not null check(stock >= 0), active boolean not null default true
);
create index variants_product on public.product_variants(product_id);
create table public.orders (
 id uuid primary key, store_id uuid not null references public.stores(id), code text unique not null,
 token uuid unique not null default gen_random_uuid(), customer jsonb not null, status text not null default 'baru' check(status in ('baru','diproses','dikirim','selesai','batal')),
 payment text not null default 'menunggu' check(payment in ('menunggu','lunas','gagal')),
 method text not null check(method in ('transfer','qris')), total bigint not null check(total > 0), shipping_fee bigint not null check(shipping_fee>=0),
 tracking text not null default '', courier text not null default '', events jsonb not null default '[]',
 payment_url text, payment_instructions jsonb, request_hash text not null, expires_at timestamptz not null default (now()+interval '24 hours'), created_at timestamptz not null default now()
);
create index orders_store_date on public.orders(store_id, created_at desc);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), product_id uuid not null references public.products(id),
 variant_id uuid not null references public.product_variants(id), quantity int not null check(quantity > 0), price bigint not null check(price > 0),
 name text not null, variant text not null, image text not null default '', unique(order_id,variant_id)
);
create index order_items_order on public.order_items(order_id);
create table public.wallet_transactions (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id), store_id uuid references public.stores(id),
 order_id uuid unique references public.orders(id), type text not null check(type in ('masuk','penarikan')),
 amount bigint not null check(amount>0), status text not null check(status in ('selesai','diproses')),
 description text not null, bank_snapshot jsonb, created_at timestamptz not null default now()
);
create index wallet_account_date on public.wallet_transactions(account_id, created_at desc);
create table public.billing_requests (
 id uuid primary key default gen_random_uuid(), account_id uuid not null references public.accounts(id), tier text not null check(tier in ('rintis','tumbuh','skala')),
 status text not null default 'menunggu', created_at timestamptz not null default now()
);
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id), order_id uuid not null references public.orders(id),
 recipient text not null, subject text not null, body text not null, sent_at timestamptz, attempts int not null default 0, created_at timestamptz not null default now()
);
create table public.rate_limits (key text primary key, window_start timestamptz not null, count int not null);

-- Direct client writes are intentionally forbidden. Owners can only read their own rows.
alter table public.accounts enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stores enable row level security;
alter table public.store_layouts enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.billing_requests enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.rate_limits enable row level security;
create policy accounts_owner on public.accounts for select to authenticated using(id = (select auth.uid()));
create policy subscriptions_owner on public.subscriptions for select to authenticated using(account_id = (select auth.uid()));
create policy stores_owner on public.stores for select to authenticated using(account_id = (select auth.uid()));
create policy layouts_owner on public.store_layouts for select to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.account_id=(select auth.uid())));
create policy products_owner on public.products for select to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.account_id=(select auth.uid())));
create policy variants_owner on public.product_variants for select to authenticated using(exists(select 1 from public.products p join public.stores s on s.id=p.store_id where p.id=product_id and s.account_id=(select auth.uid())));
create policy orders_owner on public.orders for select to authenticated using(exists(select 1 from public.stores s where s.id=store_id and s.account_id=(select auth.uid())));
create policy items_owner on public.order_items for select to authenticated using(exists(select 1 from public.orders o join public.stores s on s.id=o.store_id where o.id=order_id and s.account_id=(select auth.uid())));
create policy wallet_owner on public.wallet_transactions for select to authenticated using(account_id=(select auth.uid()));
create policy billing_owner on public.billing_requests for select to authenticated using(account_id=(select auth.uid()));
revoke all on all tables in schema public from anon, authenticated;
grant select on public.accounts, public.subscriptions, public.stores, public.store_layouts, public.products, public.product_variants, public.orders, public.order_items, public.wallet_transactions, public.billing_requests to authenticated;

create function public.bootstrap_account() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into accounts(id,email,name) values(new.id,coalesce(new.email,new.phone,''),coalesce(nullif(new.raw_user_meta_data->>'name',''),'Pemilik Usaha'));
 insert into subscriptions(account_id) values(new.id);
 return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.bootstrap_account();

create function public.store_json(s public.stores, private_data boolean default false) returns jsonb language sql stable set search_path=public as $$
 select s.info || jsonb_build_object('id',s.id,'accountId',case when private_data then s.account_id::text else '' end,'name',s.name,'slug',s.slug,'status',s.status,'draft',case when private_data then s.draft else s.published end,'published',s.published,'createdAt',s.created_at,'versions',case when private_data then coalesce((select jsonb_agg(jsonb_build_object('at',l.created_at,'layout',l.layout_json) order by l.version desc) from store_layouts l where l.store_id=s.id),'[]'::jsonb) else '[]'::jsonb end)
$$;
create function public.product_json(p public.products) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('id',p.id,'storeId',p.store_id,'name',p.name,'description',p.description,'category',p.category,'images',p.images,'active',p.active,'createdAt',p.created_at,'variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'price',v.price,'stock',v.stock) order by v.name) from product_variants v where v.product_id=p.id and v.active),'[]'::jsonb))
$$;
create function public.order_json(o public.orders) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('id',o.id,'storeId',o.store_id,'code',o.code,'token',o.token,'customer',o.customer,'total',o.total,'shippingFee',o.shipping_fee,'status',o.status,'payment',o.payment,'method',o.method,'tracking',o.tracking,'courier',o.courier,'createdAt',o.created_at,'events',o.events,'paymentUrl',o.payment_url,'paymentInstructions',o.payment_instructions,'items',coalesce((select jsonb_agg(jsonb_build_object('productId',i.product_id,'variantId',i.variant_id,'name',i.name,'variant',i.variant,'quantity',i.quantity,'price',i.price,'image',i.image)) from order_items i where i.order_id=o.id),'[]'::jsonb))
$$;
create function public.merchant_workspace() returns jsonb language plpgsql security definer set search_path=public as $$
declare a accounts; result jsonb;
begin
 select * into a from accounts where id=auth.uid(); if not found then raise exception 'Silakan masuk kembali.'; end if;
 select jsonb_build_object(
 'account',jsonb_build_object('id',a.id,'name',a.name,'email',a.email,'tier',a.tier,'verification',a.verification,'bank',a.bank,'bankNumber',a.bank_number,'bankName',a.bank_name),
 'stores',coalesce((select jsonb_agg(store_json(s,true) order by s.created_at) from stores s where s.account_id=a.id),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(product_json(p) order by p.created_at) from products p join stores s on s.id=p.store_id where s.account_id=a.id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(order_json(o) order by o.created_at desc) from orders o join stores s on s.id=o.store_id where s.account_id=a.id),'[]'::jsonb),
 'transactions',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'storeId',t.store_id,'orderId',t.order_id,'type',t.type,'amount',t.amount,'status',t.status,'description',t.description,'createdAt',t.created_at) order by t.created_at desc) from wallet_transactions t where t.account_id=a.id),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.slug_available(candidate text, except_id uuid default null) returns boolean language sql stable security definer set search_path=public as $$
 select candidate ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(candidate) between 3 and 40 and candidate not in ('www','app','api','admin','mail','support') and not exists(select 1 from stores where slug=candidate and (except_id is null or id<>except_id))
$$;
create function public.public_storefront(store_slug text, preview boolean default false) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s stores;
begin
 select * into s from stores where slug=store_slug;
 if not found then return null; end if;
 if preview then if auth.uid() is null or s.account_id<>auth.uid() then raise exception 'Preview tidak diizinkan.'; end if;
 elsif s.status<>'live' then return null; end if;
 return jsonb_build_object('store',store_json(s,preview),'products',coalesce((select jsonb_agg(product_json(p) order by p.created_at) from products p where p.store_id=s.id and p.active),'[]'::jsonb));
end $$;
create function public.track_order(order_code text, access_token uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select order_json(o) from orders o where o.code=order_code and o.token=access_token
$$;
create function public.valid_layout(l jsonb) returns boolean language plpgsql immutable as $$
declare section jsonb;
begin
 if jsonb_typeof(l->'sections') is distinct from 'array' or jsonb_array_length(l->'sections') not between 1 and 20 or coalesce(l->>'color','') !~ '^#[0-9a-fA-F]{6}$' or coalesce(l->>'font','') not in ('jakarta','system') then return false; end if;
 for section in select * from jsonb_array_elements(l->'sections') loop
  if coalesce(section->>'type','') not in ('hero','products','text','testimonial') or length(coalesce(section->>'title',''))>180 or length(coalesce(section->>'text',''))>3000 then return false; end if;
 end loop; return true;
end $$;
create function public.save_product_internal(p jsonb, owner_id uuid) returns void language plpgsql set search_path=public as $$
declare v jsonb; pid uuid := (p->>'id')::uuid; sid uuid := (p->>'storeId')::uuid;
begin
 if not exists(select 1 from stores where id=sid and account_id=owner_id) then raise exception 'Toko tidak ditemukan.'; end if;
 if exists(select 1 from products where id=pid and store_id<>sid) then raise exception 'Produk tidak bisa dipindahkan.'; end if;
 if length(trim(coalesce(p->>'name',''))) not between 1 and 140 or length(trim(coalesce(p->>'category',''))) not between 1 and 80 or length(coalesce(p->>'description',''))>3000 then raise exception 'Data produk tidak valid.'; end if;
 if jsonb_typeof(p->'variants') is distinct from 'array' or jsonb_array_length(p->'variants') not between 1 and 100 then raise exception 'Varian tidak valid.'; end if;
 if jsonb_typeof(p->'images') is distinct from 'array' or jsonb_array_length(p->'images')>5 then raise exception 'Maksimal 5 gambar.'; end if;
 if (select count(*) from jsonb_array_elements(p->'variants'))<>(select count(distinct x->>'id') from jsonb_array_elements(p->'variants') x) then raise exception 'Varian duplikat.'; end if;
 insert into products(id,store_id,name,description,category,images,active) values(pid,sid,trim(p->>'name'),coalesce(p->>'description',''),trim(p->>'category'),p->'images',coalesce((p->>'active')::boolean,true))
 on conflict(id) do update set name=excluded.name,description=excluded.description,category=excluded.category,images=excluded.images,active=excluded.active;
 update product_variants set active=false where product_id=pid;
 for v in select * from jsonb_array_elements(p->'variants') loop
  if length(trim(coalesce(v->>'name','')))=0 or coalesce(v->>'stock','') !~ '^\d+$' or coalesce(v->>'price','') !~ '^\d+$' then raise exception 'Stok dan harga harus bilangan bulat valid.'; end if;
  if exists(select 1 from product_variants where id=(v->>'id')::uuid and product_id<>pid) then raise exception 'Varian milik produk lain.'; end if;
  insert into product_variants(id,product_id,name,stock,price) values((v->>'id')::uuid,pid,v->>'name',(v->>'stock')::int,(v->>'price')::bigint)
  on conflict(id) do update set name=excluded.name,stock=excluded.stock,price=excluded.price,active=true;
 end loop;
end $$;
create function public.settle_order(order_id uuid, outcome text, expected_amount bigint default null) returns void language plpgsql security definer set search_path=public as $$
declare o orders; owner_id uuid; i order_items;
begin
 if outcome not in ('lunas','gagal') then raise exception 'Status pembayaran tidak valid.'; end if;
 select s.account_id into owner_id from orders ord join stores s on s.id=ord.store_id where ord.id=order_id;
 if owner_id is null then raise exception 'Pesanan tidak ditemukan.'; end if;
 perform 1 from accounts where id=owner_id for update;
 select * into o from orders where id=order_id for update;
 if expected_amount is not null and o.total<>expected_amount then raise exception 'Jumlah pembayaran tidak cocok.'; end if;
 if o.payment<>'menunggu' then return; end if;
 if outcome='lunas' then
  insert into wallet_transactions(account_id,store_id,order_id,type,amount,status,description) values(owner_id,o.store_id,o.id,'masuk',o.total,'selesai','Pembayaran '||o.code) on conflict do nothing;
  update orders set payment='lunas',events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pembayaran terkonfirmasi.')) where id=o.id;
 else
  for i in select * from order_items where order_items.order_id=o.id loop update product_variants set stock=stock+i.quantity where id=i.variant_id; end loop;
  update orders set payment='gagal',status='batal',events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pembayaran gagal. Stok dikembalikan.')) where id=o.id;
 end if;
 insert into notification_outbox(store_id,order_id,recipient,subject,body) values(o.store_id,o.id,o.customer->>'email','Status pembayaran '||o.code,'Pembayaran pesanan '||o.code||': '||outcome||'.');
end $$;
create function public.merchant_command(command jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare a accounts; s stores; o orders; p jsonb; l jsonb; v_tier text; action text := command->>'type'; sid uuid; amount bigint; quota int; next_status text;
begin
 select * into a from accounts where id=auth.uid() for update;
 if not found then raise exception 'Silakan masuk kembali.'; end if;
 case action
 when 'create-store' then
  select store_quota into quota from subscriptions where account_id=a.id;
  if (select count(*) from stores where account_id=a.id and status<>'nonaktif')>=quota then raise exception 'Kuota toko penuh. Upgrade paket untuk menambah toko.'; end if;
  if not slug_available(command->>'slug') then raise exception 'Alamat toko sudah dipakai atau tidak valid.'; end if;
  l:=jsonb_build_object('theme',coalesce(command->>'theme','natural'),'color',case command->>'theme' when 'warm' then '#956a46' when 'bold' then '#272b37' else '#176348' end,'font','jakarta','logo','','sections',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'type','hero','title','Pilihan baik untuk setiap hari.','text','Temukan koleksi pilihan kami.','image','/images/hero.jpg'),jsonb_build_object('id',gen_random_uuid(),'type','products','title','Pilihan untukmu','text','','image','')));
  insert into stores(account_id,name,slug,draft,info) values(a.id,trim(command->>'name'),command->>'slug',l,jsonb_build_object('category',command->>'category','description','','contact','','policy','Hubungi kami untuk informasi pengiriman dan pengembalian.','shippingFee',15000));
 when 'save-store' then
  p:=command->'store'; sid:=(p->>'id')::uuid; select * into s from stores where id=sid and account_id=a.id;
  if not found then raise exception 'Toko tidak ditemukan.'; end if;
  if not slug_available(p->>'slug',sid) or coalesce(p->>'shippingFee','') !~ '^\d+$' or (p->>'shippingFee')::bigint>10000000 then raise exception 'Alamat toko atau ongkir tidak valid.'; end if;
  update stores set name=trim(p->>'name'),slug=p->>'slug',info=jsonb_build_object('category',p->>'category','description',p->>'description','contact',p->>'contact','policy',p->>'policy','shippingFee',(p->>'shippingFee')::bigint) where id=sid;
 when 'save-product' then perform save_product_internal(command->'product',a.id);
 when 'import-products' then
  if jsonb_typeof(command->'products') is distinct from 'array' or jsonb_array_length(command->'products') not between 1 and 500 then raise exception 'Impor maksimal 500 produk.'; end if;
  for p in select * from jsonb_array_elements(command->'products') loop if exists(select 1 from products where id=(p->>'id')::uuid) then raise exception 'ID produk sudah ada.'; end if; perform save_product_internal(p,a.id); end loop;
 when 'delete-product' then
  update products set active=false where id=(command->>'id')::uuid and store_id in(select id from stores where account_id=a.id); if not found then raise exception 'Produk tidak ditemukan.'; end if;
 when 'save-layout' then
  if not valid_layout(command->'layout') then raise exception 'Layout tidak valid.'; end if;
  update stores set draft=command->'layout' where id=(command->>'storeId')::uuid and account_id=a.id; if not found then raise exception 'Toko tidak ditemukan.'; end if;
 when 'publish' then
  sid:=(command->>'storeId')::uuid; select * into s from stores where id=sid and account_id=a.id;
  if not found or s.status='nonaktif' then raise exception 'Toko tidak tersedia atau kuota paket terlampaui.'; end if;
  if not exists(select 1 from products where store_id=sid and active) then raise exception 'Tambahkan minimal satu produk sebelum publish.'; end if;
  if not valid_layout(s.draft) then raise exception 'Layout tidak valid.'; end if;
  insert into store_layouts(store_id,version,layout_json) values(sid,coalesce((select max(version) from store_layouts where store_id=sid),0)+1,s.draft);
  update stores set published=draft,status='live' where id=sid;
 when 'update-order' then
  select ord.* into o from orders ord join stores st on st.id=ord.store_id where ord.id=(command->>'id')::uuid and st.account_id=a.id for update of ord;
  if not found then raise exception 'Pesanan tidak ditemukan.'; end if;
  next_status:=command->>'status';
  if not ((o.status='baru' and next_status in ('diproses','batal')) or (o.status='diproses' and next_status='dikirim') or (o.status='dikirim' and next_status='selesai')) then raise exception 'Perubahan status tidak diizinkan.'; end if;
  if next_status='batal' then
  if o.payment='lunas' then raise exception 'Pesanan sudah dibayar. Proses refund melalui penyedia pembayaran.'; end if;
   if o.method<>'transfer' then raise exception 'Batalkan pembayaran melalui gateway. Status pesanan mengikuti konfirmasi gateway.'; end if;
   perform settle_order(o.id,'gagal');
  else
   if o.payment<>'lunas' then raise exception 'Pembayaran belum terkonfirmasi.'; end if;
   if next_status='dikirim' and (length(trim(coalesce(command->>'tracking','')))=0 or length(trim(coalesce(command->>'courier','')))=0) then raise exception 'Isi kurir dan nomor resi.'; end if;
   update orders set status=next_status,tracking=coalesce(command->>'tracking',''),courier=coalesce(command->>'courier',''),events=events||jsonb_build_array(jsonb_build_object('at',now(),'text','Pesanan '||next_status||'.')) where id=o.id;
   insert into notification_outbox(store_id,order_id,recipient,subject,body) values(o.store_id,o.id,o.customer->>'email','Status pesanan '||o.code,'Pesanan '||o.code||' sekarang '||next_status||'.');
  end if;
 when 'pay-order' then
  raise exception 'Pembayaran hanya dapat dikonfirmasi gateway setelah dana diterima.';
 when 'withdraw' then
  if command->>'requestId' is not null and exists(select 1 from wallet_transactions where id=(command->>'requestId')::uuid) then
   if not exists(select 1 from wallet_transactions where id=(command->>'requestId')::uuid and account_id=a.id and type='penarikan' and wallet_transactions.amount=(command->>'amount')::bigint) then raise exception 'ID penarikan sudah digunakan.'; end if;
   return jsonb_build_object('ok',true);
  end if;
  if a.verification<>'terverifikasi' then raise exception 'Verifikasi rekening terlebih dahulu.'; end if;
  if coalesce(command->>'amount','') !~ '^\d+$' then raise exception 'Jumlah penarikan tidak valid.'; end if;
  amount:=(command->>'amount')::bigint;
  if amount<=0 or amount>coalesce((select sum(case type when 'masuk' then wallet_transactions.amount else -wallet_transactions.amount end) from wallet_transactions where account_id=a.id),0) then raise exception 'Jumlah penarikan tidak valid atau melebihi saldo.'; end if;
  insert into wallet_transactions(id,account_id,type,amount,status,description,bank_snapshot) values(coalesce((command->>'requestId')::uuid,gen_random_uuid()),a.id,'penarikan',amount,'diproses','Penarikan ke '||a.bank||' • '||right(a.bank_number,4),jsonb_build_object('bank',a.bank,'number',a.bank_number,'name',a.bank_name));
 when 'change-tier' then
  v_tier:=command->>'tier'; if v_tier not in ('rintis','tumbuh','skala') then raise exception 'Paket tidak valid.'; end if;
  if v_tier<>'rintis' then raise exception 'Aktivasi paket berbayar membutuhkan billing yang dikonfigurasi. Hubungi pengelola platform.'; end if;
  update accounts set tier='rintis' where id=a.id; update subscriptions set tier='rintis',store_quota=1,expires_at=null,updated_at=now() where account_id=a.id;
  with ranked as(select id,row_number() over(order by created_at,id) n from stores where account_id=a.id) update stores set status=case when ranked.n>1 then 'nonaktif' when published is not null then 'live' else 'draft' end from ranked where stores.id=ranked.id;
 when 'verify' then
  if a.verification='terverifikasi' then raise exception 'Rekening terverifikasi tidak dapat diganti tanpa pemeriksaan ulang.'; end if;
  if coalesce(command->>'bankNumber','') !~ '^\d{8,20}$' or length(trim(coalesce(command->>'bankName','')))<2 or coalesce(command->>'bank','')='' or (command->>'documentPath') not like a.id::text||'/%' then raise exception 'Data verifikasi tidak valid.'; end if;
  if not exists(select 1 from storage.objects where bucket_id='verification' and name=command->>'documentPath') then raise exception 'Dokumen belum diunggah.'; end if;
  update accounts set bank=command->>'bank',bank_number=command->>'bankNumber',bank_name=command->>'bankName',document_path=command->>'documentPath',verification='menunggu' where id=a.id;
 when 'save-account' then
  if length(trim(coalesce(command->>'name',''))) not between 2 and 100 then raise exception 'Nama tidak valid.'; end if;
  update accounts set name=trim(command->>'name') where id=a.id;
 else raise exception 'Operasi tidak dikenali.';
 end case;
 return jsonb_build_object('ok',true);
end $$;

-- Checkout is called only through a rate-limited Edge Function using service_role.
create function public.checkout_order(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare s stores; p products; v product_variants; o orders; c jsonb:=payload->'customer'; line record; item_count int; oid uuid:=(payload->>'requestId')::uuid; v_total bigint:=0; fee bigint; request_signature text:=md5(payload::text);
begin
 select * into s from stores where id=(payload->>'storeId')::uuid;
 if not found or s.status<>'live' then raise exception 'Toko tidak tersedia.'; end if;
 perform 1 from accounts where id=s.account_id for update;
 select * into s from stores where id=s.id; if s.status<>'live' then raise exception 'Toko tidak tersedia.'; end if;
 select * into o from orders where id=oid;
 if found then if o.request_hash<>request_signature then raise exception 'ID checkout sudah digunakan.'; end if; return order_json(o); end if;
 if length(trim(coalesce(c->>'name',''))) not between 2 and 120 or coalesce(c->>'email','') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or coalesce(c->>'phone','') !~ '^\+?[0-9]{9,15}$' or length(trim(coalesce(c->>'address',''))) not between 8 and 1000 or length(trim(coalesce(c->>'city','')))<2 or coalesce(c->>'postalCode','') !~ '^\d{5}$' then raise exception 'Informasi pengiriman tidak valid.'; end if;
 if payload->>'method' not in ('transfer','qris') then raise exception 'Metode pembayaran tidak valid.'; end if;
 if jsonb_typeof(payload->'items') is distinct from 'array' or jsonb_array_length(payload->'items') not between 1 and 50 then raise exception 'Keranjang tidak valid.'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'items') x where coalesce(x->>'quantity','') !~ '^\d+$' or (x->>'quantity')::numeric not between 1 and 999) then raise exception 'Jumlah produk tidak valid.'; end if;
 fee:=coalesce((s.info->>'shippingFee')::bigint,0); v_total:=fee;
 insert into orders(id,store_id,code,customer,method,total,shipping_fee,request_hash,events) values(oid,s.id,'KIO-'||upper(replace(oid::text,'-','')),c,payload->>'method',1,fee,request_signature,jsonb_build_array(jsonb_build_object('at',now(),'text','Pesanan dibuat. Menunggu pembayaran.'))) returning * into o;
 for line in select (x->>'productId')::uuid pid,(x->>'variantId')::uuid vid,sum((x->>'quantity')::int)::int qty from jsonb_array_elements(payload->'items') x group by 1,2 order by 2 loop
  select * into p from products where id=line.pid and store_id=s.id and active;
  if not found then raise exception 'Produk tidak tersedia di toko ini.'; end if;
  select * into v from product_variants where id=line.vid and product_id=p.id and active for update;
  if not found or v.stock<line.qty then raise exception 'Stok produk tidak cukup.'; end if;
  update product_variants set stock=stock-line.qty where id=v.id;
  insert into order_items(order_id,product_id,variant_id,quantity,price,name,variant,image) values(o.id,p.id,v.id,line.qty,v.price,p.name,v.name,coalesce(p.images->>0,''));
  v_total:=v_total+v.price*line.qty;
 end loop;
 if v_total>9007199254740991 then raise exception 'Total pesanan terlalu besar.'; end if;
 update orders set total=v_total where id=o.id returning * into o;
 insert into notification_outbox(store_id,order_id,recipient,subject,body) values(s.id,o.id,c->>'email','Pesanan '||o.code,'Pesanan diterima. Kode akses: '||o.token::text||'. Simpan kode ini untuk melacak pesanan.');
 return order_json(o);
end $$;
create function public.check_rate_limit(bucket_key text, max_requests int, window_seconds int) returns boolean language plpgsql security definer set search_path=public as $$
declare row_count int;
begin
 insert into rate_limits(key,window_start,count) values(bucket_key,now(),1) on conflict(key) do update set count=case when rate_limits.window_start < now()-make_interval(secs=>window_seconds) then 1 else rate_limits.count+1 end,window_start=case when rate_limits.window_start < now()-make_interval(secs=>window_seconds) then now() else rate_limits.window_start end returning count into row_count;
 return row_count<=max_requests;
end $$;

-- Storage: merchant identity documents are private and never included in public responses.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('products','products',true,3145728,array['image/jpeg','image/png','image/webp']),('verification','verification',false,3145728,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy product_image_read on storage.objects for select to anon,authenticated using(bucket_id='products');
create policy image_owner_insert on storage.objects for insert to authenticated with check(bucket_id in ('products','verification') and (storage.foldername(name))[1]=auth.uid()::text);
create policy identity_owner_read on storage.objects for select to authenticated using(bucket_id='verification' and (storage.foldername(name))[1]=auth.uid()::text);

-- Avoid PostgreSQL's default PUBLIC execute permissions on privileged helpers.
revoke all on function public.bootstrap_account(),public.store_json(public.stores,boolean),public.product_json(public.products),public.order_json(public.orders),public.merchant_workspace(),public.slug_available(text,uuid),public.public_storefront(text,boolean),public.track_order(text,uuid),public.valid_layout(jsonb),public.save_product_internal(jsonb,uuid),public.settle_order(uuid,text,bigint),public.merchant_command(jsonb),public.checkout_order(jsonb),public.check_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.merchant_workspace(),public.merchant_command(jsonb) to authenticated;
grant execute on function public.slug_available(text,uuid),public.public_storefront(text,boolean),public.track_order(text,uuid) to anon,authenticated;
grant execute on function public.checkout_order(jsonb),public.settle_order(uuid,text,bigint),public.check_rate_limit(text,int,int) to service_role;
grant all on all tables in schema public to service_role;

