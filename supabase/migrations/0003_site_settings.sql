-- Faz 3: site geneli medya ayarları (ana sayfa hero'su)
--
-- Ana sayfadaki hero görseli/videosu tek bir satırda tutulur; acente panelden
-- değiştirebilsin diye kodda sabit tutulmuyor. Tek satır kısıtı:
-- id boolean primary key + check(id) → tabloya yalnızca `true` satırı girebilir.

create table if not exists site_settings (
  id boolean primary key default true check (id),
  hero_image text,        -- villa-images bucket'ındaki yol veya tam URL
  hero_video_url text,    -- sessiz, kısa döngü videosu (mp4/webm). Boşsa yalnızca poster.
  updated_at timestamptz not null default now()
);

insert into site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists site_settings_updated_at on site_settings;
create trigger site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

alter table site_settings enable row level security;

-- Ana sayfa herkese açık okur; yalnızca admin/editör yazar.
drop policy if exists "public reads site settings" on site_settings;
create policy "public reads site settings"
  on site_settings for select using (true);

drop policy if exists "staff writes site settings" on site_settings;
create policy "staff writes site settings"
  on site_settings for all using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------
-- Bölge kartı görselleri için ek bir bucket'a gerek yok:
-- 0001'deki `villa-images` bucket politikaları tüm bucket'ı kapsar.
-- Yol şeması:  villalar/{slug}/…  ·  bolgeler/{slug}.webp  ·  site/hero.webp
-- ---------------------------------------------------------------
