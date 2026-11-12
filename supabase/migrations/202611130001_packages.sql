-- Run as the project owner. No secret keys belong in the frontend.
create table public.site_admin (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade
);
alter table public.site_admin enable row level security;
create policy "Read own administrator membership" on public.site_admin for select to authenticated using (user_id = auth.uid());
revoke all on public.site_admin from anon, authenticated;
grant select on public.site_admin to authenticated;
revoke insert, update, delete on public.site_admin from anon, authenticated;

create function public.is_site_admin() returns boolean language sql stable security invoker set search_path = '' as $$
 select exists(select 1 from public.site_admin where user_id = (select auth.uid()));
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create table public.travel_packages (
 id text primary key,
 status text not null default 'draft' check (status in ('draft','published')),
 data jsonb not null check (jsonb_typeof(data) = 'object' and data ?& array['title','destination','route','days','price','nights','image','style','description','departures','attachments']),
 created_at timestamptz not null default now(),
 constraint package_title check (length(trim(data->>'title')) between 1 and 120),
 constraint package_content check (jsonb_typeof(data->'route') = 'array' and jsonb_typeof(data->'days') = 'array'),
 constraint package_price check (jsonb_typeof(data->'price') = 'number' and (data->>'price')::numeric >= 0),
 constraint package_nights check (jsonb_typeof(data->'nights') = 'number' and (data->>'nights')::numeric between 1 and 30),
 constraint published_itinerary check (status <> 'published' or jsonb_array_length(data->'days') > 0)
);
alter table public.travel_packages enable row level security;
create policy "Visitors read published packages" on public.travel_packages for select to anon, authenticated using (status = 'published');
create policy "Owner manages packages" on public.travel_packages for all to authenticated using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
revoke all on public.travel_packages from anon, authenticated;
grant select on public.travel_packages to anon, authenticated;
grant insert, update, delete on public.travel_packages to authenticated;

create table public.package_media (
 id uuid primary key default gen_random_uuid(),
 name text not null, type text not null, size bigint not null,
 url text not null, storage_path text unique not null,
 created_at timestamptz not null default now()
);
alter table public.package_media enable row level security;
create policy "Owner manages package media" on public.package_media for all to authenticated using ((select public.is_site_admin())) with check ((select public.is_site_admin()));
revoke all on public.package_media from anon, authenticated;
grant select, insert, update, delete on public.package_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 values ('package-media', 'package-media', true, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']);
create policy "Owner uploads package files" on storage.objects for insert to authenticated with check (bucket_id = 'package-media' and (select public.is_site_admin()));
create policy "Owner reads package files" on storage.objects for select to authenticated using (bucket_id = 'package-media' and (select public.is_site_admin()));
create policy "Owner removes package files" on storage.objects for delete to authenticated using (bucket_id = 'package-media' and (select public.is_site_admin()));
-- Bucket files are public marketing media. Do not upload private customer data.
-- Membership is provisioned separately after the owner creates their Auth user.

grant usage on schema public to anon, authenticated;
create index travel_packages_public_catalogue on public.travel_packages (status, created_at);
