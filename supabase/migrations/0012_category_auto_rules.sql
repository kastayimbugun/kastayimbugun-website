-- Otomatik/akıllı vitrin blokları: villaları bir kurala göre kendiliğinden dolan
-- kategoriler. auto_rule doluysa villalar villa_categories yerine kuraldan gelir
-- (bkz. src/lib/data/categories.ts). auto_limit kaç villa gösterileceğini sınırlar.
alter table categories add column if not exists auto_rule  text;
alter table categories add column if not exists auto_limit int not null default 12;

-- Dört yerleşik otomatik blok. Başlangıçta kapalı (show_in_browser/featured_on_home
-- = false) gelir; acente panelden isteyerek açar. slug'lar sabit — kod bunları
-- kurala göre doldurur, ama satırların kendisi normal kategori gibi yönetilir.
insert into categories (slug, name_tr, name_en, color, icon, auto_rule,
                        featured_on_home, featured, show_in_browser, sort_order)
values
 ('populer-villalar','Popüler Villalar','Popular Villas','rose','Star','popular',
    false, false, false, 100),
 ('son-dakika','Son Dakika İndirimleri','Last-Minute Deals','amber','BadgePercent','last_minute',
    false, false, false, 101),
 ('en-uygun','En Uygun Fiyatlı','Best Value','emerald','Tag','cheapest',
    false, false, false, 102),
 ('yeni-eklenenler','Yeni Eklenenler','Newly Added','sky','Sparkles','newest',
    false, false, false, 103)
on conflict (slug) do nothing;
