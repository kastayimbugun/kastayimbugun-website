-- 0025_scale_indexes_and_constraints.sql
--
-- 600 villa + binlerce rezervasyon ölçeğine hazırlık.
--
-- Mevcut index'ler iyi seçilmiş; boşluk arama ve takvim yollarında. Aşağıdaki
-- her satır, kodda gerçekten çalışan bir sorguya karşılık gelir (denetimde
-- `src/lib/data/**` okunarak çıkarıldı) — spekülatif index yok.

create extension if not exists pg_trgm;

-- ===========================================================================
-- 1. Arama — `ilike %terim%` bugün HER aramada tam tablo taraması yapıyor
-- ===========================================================================

-- data/admin/bookings.ts: ad / telefon / e-posta araması
create index if not exists booking_requests_search_idx
  on public.booking_requests
  using gin (full_name gin_trgm_ops, phone gin_trgm_ops, email gin_trgm_ops);

-- data/admin/villas.ts: villa adı / slug / tesis kodu araması
create index if not exists villas_search_idx
  on public.villas
  using gin (name gin_trgm_ops, slug gin_trgm_ops, code gin_trgm_ops);

-- data/admin/applications.ts: 5 sütunda arama
create index if not exists villa_applications_search_idx
  on public.villa_applications
  using gin (owner_name gin_trgm_ops, phone gin_trgm_ops, email gin_trgm_ops,
             villa_name gin_trgm_ops, location gin_trgm_ops);

-- ===========================================================================
-- 2. Takvim ve tarih aralıkları
-- ===========================================================================

-- data/admin/bookings.ts: villaya göre talep filtresi (FK index'i yoktu)
create index if not exists booking_requests_villa_checkin_idx
  on public.booking_requests (villa_id, check_in);

-- data/admin/calendar.ts + stats.ts: onaylı rezervasyonların tarih penceresi.
-- Mevcut (status, created_at) index'i bu sorguda işe yaramıyor.
create index if not exists booking_requests_confirmed_range_idx
  on public.booking_requests (check_in, check_out)
  where status = 'confirmed';

-- stats.ts: "bu ay / son 7 gün" sayımları — öncü sütun `status` olduğu için
-- mevcut index kullanılamıyordu.
create index if not exists booking_requests_created_idx
  on public.booking_requests (created_at desc);

-- calendar.ts + stats.ts: villa filtresi OLMADAN tarih aralığı taraması.
-- Mevcut (villa_id, starts_on) index'inin öncü sütunu yok → tam tarama.
create index if not exists villa_blocks_range_idx
  on public.villa_blocks (starts_on, ends_on);

-- actions/admin/bulk.ts: villa + kaynak + tarih
create index if not exists villa_blocks_villa_src_idx
  on public.villa_blocks (villa_id, source, starts_on);

-- ===========================================================================
-- 3. Liste sıralamaları ve ters yön aramalar
-- ===========================================================================

-- data/admin/villas.ts: ad / fiyat / yeni sıralamaları her sayfalamada tam sort yapıyordu
create index if not exists villas_status_name_idx  on public.villas (status, name);
create index if not exists villas_price_idx        on public.villas (base_price);
create index if not exists villas_created_idx      on public.villas (created_at desc);

-- data/categories.ts + actions/admin/categories.ts: kategoriden villaya bakış.
-- PK (villa_id, category_id) ters yönde kullanılamıyor.
create index if not exists villa_categories_category_idx
  on public.villa_categories (category_id, sort_order);

-- data/pages.ts: footer sayfaları
create index if not exists pages_footer_idx
  on public.pages (status, show_in_footer, sort_order);

-- Personel silinirken booking_notes.author_id FK'si tam tarama yapıyordu
create index if not exists booking_notes_author_idx
  on public.booking_notes (author_id);

-- 0009'daki pages_slug_idx gereksiz: `slug text unique not null` zaten aynı
-- index'i oluşturuyor. İkisi de yazma maliyeti çıkarıyordu.
drop index if exists public.pages_slug_idx;

-- ===========================================================================
-- 4. Bütünlük kısıtları
--
--    NOT: aşağıdaki iki `exclude` kısıtı, veride ÇAKIŞMA VARSA eklenemez.
--    Uygulamadan önce kontrol sorgularını çalıştırın (dosyanın sonunda).
-- ===========================================================================

-- Sezonlarda çakışma engeli. `villa_blocks`'ta bu kısıt vardı, sezonlarda yoktu:
-- aynı villada aynı güne iki farklı fiyat girilebiliyor ve site ile panel
-- hangisini okuduğuna göre farklı tutar gösterebiliyordu.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'villa_seasons_no_overlap'
  ) then
    alter table public.villa_seasons
      add constraint villa_seasons_no_overlap
      exclude using gist (
        villa_id with =,
        daterange(starts_on, ends_on, '[)') with &&
      );
  end if;
