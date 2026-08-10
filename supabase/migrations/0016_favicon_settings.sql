-- Migration 0016: Favicon setting
ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS favicon_image text;
