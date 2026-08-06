-- Faz 5.7: site ayarlarını panelden yönetilebilir hale getir.
--
-- Bugüne kadar marka adı, acente unvanı, TÜRSAB numarası, iletişim bilgileri ve
-- konfirmasyon belgesindeki sabit metinler koda gömülüydü; değiştirmek için
-- geliştirici gerekiyordu. Faz 5'in amacı (acente kendi içeriğini yönetsin)
-- bunları da kapsıyor.
--
-- TÜM sütunlar nullable ve varsayılansız: boş bırakılan alanda uygulama
-- koddaki mevcut metni kullanmaya devam eder. Böylece bu migration tek başına
-- hiçbir ekranın görünümünü değiştirmez.
--
-- Çalıştırma: Supabase > SQL Editor > bu dosyanın tamamını yapıştır > Run

alter table site_settings
  -- --- Marka ---
  -- Logo `villa-images` bucket'ında: site/logo.webp (bkz. 0003 yol şeması).
  add column if not exists logo_image text,
  add column if not exists brand_name text,
  add column if not exists agency_name text,
  add column if not exists tursab_no text,

  -- --- İletişim ---
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,

  -- --- Ana sayfa metinleri (site iki dilli) ---
  add column if not exists hero_title_tr text,
  add column if not exists hero_title_en text,
  add column if not exists hero_subtitle_tr text,
  add column if not exists hero_subtitle_en text,

  -- --- SEO (Faz 6'da metadata bunlardan beslenecek) ---
  add column if not exists seo_title_tr text,
  add column if not exists seo_title_en text,
  add column if not exists seo_description_tr text,
  add column if not exists seo_description_en text,
  add column if not exists og_image text,

  -- --- Konfirmasyon belgesi metinleri ---
  -- Acente bu iki paragrafı sezon koşullarına göre değiştirmek istiyor.
  add column if not exists confirmation_deposit_note text,
  add column if not exists confirmation_checkin_note text;

-- Mevcut "public reads site settings" / "staff writes site settings"
-- politikaları tablo geneli olduğu için yeni sütunlar otomatik kapsanır.
-- Not: iletişim ve marka bilgileri zaten sitede herkese görünür veriler.
