-- BRICK Shop · complete schema for a fresh Supabase project (16.10.2026)
-- Idempotent where Postgres allows it. Run once on a new project with execute_sql, then copy data, then deploy
-- the edge functions "catalog", "assets" and "photo". Replace __PROJECT_REF__ with the project ref before running.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;
create extension if not exists pg_net;

-- ---------- owners ----------
create table if not exists public.bs_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.bs_owners enable row level security;
create or replace function public.bs_is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bs_owners where user_id = auth.uid());
$$;
create policy "owners read self" on public.bs_owners for select to authenticated using (user_id = auth.uid());

-- whoever signs up with the owner's email becomes an owner automatically
create or replace function public.bs_auto_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'mar.gilad@gmail.com' then
    insert into public.bs_owners(user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger bs_auto_owner_trg after insert on auth.users for each row execute function public.bs_auto_owner();

-- ---------- catalog ----------
create table if not exists public.bs_catalog (
  set_num text primary key,
  number text not null,
  variant int not null default 1,
  name text not null,
  year int, theme text, subtheme text, theme_group text, category text,
  pieces int, minifigs int, age_min int, age_max int,
  packaging text, availability text, launch_date date, exit_date date,
  rrp_us numeric, rrp_uk numeric, rrp_de numeric, rrp_ca numeric,
  image_url text, thumb_url text, ean text, upc text,
  dims jsonb, model_dims jsonb,
  rating numeric, rating_count int, instructions_count int, additional_images int,
  tags text[], description_en text, description_he text,
  brickset_id int, raw jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bs_catalog_number_idx on public.bs_catalog(number);
create index if not exists bs_catalog_ean_idx on public.bs_catalog(ean);
create index if not exists bs_catalog_upc_idx on public.bs_catalog(upc);
create index if not exists bs_catalog_theme_idx on public.bs_catalog(theme);
create index if not exists bs_catalog_name_trgm on public.bs_catalog using gin (name gin_trgm_ops);
alter table public.bs_catalog enable row level security;
create policy "catalog read owners" on public.bs_catalog for select to authenticated using (public.bs_is_owner());
create policy "catalog write owners" on public.bs_catalog for update to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- ---------- zones and locations ----------
create table if not exists public.bs_zones (
  code text primary key, name text not null, color text not null default 'ink', site text, sort int default 0,
  created_at timestamptz not null default now()
);
alter table public.bs_zones enable row level security;
create policy "zones all owners" on public.bs_zones for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

create table if not exists public.bs_locations (
  code text primary key,
  wall text not null,
  shelf int,
  label text,
  color text,
  sort int default 0,
  notes text,
  created_at timestamptz not null default now(),
  kind text not null default 'shelf',
  active boolean not null default true
);
alter table public.bs_locations enable row level security;
create policy "locations all owners" on public.bs_locations for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- ---------- items and movements ----------
create table if not exists public.bs_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  kind text not null default 'set' check (kind in ('set','polybag','gear','book','magazine','parts','other')),
  set_num text references public.bs_catalog(set_num),
  custom_name text,
  ean text,
  location text references public.bs_locations(code),
  qty int not null default 1 check (qty >= 0),
  condition text not null default 'sealed' check (condition in ('sealed','open','built')),
  status text not null default 'sale' check (status in ('sale','personal','hold','sold')),
  price numeric, price_source text, cost numeric,
  tags text[] not null default '{}',
  notes text, photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- parts (kind 'parts', imported from a BrickLink-format CSV)
  part_no text, color_id int, color_name text, part_cat text, bl_price numeric
);
create unique index if not exists bs_items_part_uq on public.bs_items (part_no, coalesce(color_id, -1)) where kind = 'parts' and part_no is not null;
create index if not exists bs_items_set_idx on public.bs_items(set_num);
create index if not exists bs_items_loc_idx on public.bs_items(location);
create index if not exists bs_items_status_idx on public.bs_items(status);
alter table public.bs_items enable row level security;
create policy "items all owners" on public.bs_items for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

create table if not exists public.bs_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.bs_items(id) on delete set null,
  set_num text,
  delta int not null,
  reason text not null check (reason in ('add','sold','move','adjust','remove')),
  from_location text, to_location text, note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.bs_movements enable row level security;
create policy "movements all owners" on public.bs_movements for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- ---------- settings and secrets ----------
create table if not exists public.bs_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);
alter table public.bs_settings enable row level security;
create policy "settings all owners" on public.bs_settings for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

