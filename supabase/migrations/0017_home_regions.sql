-- Migration 0017: Ana sayfada gösterilecek bölge seçimi
-- home_regions: bölge slug'larından oluşan jsonb dizi.
--   null            → tüm bölgeler gösterilir (varsayılan, geriye dönük uyum)
--   []              → hiç bölge gösterilmez (Popüler Bölgeler bölümü gizlenir)
--   ["slug", ...]   → yalnızca listelenen bölgeler gösterilir
alter table site_settings
  add column if not exists home_regions jsonb;
