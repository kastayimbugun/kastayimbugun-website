-- 0009'daki pages RLS politikalarını projenin yetki desenine getirir.
--
-- SORUN: 0009 politikaları `auth.role() = 'authenticated'` kullanıyordu.
-- Bu, "giriş yapmış HERHANGİ BİR kullanıcı" demek — panel yetkisi olmayan
-- bir hesap (ör. profiles.role = 'viewer') doğrudan Supabase API'si üzerinden
-- sayfa ekleyebilir, değiştirebilir, silebilirdi. Ayrıca taslak sayfalar
-- giriş yapmış herkese görünüyordu.
--
-- docs/panel-kurallari.md §Katman 4: RLS nihai bariyerdir ve `is_staff()`
-- ile zorlanır — "tüm uygulama kodu bypass edilse bile". Diğer tüm tablolar
-- (villas, booking_requests, site_settings…) bu deseni kullanıyor.
--
-- NOT: Uygulama katmanı zaten güvenliydi (actions/admin/pages.ts her işlemde
-- getStaffUser() çağırıyor); bu düzeltme savunmanın son katmanını kapatıyor.
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

drop policy if exists "Published pages are viewable by everyone" on public.pages;
drop policy if exists "Staff members can insert pages" on public.pages;
drop policy if exists "Staff members can update pages" on public.pages;
drop policy if exists "Staff members can delete pages" on public.pages;

-- Okuma: yayınlanmış sayfalar herkese açık; taslakları yalnızca personel görür.
create policy "public reads published pages"
  on public.pages for select
  using (status = 'published' or is_staff());

-- Yazma: yalnızca admin/editor (villas tablosuyla aynı desen).
create policy "staff writes pages"
  on public.pages for all
  using (is_staff())
  with check (is_staff());
