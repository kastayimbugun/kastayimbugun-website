-- 0024_module_rls_and_private_photos.sql
--
-- İki iş:
--   A) Modül izinlerini RLS'e taşı — YALNIZCA temiz eşleşen tablolarda.
--   B) `villa-applications` bucket'ını gizli yap.
--
-- Ayrıca `is_staff()` çağrılarını InitPlan'a sararak satır-başına yeniden
-- değerlendirmeyi ortadan kaldırır (performans).

-- ===========================================================================
-- 0. has_module(): personelin bir modüle erişimi var mı?
-- ===========================================================================
create or replace function public.has_module(mod text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid())
       and (
         role = 'admin'                                    -- admin tüm modüller
         or (role = 'editor' and mod = any(coalesce(permissions, '{}')))
       )
  );
$$;

comment on function public.has_module(text) is
  'Personelin verilen modüle (villas/reservations/...) erişimi var mı. Tek kaynak: src/lib/auth/permissions.ts';

-- `is_staff()`'i de sertleştir: search_path = '' (pg_temp gölgelemesine kapalı).
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = (select auth.uid())
       and role in ('admin', 'editor')
  );
$$;

-- anon'dan EXECUTE ALMA: herkese açık politikalar (villas, pages, questions)
-- is_staff() çağırıyor.

-- ===========================================================================
-- A. Modül izinleri — temiz eşleşen tablolar
--
--    NEDEN HEPSİ DEĞİL: `booking_requests`, `booking_notes` ve `villa_*`
--    tabloları BİRDEN ÇOK modül tarafından okunuyor ve modül-tablo eşlemesi
--    temiz değil:
--      · `data/admin/calendar.ts`  → booking_requests + villa_blocks, ama sayfa
--        `/yonetim/takvim` `villas` izni istiyor
--      · `data/admin/villas.ts`    → booking_requests (manuel rezervasyon formu
--        ve villa silme durumu), sayfa `villas` izni istiyor
--      · `data/admin/stats.ts`     → ikisi de, dashboard'un modül guard'ı yok
--    Bu tablolara `has_module('reservations')` koymak paneli KIRAR; buna
--    `or has_module('villas')` eklemek ise izni neredeyse herkese açar, yani
--    güvenlik kazancı yok. 0021'deki karar bu yüzden bilinçliydi ve geçerliliğini
--    koruyor. Asıl saldırı vektörü (token'ın JS'e açık olması) 5.8.4'te
--    `httpOnly: true` ile kapatıldı — `createBrowserClient` projede hiç
--    kullanılmıyor, bu yüzden güvenli.
-- ===========================================================================

-- pages ---------------------------------------------------------------------
drop policy if exists "staff manages pages" on public.pages;
create policy "pages module manages pages" on public.pages
  for all
  using ((select public.has_module('pages')))
  with check ((select public.has_module('pages')));

drop policy if exists "public reads published pages" on public.pages;
create policy "public reads published pages" on public.pages
  for select
  using (status = 'published' or (select public.has_module('pages')));

-- regions -------------------------------------------------------------------
drop policy if exists "staff writes regions" on public.regions;
create policy "regions module writes regions" on public.regions
  for all
  using ((select public.has_module('regions')))
  with check ((select public.has_module('regions')));

-- categories ----------------------------------------------------------------
drop policy if exists "staff writes categories" on public.categories;
create policy "categories module writes categories" on public.categories
  for all
  using ((select public.has_module('categories')))
  with check ((select public.has_module('categories')));

-- site_settings -------------------------------------------------------------
drop policy if exists "staff writes site settings" on public.site_settings;
create policy "settings module writes site settings" on public.site_settings
  for all
  using ((select public.has_module('settings')))
  with check ((select public.has_module('settings')));

-- villa_applications --------------------------------------------------------
drop policy if exists "staff manages applications" on public.villa_applications;
create policy "applications module manages" on public.villa_applications
  for all
  using ((select public.has_module('applications')))
  with check ((select public.has_module('applications')));

drop policy if exists "staff manages application questions"
  on public.villa_application_questions;
create policy "applications module manages questions"
  on public.villa_application_questions
  for all
  using ((select public.has_module('applications')))
  with check ((select public.has_module('applications')));

-- booking_notes -------------------------------------------------------------
-- Tek okuyucu `reservations` (data+actions/admin/bookings.ts) → temiz eşleşme.
drop policy if exists "staff writes booking notes" on public.booking_notes;
create policy "reservations module writes booking notes" on public.booking_notes
  for all
  using ((select public.has_module('reservations')))
  with check ((select public.has_module('reservations')));

-- ===========================================================================
-- B. villa-applications bucket'ı GİZLİ
--
--    `0020` bucket'ı `public = true` açmış ve SELECT politikası koşulsuzdu
--    (`bucket_id = 'villa-applications'`). Yol tahmin edilemez ama LİSTELEME
--    de SELECT'e bağlı: anon anahtarla `/storage/v1/object/list/...` tüm
--    nesneleri döküyor ve her biri public URL'den indirilebiliyordu.
--    Villa sahiplerinin iç mekân fotoğrafları, açık adresle aynı kayıtta.
--    docs/panel-kurallari.md §2: "Public bucket'a asla özel veri konmaz."
-- ===========================================================================
update storage.buckets set public = false where id = 'villa-applications';

drop policy if exists "public reads application photos" on storage.objects;
create policy "applications module reads application photos"
  on storage.objects for select
  using (
    bucket_id = 'villa-applications'
    and (select public.has_module('applications'))
  );

-- ===========================================================================
-- C. Kalan is_staff() politikalarını InitPlan'a sar (performans)
--
--    Çıplak `is_staff()` satır BAŞINA yeniden çalışır ve her seferinde
--    `profiles` okur; 12.000 görsel satırında 12.000 fonksiyon çağrısı demek.
--    `(select is_staff())` Postgres'in bunu tek seferlik InitPlan'a çevirmesini
--    sağlar. Politikaların anlamı değişmez.
-- ===========================================================================
drop policy if exists "staff writes villas" on public.villas;
create policy "staff writes villas" on public.villas
  for all using ((select public.is_staff())) with check ((select public.is_staff()));

drop policy if exists "public reads published villas" on public.villas;
create policy "public reads published villas" on public.villas
  for select using (status = 'published' or (select public.is_staff()));

drop policy if exists "staff reads requests" on public.booking_requests;
create policy "staff reads requests" on public.booking_requests
  for all using ((select public.is_staff())) with check ((select public.is_staff()));
