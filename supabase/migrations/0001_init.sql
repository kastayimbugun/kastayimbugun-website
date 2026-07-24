-- Kastayım Bugün Villaları — ilk şema
-- Faz 1: tablolar, kısıtlar, RLS politikaları, storage bucket
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

-- Tarih aralığı çakışma kısıtı için gerekli
create extension if not exists btree_gist;

-- ---------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------

-- updated_at otomatik güncellensin
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------

-- Yönetici rolleri (auth.users'a bağlı)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Oturum açan kişi yönetici/editör mü?
-- (profiles tablosundan SONRA tanımlanmalı: SQL fonksiyon gövdesi oluşturulurken doğrulanır)
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'editor')
  );
$$;

-- Bölgeler
create table regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  province text not null,
  hero_image text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Kategoriler (mevcut src/lib/categories.ts karşılığı)
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_tr text not null,
  name_en text not null,
  icon text,
  sort_order int not null default 0,
  featured boolean not null default false
);

-- Villalar
create table villas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  code text unique,                                  -- kartlarda gösterilen tesis kodu (KBV1234)
  region_id uuid references regions(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),

  capacity int not null check (capacity > 0),
  bedrooms int not null check (bedrooms >= 0),
  bathrooms int not null check (bathrooms >= 0),
  pool text not null default 'private' check (pool in ('private', 'shared', 'none')),
  size_m2 int,
  distance_to_sea int,                               -- metre

  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count int not null default 0,
  featured boolean not null default false,
  discount_percent int check (discount_percent between 0 and 90),
  deal_tag text check (deal_tag in ('shortStay', 'earlyBooking', 'lastMinute')),

  check_in time not null default '16:00',
  check_out time not null default '10:00',
  min_nights int not null default 1 check (min_nights > 0),

  base_price numeric(10,2) not null check (base_price >= 0),
  cleaning_fee numeric(10,2) not null default 0 check (cleaning_fee >= 0),
  service_rate numeric(4,3) not null default 0.05 check (service_rate between 0 and 1),
  currency text not null default 'TRY',

  description_tr text,
  description_en text,
  video_url text,
  lat numeric(9,6),
  lng numeric(9,6),
  amenities text[] not null default '{}',            -- src/lib/types.ts > AmenityKey ile birebir

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index villas_status_featured_idx on villas (status, featured);
create index villas_region_idx on villas (region_id);
create index villas_amenities_idx on villas using gin (amenities);

create trigger villas_set_updated_at
  before update on villas
  for each row execute function set_updated_at();

