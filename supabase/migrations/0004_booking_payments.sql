-- Faz 5.6: rezervasyon talebine ödeme/depozito takibi.
-- Önceki (kaspanel26) sistemde vardı, bizde yoktu: ödenen tutar, hasar depozitosu,
-- ödeme notu. Online ödeme entegrasyonu DEĞİL (o Faz 8) — acente banka transferiyle
-- kapora alıyor, panelden elle kaydediyor.
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

alter table booking_requests
  add column if not exists paid_amount numeric(10,2) not null default 0
    check (paid_amount >= 0),
  add column if not exists damage_deposit numeric(10,2) not null default 0
    check (damage_deposit >= 0),
  add column if not exists deposit_note text;

-- Mevcut "staff reads requests" politikası booking_requests üzerinde blanket
-- (for all) olduğu için yeni sütunlar otomatik kapsanır; ayrı RLS gerekmez.
