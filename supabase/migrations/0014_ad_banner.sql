-- Ana sayfa reklam/kampanya bandı. Web ve mobil için AYRI görsel ve AYRI
-- göster/gizle; görsel yoksa ya da ilgili platform kapalıysa o platformda hiç
-- gösterilmez. Görseller Storage yolu olarak tutulur (hero/logo/og ile aynı akış).
alter table site_settings add column if not exists ad_show_web    boolean not null default false;
alter table site_settings add column if not exists ad_show_mobile boolean not null default false;
alter table site_settings add column if not exists ad_web_image    text;
alter table site_settings add column if not exists ad_mobile_image text;
alter table site_settings add column if not exists ad_link_url      text;