-- Villa ↔ kategori
create table villa_categories (
  villa_id uuid not null references villas(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (villa_id, category_id)
);

-- Görseller
create table villa_images (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references villas(id) on delete cascade,
  storage_path text not null,                        -- villa-images bucket'ındaki yol
  sort_order int not null default 0,
  alt_tr text,
  alt_en text,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index villa_images_villa_idx on villa_images (villa_id, sort_order);

-- Sezon fiyatları — aralık [starts_on, ends_on)
create table villa_seasons (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references villas(id) on delete cascade,
  label_tr text not null,
  label_en text not null,
  starts_on date not null,
  ends_on date not null,
  price numeric(10,2) not null check (price >= 0),
  min_nights int,
  check (ends_on > starts_on)
);
create index villa_seasons_villa_idx on villa_seasons (villa_id, starts_on);

-- Dolu/kapalı tarihler — aynı villada çakışan aralık DB seviyesinde engellenir
create table villa_blocks (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references villas(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  source text not null default 'manual' check (source in ('manual', 'booking', 'ical')),
  note text,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on),
  exclude using gist (
    villa_id with =,
    daterange(starts_on, ends_on, '[)') with &&
  )
);
create index villa_blocks_villa_idx on villa_blocks (villa_id, starts_on);

-- Rezervasyon talepleri
create table booking_requests (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete set null,
  check_in date not null,
  check_out date not null,
  adults int not null default 2 check (adults > 0),
  children int not null default 0 check (children >= 0),
  babies int not null default 0 check (babies >= 0),
  full_name text not null,
  phone text not null,
  email text,
  note text,
  price_estimate numeric(10,2),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'confirmed', 'cancelled')),
  source text,                                       -- hangi sayfa / utm
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index booking_requests_status_idx on booking_requests (status, created_at desc);

create trigger booking_requests_set_updated_at
  before update on booking_requests
  for each row execute function set_updated_at();

-- İletişim formu
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Yorumlar (Faz 8'de aktif olacak)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references villas(id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_villa_idx on reviews (villa_id, published);

-- ---------------------------------------------------------------
-- RLS — hepsi açık, sonra politika
-- ---------------------------------------------------------------

alter table profiles          enable row level security;
alter table regions           enable row level security;
alter table categories        enable row level security;
alter table villas            enable row level security;
alter table villa_categories  enable row level security;
alter table villa_images      enable row level security;
alter table villa_seasons     enable row level security;
alter table villa_blocks      enable row level security;
alter table booking_requests  enable row level security;
alter table contact_messages  enable row level security;
alter table reviews           enable row level security;

-- Herkese açık okuma: yalnızca yayınlanmış içerik
create policy "public reads regions"
  on regions for select using (true);

create policy "public reads categories"
  on categories for select using (true);

create policy "public reads published villas"
  on villas for select using (status = 'published' or is_staff());

create policy "public reads images of published villas"
  on villa_images for select using (
    exists (select 1 from villas v where v.id = villa_id
            and (v.status = 'published' or is_staff()))
  );

create policy "public reads seasons of published villas"
  on villa_seasons for select using (
    exists (select 1 from villas v where v.id = villa_id
            and (v.status = 'published' or is_staff()))
  );

-- Müsaitlik takvimi için blok tarihleri de okunabilir olmalı
create policy "public reads blocks of published villas"
  on villa_blocks for select using (
    exists (select 1 from villas v where v.id = villa_id
            and (v.status = 'published' or is_staff()))
  );

create policy "public reads villa_categories"
  on villa_categories for select using (true);

create policy "public reads published reviews"
  on reviews for select using (published or is_staff());

-- Kendi profilini okuma
create policy "own profile read"
  on profiles for select using (id = auth.uid() or is_staff());

-- Yazma yetkisi yalnızca admin/editör
create policy "staff writes regions"          on regions          for all using (is_staff()) with check (is_staff());
create policy "staff writes categories"       on categories       for all using (is_staff()) with check (is_staff());
create policy "staff writes villas"           on villas           for all using (is_staff()) with check (is_staff());
create policy "staff writes villa_categories" on villa_categories for all using (is_staff()) with check (is_staff());
create policy "staff writes villa_images"     on villa_images     for all using (is_staff()) with check (is_staff());
create policy "staff writes villa_seasons"    on villa_seasons    for all using (is_staff()) with check (is_staff());
create policy "staff writes villa_blocks"     on villa_blocks     for all using (is_staff()) with check (is_staff());
create policy "staff reads requests"          on booking_requests for all using (is_staff()) with check (is_staff());
create policy "staff reads messages"          on contact_messages for all using (is_staff()) with check (is_staff());
create policy "staff writes reviews"          on reviews          for all using (is_staff()) with check (is_staff());

-- NOT: booking_requests ve contact_messages için anon INSERT politikası BİLEREK yok.
-- Kayıtlar Next tarafındaki Server Function üzerinden service_role ile atılır;
-- doğrulama, fiyat hesabı ve spam kontrolü sunucuda kalsın diye (Faz 4).

-- ---------------------------------------------------------------
-- Storage: villa görselleri (Faz 3)
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('villa-images', 'villa-images', true)
on conflict (id) do nothing;

create policy "public reads villa images"
  on storage.objects for select
  using (bucket_id = 'villa-images');

create policy "staff uploads villa images"
  on storage.objects for insert
  with check (bucket_id = 'villa-images' and is_staff());

create policy "staff updates villa images"
  on storage.objects for update
  using (bucket_id = 'villa-images' and is_staff());

create policy "staff deletes villa images"
  on storage.objects for delete
  using (bucket_id = 'villa-images' and is_staff());
