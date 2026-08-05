-- Faz 5.6: "Mesafe Cetveli" — eski sistemde (kaspanel26) vardı, bizde yoktu.
-- "Plaj" alanı bilerek eklenmedi: mevcut distance_to_sea (metre) zaten bu işi
-- görüyor ve sitede (VillaDetailClient, kart) kullanılıyor — aynı bilgiyi iki
-- ayrı alanda tutup senkron dışı kalma riski almayalım.
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

alter table villas
  add column if not exists distance_airport_km int check (distance_airport_km >= 0),
  add column if not exists distance_market_km int check (distance_market_km >= 0),
  add column if not exists distance_restaurant_km int check (distance_restaurant_km >= 0),
  add column if not exists distance_transit_km int check (distance_transit_km >= 0),
  add column if not exists distance_center_km int check (distance_center_km >= 0);

-- Mevcut "staff writes villas" politikası blanket (for all) olduğu için yeni
-- sütunlar otomatik kapsanır; ayrı RLS gerekmez.
