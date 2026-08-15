-- Migration 0019: Havuz ölçüleri, hasar depozitosu ve bakanlık belge no (villa detay)
-- Hepsi opsiyonel; boş olan alan detay sayfasında hiç gösterilmez.
alter table villas
  add column if not exists pool_width numeric,       -- havuz eni (m)
  add column if not exists pool_length numeric,      -- havuz boyu (m)
  add column if not exists pool_depth numeric,       -- havuz derinliği (m)
  add column if not exists damage_deposit integer,   -- hasar depozitosu (TL)
  add column if not exists ministry_cert_no text;    -- T.C. Kültür ve Turizm Bakanlığı belge no
