-- Faz 5.7 (Dalga 4.3): fiyat kuralları.
--
-- Yol haritası uyarısı: "karmaşık fiyatlandırma" Lodgify yorumlarının %60'ında
-- olumsuz. Bu yüzden kural sayısı DÖRT ile sınırlı ve hepsi villa satırında
-- düz sütun (ayrı kural motoru YOK). Boş/0 bırakılan kural uygulanmaz.
--
-- Hepsi calcPrice() içinde uygulanır (tek doğruluk kaynağı, ARCHITECTURE §4):
--   1) Hafta sonu farkı  — Cuma/Cumartesi gecelerine yüzde prim
--   2) Uzun konaklama indirimi — 7+ ve 28+ gecede yüzde indirim
--   3) Son dakika indirimi — girişe N günden az kala yüzde indirim
--   4) Kapasite üstü kişi ücreti — eşik üstü kişi başına gecelik ek ücret
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

alter table villas
  add column if not exists weekend_premium_percent int
    check (weekend_premium_percent between 0 and 100),

  add column if not exists los_weekly_discount_percent int
    check (los_weekly_discount_percent between 0 and 90),
  add column if not exists los_monthly_discount_percent int
    check (los_monthly_discount_percent between 0 and 90),

  add column if not exists last_minute_discount_percent int
    check (last_minute_discount_percent between 0 and 90),
  add column if not exists last_minute_days int
    check (last_minute_days between 1 and 90),

  add column if not exists extra_guest_fee numeric(10,2)
    check (extra_guest_fee >= 0),
  add column if not exists extra_guest_after int
    check (extra_guest_after >= 1);

-- Mevcut "staff writes villas" politikası tablo geneli (for all) olduğu için
-- yeni sütunlar otomatik kapsanır; ayrı RLS gerekmez.
