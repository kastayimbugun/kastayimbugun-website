-- Migration 0018: Ana sayfa bölüm sırası ve aç/kapa
-- home_sections: {key, enabled} nesnelerinden oluşan sıralı jsonb dizi.
--   null → varsayılan sıra kullanılır (kod tarafında üretilir)
--   [ {"key":"featured","enabled":true}, {"key":"banner","enabled":true},
--     {"key":"category:kalkan","enabled":true}, {"key":"shortStay","enabled":true} ... ]
-- Anahtarlar: "featured", "banner", "shortStay", "category:<slug>"
alter table site_settings
  add column if not exists home_sections jsonb;
