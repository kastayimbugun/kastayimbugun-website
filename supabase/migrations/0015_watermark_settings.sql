-- 0015_watermark_settings.sql
-- Filigran (Watermark / Şeffaf Logo) ayarlarını site_settings tablosuna ekler.

alter table site_settings
  add column if not exists watermark_enabled boolean not null default true,
  add column if not exists watermark_opacity numeric(3,2) not null default 0.35,
  add column if not exists watermark_scale numeric(3,2) not null default 0.45,
  add column if not exists watermark_position text not null default 'center',
  add column if not exists watermark_image_url text;
