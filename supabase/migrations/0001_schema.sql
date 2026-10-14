-- BRICK Shop · schema v1 (all tables prefixed bs_, live in public)
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- owners: who may use the back office
create table if not exists public.bs_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bs_owners enable row level security;
create or replace function public.bs_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bs_owners where user_id = auth.uid());
$$;
drop policy if exists "owners read self" on public.bs_owners;
create policy "owners read self" on public.bs_owners for select to authenticated using (user_id = auth.uid());

-- catalog: one row per set, pulled from Brickset, never edited by hand
create table if not exists public.bs_catalog (
  set_num text primary key,
  number text not null,
  variant int not null default 1,
  name text not null,
  year int,
  theme text,
  subtheme text,
  theme_group text,
  category text,
  pieces int,
  minifigs int,
  age_min int,
  age_max int,
  packaging text,
  availability text,
  launch_date date,
  exit_date date,
  rrp_us numeric,
  rrp_uk numeric,
  rrp_de numeric,
  rrp_ca numeric,
  image_url text,
  thumb_url text,
  ean text,
  upc text,
  dims jsonb,
  model_dims jsonb,
  rating numeric,
  rating_count int,
  instructions_count int,
  additional_images int,
  tags text[],
  description_en text,
  description_he text,
  brickset_id int,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bs_catalog_number_idx on public.bs_catalog(number);
create index if not exists bs_catalog_ean_idx on public.bs_catalog(ean);
create index if not exists bs_catalog_upc_idx on public.bs_catalog(upc);
create index if not exists bs_catalog_theme_idx on public.bs_catalog(theme);
create index if not exists bs_catalog_name_trgm on public.bs_catalog using gin (name gin_trgm_ops);
alter table public.bs_catalog enable row level security;
drop policy if exists "catalog read owners" on public.bs_catalog;
create policy "catalog read owners" on public.bs_catalog for select to authenticated using (public.bs_is_owner());
drop policy if exists "catalog write owners" on public.bs_catalog;
create policy "catalog write owners" on public.bs_catalog for update to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- locations: walls and shelves
create table if not exists public.bs_locations (
  code text primary key,
  wall text not null,
  shelf int,
  label text,
  color text,
  sort int default 0,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.bs_locations enable row level security;
drop policy if exists "locations all owners" on public.bs_locations;
create policy "locations all owners" on public.bs_locations for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- items: stock lines
create table if not exists public.bs_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  kind text not null default 'set' check (kind in ('set','polybag','gear','parts','other')),
  set_num text references public.bs_catalog(set_num),
  custom_name text,
  ean text,
  location text references public.bs_locations(code),
  qty int not null default 1 check (qty >= 0),
  condition text not null default 'sealed' check (condition in ('sealed','open','built')),
  status text not null default 'sale' check (status in ('sale','personal','hold','sold')),
  price numeric,
  price_source text,
  cost numeric,
  tags text[] not null default '{}',
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bs_items_set_idx on public.bs_items(set_num);
create index if not exists bs_items_loc_idx on public.bs_items(location);
create index if not exists bs_items_status_idx on public.bs_items(status);
alter table public.bs_items enable row level security;
drop policy if exists "items all owners" on public.bs_items;
create policy "items all owners" on public.bs_items for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- movements: every change to stock
create table if not exists public.bs_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.bs_items(id) on delete set null,
  set_num text,
  delta int not null,
  reason text not null check (reason in ('add','sold','move','adjust','remove')),
  from_location text,
  to_location text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.bs_movements enable row level security;
drop policy if exists "movements all owners" on public.bs_movements;
create policy "movements all owners" on public.bs_movements for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- settings
create table if not exists public.bs_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.bs_settings enable row level security;
drop policy if exists "settings all owners" on public.bs_settings;
create policy "settings all owners" on public.bs_settings for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- secrets: only the service role (edge functions) may read
create table if not exists public.bs_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.bs_secrets enable row level security;
revoke all on public.bs_secrets from anon, authenticated;

-- updated_at trigger
create or replace function public.bs_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists bs_items_touch on public.bs_items;
create trigger bs_items_touch before update on public.bs_items for each row execute function public.bs_touch();
drop trigger if exists bs_catalog_touch on public.bs_catalog;
create trigger bs_catalog_touch before update on public.bs_catalog for each row execute function public.bs_touch();

-- inventory view: items joined with catalog, for lists and tables
create or replace view public.bs_inventory as
select i.id, i.kind, i.set_num, coalesce(c.number, i.set_num) as number,
       coalesce(i.custom_name, c.name) as name, c.theme, c.subtheme, c.year, c.pieces, c.minifigs,
       c.age_min, c.image_url, c.thumb_url, c.exit_date, c.availability, c.rrp_us, c.ean as catalog_ean,
       (c.exit_date is not null and c.exit_date < current_date) as retired,
       i.location, l.wall, i.qty, i.condition, i.status, i.price, i.price_source, i.tags, i.notes,
       i.photo_url, i.ean, i.created_at, i.updated_at
from public.bs_items i
left join public.bs_catalog c on c.set_num = i.set_num
left join public.bs_locations l on l.code = i.location;

-- default locations: walls A..D with 6 shelves, P for polybag bins
insert into public.bs_locations(code, wall, shelf, label, color, sort)
select w || s, w, s, 'קיר ' || w || ' · מדף ' || s, c, (ascii(w)-64)*10 + s
from (values ('A','red'),('B','blue'),('C','green'),('D','yellow')) as walls(w,c), generate_series(1,6) as s
on conflict do nothing;
insert into public.bs_locations(code, wall, shelf, label, color, sort)
select 'P' || s, 'P', s, 'Polybags · תא ' || s, 'cocoa', 100 + s from generate_series(1,6) as s
on conflict do nothing;

insert into public.bs_settings(key, value) values
 ('retired_multiplier', '1.2'),
 ('usd_ils', '3.7'),
 ('vat_included', 'true')
on conflict do nothing;
