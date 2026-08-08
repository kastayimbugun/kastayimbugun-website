-- Header (üst menü, TÜRSAB şeridi, giriş butonu) ve Footer (sütunlar, sosyal
-- medya, görsel/SVG rozetleri, telif) içeriğinin panelden yönetimi. İkisi de tek
-- jsonb alanda tutulur; null → koddaki varsayılan (bugünkü görünüm) kullanılır
-- (bkz. src/lib/headerFooter.ts).
alter table site_settings add column if not exists header_config jsonb;
alter table site_settings add column if not exists footer_config jsonb;