exception when others then
  raise notice 'villa_seasons_no_overlap eklenemedi (mevcut çakışan sezonlar olabilir): %', sqlerrm;
end $$;

-- Çift rezervasyon engeli. Bugün yalnızca uygulama akışının blok yazmasıyla
-- dolaylı engelleniyor; o akış kırılırsa DB'de hiçbir koruma kalmıyordu.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'booking_requests_no_overlap'
  ) then
    alter table public.booking_requests
      add constraint booking_requests_no_overlap
      exclude using gist (
        villa_id with =,
        daterange(check_in, check_out, '[)') with &&
      ) where (status = 'confirmed' and villa_id is not null);
  end if;
exception when others then
  raise notice 'booking_requests_no_overlap eklenemedi (mevcut çakışan onaylı kayıtlar olabilir): %', sqlerrm;
end $$;

-- Bölge ağacında döngü koruması: A→B, B→A yazılabiliyordu ve `on delete restrict`
-- yüzünden ikisi de bir daha silinemez hale geliyordu.
alter table public.regions
  drop constraint if exists regions_no_self_parent;
alter table public.regions
  add constraint regions_no_self_parent
  check (parent_id is null or parent_id <> id);

create or replace function public.regions_no_cycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cur  uuid := new.parent_id;
  hops int := 0;
begin
  while cur is not null loop
    if cur = new.id then
      raise exception 'regions: döngüsel parent_id';
    end if;
    hops := hops + 1;
    if hops > 10 then
      raise exception 'regions: parent zinciri çok derin';
    end if;
    select parent_id into cur from public.regions where id = cur;
  end loop;
  return new;
end;
$$;

drop trigger if exists regions_no_cycle_trg on public.regions;
create trigger regions_no_cycle_trg
  before insert or update of parent_id on public.regions
  for each row execute function public.regions_no_cycle();

-- Eksik `updated_at` trigger'ları — elle yazılmaya bırakılmıştı, bir yazma yolu
-- eklendiğinde unutuluyordu.
drop trigger if exists villa_applications_set_updated_at on public.villa_applications;
create trigger villa_applications_set_updated_at
  before update on public.villa_applications
  for each row execute function public.set_updated_at();

drop trigger if exists villa_application_questions_set_updated_at
  on public.villa_application_questions;
create trigger villa_application_questions_set_updated_at
  before update on public.villa_application_questions
  for each row execute function public.set_updated_at();

-- Eksik check kısıtları (negatif değer girilebiliyordu).
alter table public.booking_requests
  drop constraint if exists booking_requests_price_nonneg;
alter table public.booking_requests
  add constraint booking_requests_price_nonneg
  check (price_estimate is null or price_estimate >= 0);

-- ===========================================================================
-- UYGULAMADAN ÖNCE ÇALIŞTIRIN — çakışma varsa yukarıdaki iki exclude kısıtı
-- sessizce atlanır (notice ile) ve veri düzeltilmeden tekrar denenmelidir.
--
--   -- çakışan sezonlar
--   select a.villa_id, a.starts_on, a.ends_on, b.starts_on, b.ends_on
--     from villa_seasons a join villa_seasons b
--       on a.villa_id = b.villa_id and a.id < b.id
--      and daterange(a.starts_on, a.ends_on, '[)')
--       && daterange(b.starts_on, b.ends_on, '[)');
--
--   -- çakışan onaylı rezervasyonlar
--   select a.id, b.id, a.villa_id, a.check_in, a.check_out
--     from booking_requests a join booking_requests b
--       on a.villa_id = b.villa_id and a.id < b.id
--      and a.status = 'confirmed' and b.status = 'confirmed'
--      and daterange(a.check_in, a.check_out, '[)')
--       && daterange(b.check_in, b.check_out, '[)');
-- ===========================================================================
