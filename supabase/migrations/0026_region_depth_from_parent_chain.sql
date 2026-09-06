-- 0026_region_depth_from_parent_chain.sql
--
-- `regions.depth` sütununu `parent_id` zincirinden yeniden hesaplar ve bundan
-- sonra tutarlı kalmasını veritabanına devreder.
--
-- SORUN: panel bölge ağacını tam DÖRT seviye elle kuruyor ve derinliği
-- `Math.min(depth, 3)` ile kırpıyordu. Gerçek veride zincirler 6 seviyeye
-- iniyor (Antalya > Kaş > Kaş Merkez > İslamlar > Üzümlü > Patara > Kışla).
-- Sonuç: 25 bölgenin 7'si panelde hiç görünmüyordu ve aynı 7 kayıtta
-- `depth` sütunu yanlıştı — hepsinde 3 yazıyor, gerçek zincir 4, 5 ve 6.
--
--   Akbel      3 → 4      Ortaalan   3 → 5
--   Bezirgan   3 → 4      Patara     3 → 5
--   Kızıltaş   3 → 4      Kışla      3 → 6
--   Üzümlü     3 → 4
--
-- KARAR: sütun korunuyor ama artık TÜRETİLMİŞ bir önbellek. Tek doğruluk
-- kaynağı `parent_id`. Uygulama kodu derinliği her yerde zincirden hesaplıyor
-- (yani bu migration uygulanmadan da doğru çalışır); sütun ise `scripts/
-- migrate-villas.mjs` ve panel dışı okuyucular için burada doğru tutuluyor.
--
-- Bu dosya tekrar tekrar çalıştırılabilir (idempotent).

-- ===========================================================================
-- 1. Derinliği zincirden hesaplayan yardımcı
-- ===========================================================================

-- 0025'teki `regions_no_cycle` trigger'ı 10 basamaktan uzun zinciri zaten
-- reddediyor; buradaki sayaç aynı sınırı koruyor ki bozuk bir veride
-- (örneğin trigger'dan önce yazılmış bir döngüde) sonsuz döngüye girmeyelim.
create or replace function public.regions_chain_depth(p_parent uuid)
returns int
language plpgsql
stable
set search_path = ''
as $$
declare
  cur   uuid := p_parent;
  d     int  := 0;
begin
  while cur is not null loop
    d := d + 1;
    if d > 10 then
      raise exception 'regions: parent zinciri çok derin';
    end if;
    select parent_id into cur from public.regions where id = cur;
  end loop;
  return d;
end;
$$;

-- ===========================================================================
-- 2. Mevcut veriyi düzelt — kökten aşağı yürüyerek yeniden hesapla
-- ===========================================================================

-- Not: bir döngüye takılmış kayıt (kökten ulaşılamayan) bu hesaba girmez ve
-- mevcut değerini korur. `regions_no_cycle` böyle bir kaydın oluşmasını
-- engelliyor; yine de aşağıdaki denetim sorgusuyla kontrol edin.
with recursive tree as (
  select id, 0 as d
    from public.regions
   where parent_id is null
  union all
  select r.id, t.d + 1
    from public.regions r
    join tree t on r.parent_id = t.id
   where t.d < 32 -- emniyet: bozuk veride sonsuz özyineleme olmasın
)
update public.regions r
   set depth = t.d
  from tree t
 where r.id = t.id
   and r.depth is distinct from t.d;

-- ===========================================================================
-- 3. Bundan sonra tutarlı kalsın — yazma yollarını veritabanı bağlar
-- ===========================================================================

-- Her yazmada satırın kendi derinliği zincirden yeniden hesaplanır. Böylece
-- `depth`'e ne yazıldığının önemi kalmaz: uygulama, panel, SQL editörü ve
-- `scripts/migrate-villas.mjs` (bugün `parent.depth + 1` yazıyor — bozuk bir
-- üstten türetirse yanlış olurdu) aynı doğru değeri elde eder.
create or replace function public.regions_set_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.depth := public.regions_chain_depth(new.parent_id);
  return new;
end;
$$;

drop trigger if exists regions_set_depth_trg on public.regions;
create trigger regions_set_depth_trg
  before insert or update on public.regions
  for each row execute function public.regions_set_depth();

-- Üst bölge değişince ALT AĞACIN tamamı kayar. Yukarıdaki trigger yalnızca
-- kendi satırını düzeltir; taşınan bölgenin altındaki kayıtlar bu olmadan
-- eski derinlikleriyle kalırdı.
create or replace function public.regions_resync_subtree_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  with recursive sub as (
    select r.id, new.depth + 1 as d
      from public.regions r
     where r.parent_id = new.id
    union all
    select c.id, s.d + 1
      from public.regions c
      join sub s on c.parent_id = s.id
     where s.d < 32 -- emniyet
  )
  update public.regions r
     set depth = s.d
    from sub s
   where r.id = s.id
     and r.depth is distinct from s.d;
  return null;
end;
$$;

-- Yalnızca üst bölge GERÇEKTEN değiştiğinde çalışır. `depth` güncellemeleri
-- bu trigger'ı tetiklemez (`of parent_id`), dolayısıyla özyineleme yok.
drop trigger if exists regions_resync_subtree_depth_trg on public.regions;
create trigger regions_resync_subtree_depth_trg
  after update of parent_id on public.regions
  for each row
  when (old.parent_id is distinct from new.parent_id)
  execute function public.regions_resync_subtree_depth();

-- ===========================================================================
-- DENETİM — uyguladıktan sonra çalıştırın, ikisi de 0 satır dönmeli
--
--   -- (a) depth'i zincirle uyuşmayan kayıt kaldı mı?
--   with recursive tree as (
--     select id, name, 0 as d from regions where parent_id is null
--     union all
--     select r.id, r.name, t.d + 1 from regions r join tree t on r.parent_id = t.id
--   )
--   select t.name, r.depth as sutun, t.d as gercek
--     from tree t join regions r on r.id = t.id
--    where r.depth is distinct from t.d;
--
--   -- (b) kökten ulaşılamayan (döngüye takılmış) kayıt var mı?
--   with recursive tree as (
--     select id from regions where parent_id is null
--     union all
--     select r.id from regions r join tree t on r.parent_id = t.id
--   )
--   select id, name, parent_id from regions where id not in (select id from tree);
-- ===========================================================================
