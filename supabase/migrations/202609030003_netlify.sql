-- Netlify credentials stay in Edge secrets. Merchants can only read their deployment status.
create table public.store_deployments (
 store_id uuid primary key references public.stores(id) on delete cascade,
 site_name text unique not null, site_id text unique, site_url text, public_url text,
 deploy_id text, state text not null default 'preparing' check(state in ('preparing','deploying','ready','failed')),
 candidate_layout jsonb not null, lease_id uuid, lease_until timestamptz,
 artifact_hash text, last_error text, updated_at timestamptz not null default now()
);
alter table public.store_deployments enable row level security;
revoke all on public.store_deployments from public,anon,authenticated;
grant select on public.store_deployments to authenticated;
grant all on public.store_deployments to service_role;
create policy deployment_owner_read on public.store_deployments for select to authenticated
 using(exists(select 1 from public.stores s where s.id=store_id and s.account_id=auth.uid()));

create function public.begin_store_deploy(owner_id uuid,target_store uuid,lease uuid) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare s stores; d store_deployments;
begin
 perform 1 from accounts where id=owner_id for update;
 select * into s from stores where id=target_store and account_id=owner_id for update;
 if not found or s.status='nonaktif' then raise exception 'Toko tidak tersedia atau kuota paket terlampaui.'; end if;
 if not exists(select 1 from products where store_id=s.id and active) then raise exception 'Tambahkan minimal satu produk sebelum publish.'; end if;
 if not valid_layout(s.draft) then raise exception 'Layout tidak valid.'; end if;
 select * into d from store_deployments where store_id=s.id for update;
 if found and d.state='deploying' and d.deploy_id is not null then return to_jsonb(d)||'{"pending":true}'::jsonb; end if;
 if found and d.lease_until>now() then return to_jsonb(d)||'{"pending":true}'::jsonb; end if;
 insert into store_deployments(store_id,site_name,candidate_layout,lease_id,lease_until)
 values(s.id,'kiosku-'||left(s.slug,20)||'-'||replace(s.id::text,'-',''),s.draft,lease,now()+interval '2 minutes')
 on conflict(store_id) do update set candidate_layout=s.draft,state='preparing',last_error=null,lease_id=lease,lease_until=now()+interval '2 minutes',updated_at=now()
 returning * into d;
 return to_jsonb(d)||'{"pending":false}'::jsonb;
end $$;

-- A ready remote deploy commits exactly its captured layout, once; draft edits made while uploading survive.
create function public.finish_store_deploy(target_store uuid,expected_deploy text) returns void
 language plpgsql security definer set search_path=public as $$
declare s stores; d store_deployments; owner uuid;
begin
 select account_id into owner from stores where id=target_store;
 perform 1 from accounts where id=owner for update;
 select * into s from stores where id=target_store for update;
 select * into d from store_deployments where store_id=target_store for update;
 if d.deploy_id is distinct from expected_deploy then raise exception 'Versi deployment berubah. Coba ulang.'; end if;
 if d.state='ready' then return; end if;
 if s.status='nonaktif' then raise exception 'Kuota toko berubah. Aktifkan toko sebelum publish.'; end if;
 insert into store_layouts(store_id,version,layout_json)
 values(s.id,coalesce((select max(version) from store_layouts where store_id=s.id),0)+1,d.candidate_layout);
 update stores set published=d.candidate_layout,status='live' where id=s.id;
 update store_deployments set state='ready',public_url=site_url,lease_id=null,lease_until=null,last_error=null,updated_at=now() where store_id=s.id;
end $$;
revoke all on function public.begin_store_deploy(uuid,uuid,uuid),public.finish_store_deploy(uuid,text) from public,anon,authenticated;
grant execute on function public.begin_store_deploy(uuid,uuid,uuid),public.finish_store_deploy(uuid,text) to service_role;

-- Keep a deployment bound to an immutable store id, even after the merchant renames its slug.
create function public.public_store_slug(target_store uuid) returns text language sql stable security definer set search_path=public as $$
 select slug from stores where id=target_store and status='live'
$$;
revoke all on function public.public_store_slug(uuid) from public;
grant execute on function public.public_store_slug(uuid) to anon,authenticated;

create or replace function public.store_json(s public.stores,private_data boolean default false) returns jsonb
 language sql stable security definer set search_path=public as $$
 select s.info || jsonb_build_object('id',s.id,'accountId',case when private_data then s.account_id::text else '' end,'name',s.name,'slug',s.slug,'status',s.status,'draft',case when private_data then s.draft else s.published end,'published',s.published,'createdAt',s.created_at,'versions',case when private_data then coalesce((select jsonb_agg(jsonb_build_object('at',l.created_at,'layout',l.layout_json) order by l.version desc) from store_layouts l where l.store_id=s.id),'[]'::jsonb) else '[]'::jsonb end,
 'publicUrl',(select public_url from store_deployments where store_id=s.id),
 'deployment',case when private_data then (select jsonb_build_object('state',state,'error',last_error) from store_deployments where store_id=s.id) else null end)
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('deployment-assets','deployment-assets',false,15728640,array['application/zip']) on conflict(id) do nothing;
-- No browser upload policies: only platform operators/service_role can replace the trusted app bundle.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.store_deployments;
 end if;
end $$;
