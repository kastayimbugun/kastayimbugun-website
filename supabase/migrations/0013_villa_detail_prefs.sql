-- Villa detay sayfasının site geneli görünürlük tercihleri (tek jsonb alan).
-- null → tüm alan/bölümler açık kabul edilir (bkz. src/lib/villaDetailPrefs.ts).
alter table site_settings add column if not exists villa_detail_prefs jsonb;