create table if not exists public.bs_secrets (
  name text primary key, value text not null, updated_at timestamptz not null default now()
);
alter table public.bs_secrets enable row level security;
create policy "secrets owners" on public.bs_secrets for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- ---------- updated_at ----------
create or replace function public.bs_touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger bs_items_touch before update on public.bs_items for each row execute function public.bs_touch();
create trigger bs_catalog_touch before update on public.bs_catalog for each row execute function public.bs_touch();

-- ---------- catalog images (Brickset additional images) ----------
create table if not exists public.bs_catalog_images (
  set_num text primary key,
  brickset_id int,
  images jsonb not null default '[]'::jsonb,
  fetched_at timestamptz default now()
);
alter table public.bs_catalog_images enable row level security;
create policy "catalog images public read" on public.bs_catalog_images for select to anon, authenticated using (true);

-- ---------- orders ----------
create sequence if not exists public.bs_order_seq start 1001;
create table if not exists public.bs_orders (
  id uuid primary key default gen_random_uuid(),
  number int not null default nextval('public.bs_order_seq'),
  customer_name text not null,
  phone text not null,
  city text,
  delivery text not null default 'pickup',
  note text,
  items jsonb not null,
  total numeric not null,
  pay_method text not null,
  status text not null default 'new',
  lang text default 'he',
  created_at timestamptz not null default now()
);
alter table public.bs_orders enable row level security;
create policy "orders owners all" on public.bs_orders for all to authenticated using (public.bs_is_owner()) with check (public.bs_is_owner());

-- ---------- asset jobs (assets edge function queue) ----------
create table if not exists public.bs_asset_jobs (
  id bigserial primary key,
  url text not null,
  path text not null,
  content_type text,
  status text not null default 'pending',
  bytes int,
  public_url text,
  error text,
  created_at timestamptz default now()
);
alter table public.bs_asset_jobs enable row level security;

-- ---------- storage bucket for assets (public read) ----------
insert into storage.buckets (id, name, public) values ('bs-assets', 'bs-assets', true) on conflict (id) do nothing;

