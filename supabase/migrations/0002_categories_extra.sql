-- Faz 2 hazırlığı: kategori tablosuna arayüzün ihtiyaç duyduğu alanlar
-- (src/lib/categories.ts içindeki VillaCategory yapısıyla eşleşsin diye)

alter table categories
  add column if not exists desc_tr text,
  add column if not exists desc_en text,
  add column if not exists color text
    check (color in ('amber', 'rose', 'sky', 'emerald', 'violet', 'teal')),
  add column if not exists image text,
  -- true → ana sayfada tam kaydırmalı satır olarak gösterilir
  add column if not exists featured_on_home boolean not null default false;

-- Kategori içindeki villa sırası elle belirleniyor
alter table villa_categories
  add column if not exists sort_order int not null default 0;
