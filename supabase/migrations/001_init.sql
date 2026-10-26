
-- Love Lens Wedding: client gallery portal schema
create extension if not exists pgcrypto;

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  client_name text not null,
  event_date date,
  pin_code varchar(6) not null check (pin_code ~ '^[0-9]{4,6}$'),
  categories text[] not null default array['Haldi','Mehendi','Wedding','Reception'],
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  original_name text not null,
  category text not null check (category in ('Haldi','Mehendi','Wedding','Reception')),
  r2_url text not null,        -- full-resolution original (kept for album design)
  preview_url text not null,   -- ~2400px, shown in the lightbox
  thumb_url text not null,     -- ~900px, shown in the grid
  blur_data_url text,          -- tiny base64 placeholder
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now()
);
create index photos_gallery_idx on public.photos (gallery_id, original_name);

create table public.selections (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  selected_by_client boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (gallery_id, photo_id)
);

-- Failed/successful PIN attempts, used for rate limiting (4-digit PINs are brute-forceable)
create table public.pin_attempts (
  id bigint generated always as identity primary key,
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  ip text not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index pin_attempts_lookup on public.pin_attempts (gallery_id, attempted_at desc);

create view public.gallery_stats with (security_invoker = true) as
select
  g.id as gallery_id,
  (select count(*) from public.photos p where p.gallery_id = g.id) as photo_count,
  (select count(*) from public.selections s
     where s.gallery_id = g.id and s.selected_by_client) as selected_count
from public.galleries g;

-- Row Level Security -----------------------------------------------------------
-- PINs live in this database, so the browser must never query it directly.
-- Anon/authenticated roles get no access at all. The Next.js server uses the
-- service-role key (which bypasses RLS) and enforces PIN checks itself.
alter table public.galleries    enable row level security;
alter table public.photos       enable row level security;
alter table public.selections   enable row level security;
alter table public.pin_attempts enable row level security;

create policy "no direct access" on public.galleries
  for all to anon, authenticated using (false) with check (false);
create policy "no direct access" on public.photos
  for all to anon, authenticated using (false) with check (false);
create policy "no direct access" on public.selections
  for all to anon, authenticated using (false) with check (false);
create policy "no direct access" on public.pin_attempts
  for all to anon, authenticated using (false) with check (false);

revoke all on public.galleries, public.photos, public.selections,
  public.pin_attempts, public.gallery_stats from anon, authenticated;