-- ---------- functions ----------
create or replace function public.bs_asset_import(p_url text, p_path text, p_type text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare rid bigint;
begin
  insert into public.bs_asset_jobs(url, path, content_type) values (p_url, p_path, p_type);
  select net.http_post(url := 'https://__PROJECT_REF__.supabase.co/functions/v1/assets', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 150000) into rid;
  return rid;
end $$;

create or replace function public.bs_shop_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_object_agg(key, value) from public.bs_settings where key in ('shop_demo','shop_whatsapp','shop_bit_phone','usd_ils','vat_included');
$$;

create or replace function public.bs_place_order(o jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n integer; oid uuid;
begin
  if coalesce(length(o->>'customer_name'),0) < 2 or coalesce(length(o->>'phone'),0) < 9 then raise exception 'missing name or phone'; end if;
  if jsonb_array_length(o->'items') < 1 or jsonb_array_length(o->'items') > 60 then raise exception 'bad items'; end if;
  insert into public.bs_orders(customer_name, phone, city, delivery, note, items, total, pay_method, lang)
  values (left(o->>'customer_name',80), left(o->>'phone',20), left(o->>'city',80), coalesce(o->>'delivery','pickup'), left(o->>'note',500), o->'items', (o->>'total')::numeric, coalesce(o->>'pay_method','whatsapp'), coalesce(o->>'lang','he'))
  returning number, id into n, oid;
  return jsonb_build_object('number', n, 'id', oid);
end $$;

-- ---------- views ----------
create or replace view public.bs_inventory as
select i.id, i.kind, i.set_num, coalesce(c.number, i.set_num) as number,
       coalesce(i.custom_name, c.name) as name, c.theme, c.subtheme, c.year, c.pieces, c.minifigs,
       c.age_min, coalesce(c.image_url, i.photo_url) as image_url, coalesce(c.thumb_url, i.photo_url) as thumb_url, c.exit_date, c.availability, c.rrp_us, c.ean as catalog_ean,
       (c.exit_date is not null and c.exit_date < current_date) as retired,
       i.location, l.wall, i.qty, i.condition, i.status, i.price, i.price_source, i.tags, i.notes,
       i.photo_url, i.ean, i.created_at, i.updated_at,
       i.part_no, i.color_id, i.color_name, i.part_cat, i.bl_price
from public.bs_items i
left join public.bs_catalog c on c.set_num = i.set_num
left join public.bs_locations l on l.code = i.location;

create or replace view public.bs_shop as
select i.id, i.kind, i.set_num, c.number, coalesce(c.name, i.custom_name) as name, c.theme, c.subtheme, c.year, c.pieces, c.minifigs, c.age_min,
       c.packaging, c.availability, c.launch_date, c.exit_date, c.rrp_us, c.rrp_de, coalesce(c.image_url, i.photo_url) as image_url, coalesce(c.thumb_url, i.photo_url) as thumb_url, c.dims, c.model_dims,
       c.rating, c.rating_count, c.instructions_count, c.additional_images, c.tags as catalog_tags, c.description_en, c.description_he,
       (c.exit_date is not null and c.exit_date <= current_date) or c.availability = 'Retired' as retired,
       i.qty, i.condition, i.price, i.tags, i.photo_url, i.created_at, i.updated_at, false as demo
from public.bs_items i
left join public.bs_catalog c on c.set_num = i.set_num
where i.status = 'sale' and i.qty > 0;

create or replace view public.bs_shop_catalog as
select set_num, number, name, theme, subtheme, year, pieces, minifigs, age_min, age_max, packaging, availability, launch_date, exit_date,
       rrp_us, rrp_de, rrp_uk, image_url, thumb_url, ean, dims, model_dims, rating, rating_count, instructions_count, additional_images, tags,
       description_en, description_he,
       (exit_date is not null and exit_date <= current_date) or availability = 'Retired' as retired
from public.bs_catalog c;

create or replace view public.bs_shop_boxes as
select set_num,
  (select i->>'image' from jsonb_array_elements(images) i where i->>'image' ~* '_box[13]_' limit 1) as front,
  (select i->>'image' from jsonb_array_elements(images) i where i->>'image' ~* '_box[56]_' limit 1) as back,
  (select i->>'image' from jsonb_array_elements(images) i where i->>'image' ~* '_boxprod' limit 1) as prod
from public.bs_catalog_images;

create or replace view public.bs_shop_box_art as
select substring(path from 'boxes/web/(.*)-(spine|angle)\.png$') as set_num,
  max(public_url) filter (where path like '%-spine.png') as spine_url,
  max(public_url) filter (where path like '%-angle.png') as angle_url
from public.bs_asset_jobs
where path like 'boxes/web/%' and status = 'done'
group by 1;

create or replace view public.bs_shop_demo as
with s as (
  select coalesce((select value::numeric from public.bs_settings where key = 'usd_ils'), 3.1) as usd,
         coalesce((select value::numeric from public.bs_settings where key = 'retired_multiplier'), 1.2) as mult
), ranked as (
  select c.*, row_number() over (partition by c.theme order by c.rating_count desc nulls last, c.pieces desc nulls last) as rn,
         (c.set_num in (select set_num from public.bs_shop_box_art where spine_url is not null and angle_url is not null)) as has_box
  from public.bs_catalog c
  where c.image_url is not null and c.rrp_us is not null and c.pieces > 60
    and c.theme = any (array['Harry Potter','Star Wars','Disney','Botanicals','City','Icons','Technic','Creator','Ideas','Marvel Super Heroes','Ninjago','Friends','Architecture','Speed Champions','Minecraft','Super Mario','Classic','Duplo','Art','Jurassic World'])
)
select gen_random_uuid() as id, 'set'::text as kind, r.set_num, r.number, r.name, r.theme, r.subtheme, r.year, r.pieces, r.minifigs, r.age_min, r.packaging, r.availability,
  r.launch_date, r.exit_date, r.rrp_us, r.rrp_de, r.image_url, r.thumb_url, r.dims, r.model_dims, r.rating, r.rating_count, r.instructions_count, r.additional_images,
  r.tags as catalog_tags, r.description_en, r.description_he,
  (r.exit_date is not null and r.exit_date <= current_date) or r.availability = 'Retired' as retired,
  case when r.rn = 1 then 2 else 1 end as qty, 'sealed'::text as condition,
  round(r.rrp_us * s.usd * case when r.exit_date is not null and r.exit_date <= current_date then s.mult else 1::numeric end / 10::numeric) * 10::numeric as price,
  '{}'::text[] as tags, null::text as photo_url, now() as created_at, now() as updated_at, true as demo
from ranked r, s
where r.rn <= 3 or r.has_box;

-- public read for the shop layer (anon)
grant select on public.bs_shop, public.bs_shop_demo, public.bs_shop_catalog, public.bs_shop_boxes, public.bs_shop_box_art, public.bs_catalog_images to anon, authenticated;
grant execute on function public.bs_shop_config() to anon, authenticated;
grant execute on function public.bs_place_order(jsonb) to anon, authenticated;

-- parts import: bs_import_parts(p_rows jsonb, p_location text, p_status text) in the live project (17.10).
-- Sets qty on re-import, inserts new part+colour lines with the BrickLink picture URL, logs movements. Owner only.
