# Kastayım Bugün Villaları — Demo'dan Yayına Faz Planı

Hazırlanma tarihi: 24.07.2026
Hedef: Şu an tamamen sahte veriyle çalışan arayüzü, Supabase üzerinde gerçek veriyle çalışan,
Vercel'de yayında olan, acentenin kendi yönetebildiği bir rezervasyon sitesine dönüştürmek.

---

## 0. Mevcut durum tespiti

### Hazır olanlar (korunacak)
- Arayüz tasarımı: ana sayfa, villa listesi + filtreler, villa detay, takvim, fiyat tablosu, galeri, kategori blokları
- TR/EN sözlük altyapısı (`src/lib/i18n.tsx`, ~420 satır, 2 dil tam)
- Müsaitlik/fiyat hesap mantığı (`src/lib/availability.ts`) — veri kaynağı değişse de mantık aynen kalabilir
- Villa detay sayfası zaten server component + `generateStaticParams` + `generateMetadata` ile doğru desende

### Sahte olanlar (gerçeğe çevrilecek)
| Ne | Nerede | Durum |
|---|---|---|
| 6 villa kaydı | `src/lib/villas.ts` | Kod içine gömülü sabit dizi |
| Tüm görseller | `picsum.photos` | Rastgele stok görsel |
| Dolu tarihler | `bookedRanges` | Elle yazılmış |
| Sezon fiyatları | `seasons` | Elle yazılmış |
| Rezervasyon butonu | `BookingBox.tsx:137` | `alert()` — hiçbir yere gitmiyor |
| Temizlik/hizmet bedeli | `BookingBox.tsx:10-11` | Sabit 1500 TL / %5 |
| Giriş yap | `Header.tsx:88` | `/villalar`'a gidiyor, auth yok |
| Favoriler | `Header.tsx:85` | Tıklanınca hiçbir şey olmuyor |
| İletişim | `/#contact` | Form yok |
| Yorumlar/puan | `rating`, `reviewCount` | Uydurma sayılar |

### Mimari borçlar (yayına çıkmadan düzeltilmeli)
1. **Ana sayfa tamamen `"use client"`** (`src/app/page.tsx:1`) → veri sunucuda çekilemiyor, SEO ve ilk açılış hızı zayıf.
2. **i18n localStorage tabanlı** → TR ve EN aynı URL'de. Google EN içeriği hiç görmüyor, `hreflang` verilemiyor.
3. **`<html lang="tr">` sabit** (`src/app/layout.tsx:25`) → dil değişince de "tr" kalıyor.
4. **Hero'da otomatik oynayan YouTube iframe** (`src/app/page.tsx:53`) → LCP'yi ciddi bozar + çerez onayı olmadan 3. taraf çerezi yükler (KVKK riski).
5. Yayına özgü hiçbir şey yok: `sitemap`, `robots`, OG görseli, analytics, hata izleme, güvenlik başlıkları.
6. Mevcut 3 lint hatası: `BookingBox.tsx:85`, `Gallery.tsx:35`, `i18n.tsx:400`.

---

## Faz haritası

| Faz | Konu | Tahmini süre | Ön koşul |
|---|---|---|---|
| 0 | Altyapı hazırlığı + boş deploy hattı | 0.5 gün | — |
| 1 | Supabase veri modeli + RLS | 1–2 gün | Faz 0 |
| 2 | Veri katmanı: site Supabase'den okusun | 2–3 gün | Faz 1 |
| 3 | Görsel/medya hattı (Storage) | 1–2 gün | Faz 1 |
| 4 | Rezervasyon talebi akışı + gerçek müsaitlik | 2–3 gün | Faz 2 |
| 5 | Yönetim paneli + auth | 3–5 gün | Faz 1,2 |
| 6 | SEO, i18n URL yapısı, hukuki sayfalar | 2–3 gün | Faz 2 |
| 7 | **Yayın** (domain, env, izleme, test) | 1–2 gün | Faz 2,4,6 |
| 8 | Yayın sonrası (ödeme, yorum, üyelik, blog) | sürekli | Faz 7 |

Kritik yol: **0 → 1 → 2 → 4 → 6 → 7**. Faz 3 ve 5, Faz 2'den sonra paralel gidebilir.
Minimum yayınlanabilir sürüm (MVP) = Faz 0–4 + 6–7. Faz 5 yoksa villaları geçici olarak Supabase Studio'dan elle girersin.

---

## FAZ 0 — Altyapı hazırlığı ve deploy hattı

**Durum: TAMAM + canlıda (24.07.2026).** Repo: `muratkaval/kastayimbugunvillalari` (private).
`main` + `dev` push'landı, lint temiz, build hatasız. Vercel bağlı, ortam değişkenleri eklendi,
prod deploy başarılı ve uçtan uca doğrulandı (Supabase okuma + rezervasyon yazma canlıda çalışıyor).
- **Kanonik Vercel projesi: `kastayimbugunvillalari-n6a6`** (env'ler burada, deploy başarılı).
- Kopya proje `kastayimbugunvillalari` (boş, 404) silinecek — tek proje kalsın.
- Canlı URL geçici: `kastayimbugunvillalari-n6a6.vercel.app`. Gerçek domain Faz 7'de bağlanacak.

**Amaç:** Kod değişmeden önce boru hattını kur; her commit'in otomatik preview linki olsun.

**İşler**
1. Repoyu GitHub'a bağla (şu an sadece yerel, tek commit var). Branch stratejisi: `main` = prod, `dev` = preview, özellik dalları `feat/*`.
   - Mevcut aktif dal `master` — `main`'e taşı, GitHub'da default branch `main` yap.
2. `.gitignore` kontrolü: `.env*` dosyaları hariç tutulmuş olmalı.
3. Vercel'de projeyi GitHub reposuna bağla. Framework otomatik algılanır (Next 16).
   - Production branch: `main`. Preview: diğer tüm dallar.
4. `.env.example` dosyası oluştur (değer yok, sadece anahtar isimleri).
5. Mevcut 3 lint hatasını temizle; CI'da `next build` + `eslint` zorunlu hale gelsin (GitHub Actions veya Vercel'in kendi build'i).
6. Node sürümünü sabitle (`package.json` → `"engines": { "node": "22.x" }`) ki Vercel ile yerel aynı olsun.

**Bitti sayılır:** `dev` dalına atılan commit Vercel'de preview URL üretiyor, `main` prod'a çıkıyor, build hatasız.

---

## FAZ 1 — Supabase veri modeli ve güvenlik kuralları

**Amaç:** Verinin tek doğruluk kaynağı Supabase olsun.

**İşler**
1. Supabase projesinde **bölge: Frankfurt (eu-central-1)** seç (Türkiye'ye en düşük gecikme).
2. Şemayı SQL migration olarak yaz (`supabase/migrations/0001_init.sql`) — Studio'dan elle tıklama yapma, migration dosyası kalsın.
3. RLS'i **her tabloda aç**, sonra politika yaz.
4. `updated_at` trigger'ı ve `slug` benzersizlik kısıtları.
5. Seed: mevcut 6 demo villayı script'le aktar (`src/lib/villas.ts` → SQL insert), böylece Faz 2'de site boş kalmaz.

**Şema taslağı**

```sql
-- Bölgeler
create table regions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  province text not null,
  hero_image text,
  sort_order int default 0
);

-- Villalar
create table villas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region_id uuid references regions(id) on delete restrict,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  capacity int not null,
  bedrooms int not null,
  bathrooms int not null,
  pool text not null check (pool in ('private','shared','none')),
  size_m2 int,
  distance_to_sea int,
  rating numeric(2,1) default 0,
  review_count int default 0,
  featured boolean default false,
  discount_percent int,
  deal_tag text check (deal_tag in ('shortStay','earlyBooking','lastMinute')),
  check_in time not null default '16:00',
  check_out time not null default '10:00',
  min_nights int not null default 1,
  base_price numeric(10,2) not null,          -- gecelik taban fiyat
  cleaning_fee numeric(10,2) default 0,        -- şu an kodda sabit 1500
  service_rate numeric(4,3) default 0.05,      -- şu an kodda sabit %5
  currency text not null default 'TRY',
  description_tr text,
  description_en text,
  video_url text,
  lat numeric(9,6), lng numeric(9,6),
  amenities text[] not null default '{}',      -- AmenityKey listesi (mevcut tiplerle birebir)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on villas (status, featured);
create index on villas (region_id);

-- Görseller
create table villa_images (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete cascade,
  storage_path text not null,      -- Storage içindeki yol
  sort_order int default 0,
  alt_tr text, alt_en text,
  width int, height int
);

-- Sezon fiyatları
create table villa_seasons (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete cascade,
  label_tr text not null, label_en text not null,
  starts_on date not null, ends_on date not null,   -- [start, end)
  price numeric(10,2) not null,
  min_nights int
);

-- Dolu/kapalı tarihler (elle blok + onaylı rezervasyon + ileride iCal)
create table villa_blocks (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete cascade,
  starts_on date not null, ends_on date not null,   -- [start, end)
  source text not null default 'manual'
    check (source in ('manual','booking','ical')),
  note text,
  created_at timestamptz default now(),
  exclude using gist (                              -- aynı villada çakışan blok engellenir
    villa_id with =,
    daterange(starts_on, ends_on, '[)') with &&
  )
);

-- Rezervasyon talepleri
create table booking_requests (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete set null,
  check_in date not null, check_out date not null,
  adults int not null default 2, children int default 0, babies int default 0,
  full_name text not null, phone text not null, email text,
  note text,
  price_estimate numeric(10,2),
  status text not null default 'new'
    check (status in ('new','contacted','confirmed','cancelled')),
  source text,                    -- utm / hangi sayfa
  created_at timestamptz default now()
);

-- Kategoriler (mevcut src/lib/categories.ts karşılığı)
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name_tr text, name_en text,
  icon text, sort_order int default 0, featured boolean default false
);
create table villa_categories (
  villa_id uuid references villas(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (villa_id, category_id)
);

-- Yorumlar (Faz 8'de aktif)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid references villas(id) on delete cascade,
  author text not null, rating int check (rating between 1 and 5),
  comment text, published boolean default false,
  created_at timestamptz default now()
);

-- Yönetici rolleri
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  full_name text
);

-- İletişim formu
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null, email text, phone text, message text not null,
  created_at timestamptz default now()
);
```

**RLS politikası özeti**
- `villas`, `villa_images`, `villa_seasons`, `villa_blocks`, `regions`, `categories`: **anon yalnızca `select`**, `villas.status = 'published'` şartıyla.
- `booking_requests`, `contact_messages`: **anon insert yok.** Kayıtlar Next tarafındaki Server Function üzerinden, `SUPABASE_SERVICE_ROLE_KEY` ile atılır (doğrulama + spam kontrolü sunucuda kalsın diye).
- Tüm `insert/update/delete`: `profiles.role in ('admin','editor')` olan oturumlar.
- `service_role` anahtarı **asla** `NEXT_PUBLIC_` ile başlamaz, istemciye gitmez.

**Bitti sayılır:** Migration dosyası çalışıyor, seed verisi içeride, Studio'da anon rolüyle sorgu denemesi sadece yayınlanmış villaları döndürüyor.

---

## FAZ 2 — Veri katmanı: site Supabase'den okusun

**Amaç:** `src/lib/villas.ts` içindeki sabit dizi tamamen kalksın; sayfalar sunucuda veri çeksin.

**İşler**
1. `@supabase/supabase-js` + `@supabase/ssr` kur. İki istemci:
   - `src/lib/supabase/server.ts` → server component/Server Function için (anon key, cookie'li)
   - `src/lib/supabase/admin.ts` → sadece server, service role (yalnızca yazma işlemleri)
   - Dosyaların başına `import "server-only"` koy.
2. **Data Access Layer**: `src/lib/data/villas.ts` içinde `getPublishedVillas()`, `getVillaBySlug()`, `getFeatured()`, `getRegions()`, `getCategories()`. Sayfalar doğrudan Supabase'e değil bu katmana konuşsun.
3. Next 16 önbellekleme (bu sürümün yolu):
   - `next.config.ts` → `cacheComponents: true`
   - Fonksiyon başına `'use cache'` + `cacheLife('hours')` + `cacheTag('villas')`
   - Admin bir villayı güncellediğinde `revalidateTag('villas')` ile anında tazele.
   - (Eski `revalidate` export'u / `fetch` cache seçenekleri bu modelde geçersiz — dokümandaki `use cache` yolunu kullan.)
4. **`src/app/page.tsx`'i server component'e çevir.** İçindeki interaktif parçalar (SearchBar, kartların favori butonu) zaten ayrı client bileşen; sadece sayfanın kendisi sunucuya alınacak, `useI18n()` yerine sunucuda sözlük çözümü.
5. `/villalar` filtreleme: şu an tüm liste istemcide filtreleniyor. Villa sayısı 50'yi geçince yavaşlar → filtreleri URL parametresi + sunucu sorgusu haline getir (`region`, `guests`, `in`, `out`, `q`, fiyat aralığı). Müsaitlik filtresi `villa_blocks` ile SQL tarafında.
6. `generateStaticParams` artık Supabase'den slug listesi çeksin.
7. `src/lib/villas.ts` sil; `types.ts` tipleri DB'den üretilen tiplerle hizala (`supabase gen types typescript`).

**Bitti sayılır:** Supabase'de bir villanın adını değiştirdiğinde site (revalidate sonrası) yeni adı gösteriyor. Kodda tek satır villa verisi kalmadı.

---

## FAZ 3 — Görsel ve medya hattı

**Durum: kod tarafı tamam (28.07.2026).** Yüklenen her görsel sunucuda işleniyor
(2000px, WebP, EXIF/konum temizliği, width/height DB'ye), ana sayfada picsum kalmadı,
hero'daki otomatik YouTube iframe'i kaldırıldı. Ana sayfa görseli/videosu ve bölge kartı
görseli artık panelden yönetiliyor (`/yonetim/ayarlar`, `/yonetim/bolgeler`).
**Yapılacak:** `0003_site_settings.sql` migration'ını Supabase'de çalıştır; gerçek villa
fotoğraflarını yükle; hero için kısa mp4 hazırla. Lighthouse ölçümü fotoğraflar girince.

**Amaç:** picsum yerine gerçek villa fotoğrafları; hızlı ve düzgün.

**İşler**
1. Supabase Storage'da `villa-images` bucket'ı (public read), yol şeması: `villalar/{slug}/{sıra}.webp`.
2. `next.config.ts` → `remotePatterns`'a Supabase host'unu ekle, picsum/unsplash'ı yayına çıkarken kaldır.
3. Yükleme öncesi işleme scripti: uzun kenar 2000px, WebP, hedef < 300 KB, EXIF temizliği (konum verisi sızmasın), isteğe bağlı köşe filigranı.
4. Her görsel için `width/height` DB'ye yazılsın → CLS sıfırlanır; `sizes` prop'ları grid'e göre ayarlansın.
5. Hero videosu: YouTube iframe yerine **poster görsel + sessiz, kısa (8–12 sn) MP4/WebM loop**. Mobilde sadece poster. (Hem LCP hem çerez onayı sorunu çözülür.)
6. Villa videoları YouTube'da kalabilir ama **tıklayınca yüklensin** (lite-embed deseni).

**Bitti sayılır:** Lighthouse mobil performans ≥ 85, LCP < 2.5 sn, hiçbir sayfada picsum çağrısı yok.

---

## FAZ 4 — Rezervasyon talebi akışı + gerçek müsaitlik

**Durum: çekirdek tamam (24.07.2026).** Form → Server Action → sunucu doğrulaması →
sunucuda fiyat hesabı → `booking_requests` kaydı → teşekkür sayfası. Uçtan uca test edildi
(talep DB'ye düştü, tutar sunucuda 54.000 hesaplandı). Kalan: e-posta bildirimi (Resend
anahtarı), WhatsApp butonu (numara), gerçek hız sınırı (Upstash). Turnstile kancası hazır,
anahtar gelince aktifleşir.

**Amaç:** "Rezervasyon Talebi Oluştur" gerçekten bir yere düşsün; takvim gerçek doluluğu göstersin.

**İşler**
1. Takvim ve fiyat kutusu artık `villa_blocks` + `villa_seasons`'tan beslensin (`bookedRanges` alanı kalkar).
2. Fiyat hesabı sunucuya taşınsın: gecelik fiyat sezon tablosundan, temizlik/hizmet bedeli villa kaydından. **İstemcideki fiyat sadece gösterim; nihai tutarı sunucu hesaplar.**
3. Talep formu (ad, telefon, e-posta, tarih, kişi sayısı, not) → Server Function (`"use server"`):
   - Sunucuda tekrar doğrula: tarih geçmişte mi, min. gece sayısı, çakışma var mı
   - Spam koruması: Cloudflare Turnstile + IP başına dakikalık limit
   - `booking_requests`'e yaz
4. Bildirim: acenteye e-posta (Resend) + isteğe bağlı WhatsApp yönlendirme linki; müşteriye otomatik "talebiniz alındı" e-postası.
5. Talep sonrası `/rezervasyon-talebi/tesekkurler` sayfası (dönüşüm ölçümü buradan).
6. Villa detayda "WhatsApp'tan sor" butonu — hazır mesaj metniyle (`wa.me/90...?text=...`).

**Bitti sayılır:** Test talebi Supabase'e düşüyor, acenteye e-posta geliyor, dolu tarih seçilemiyor.

---

## FAZ 5 — Yönetim paneli ve kimlik doğrulama

**Kapsam kararları (25.07.2026):** görsel yönetimi tam Storage yüklemesiyle; kullanıcı/rol
şimdilik Supabase panelinden (panelde ekran yok); panel dili **sadece Türkçe** (iç araç).
Güvenlik/mimari kuralları: [docs/panel-kurallari.md](docs/panel-kurallari.md).
Yapım sırası: 5.0 kimlik altyapısı → 5.1 talepler → 5.2 villa → 5.3 sezon+takvim →
5.4 görsel → 5.5 bölge+kategori → 5.6 dashboard.

**İlerleme:** 5.0 ✅ (giriş/çıkış, dört katmanlı yetki, dashboard) · 5.1 ✅ (talep
listesi + durum + onayda otomatik takvim) · 5.2 ✅ (tüm villa alanları düzenleme +
oluşturma) · 5.3 ✅ (sezon fiyatı + görsel takvimle tarih kapatma, dolu gün notu,
rezervasyon iptali) · 5.4 ✅ (görsel yükleme/sıralama/silme) · 5.5 ✅ (bölge + kategori
yönetimi, kategoriye villa atama) · Site ayarları ekranı ✅ (Faz 3 ile birlikte).
Panel `main`'de ve canlıda.

**Faz 5.6 — panel olgunlaştırma (04.08.2026 denetimi sonrası, artık opsiyonel değil).**
Panel kod denetimi + sektör araştırması: **[docs/panel-yol-haritasi.md](docs/panel-yol-haritasi.md)**.
45 bulgu, 5 dalgaya bölünmüş. Dalga 0 (veri kaybettiren 3 hata + mobilde menü olmaması)
yayın öncesi kapatılmalı. Dalga 0+1 ≈ 2,5 gün, +Dalga 2 (Bugün ekranı, talep notları,
satış hattı) ≈ 4,5 gün.

**Amaç:** Acente kendi villasını, fiyatını, takvimini kendi girsin; sana bağımlı kalmasın.

**İşler**
1. Supabase Auth: sadece **e-posta + şifre**, kayıt kapalı; kullanıcıları sen davet et. `profiles.role` ile yetki.
2. `/yonetim` altında panel:
   - Villa listesi + ekle/düzenle (durum: taslak/yayında), sürükle-bırak görsel sıralama
   - Sezon fiyat tablosu editörü
   - Takvim: tarih aralığı seçip "kapat/aç"
   - Talepler ekranı: durum değiştirme (yeni → görüşüldü → onaylandı), onaylayınca otomatik `villa_blocks` kaydı
   - Bölge/kategori yönetimi
3. Koruma iki katmanlı (Next 16 dokümanının önerdiği desen):
   - `proxy.ts` (bu sürümde `middleware.ts`'in adı **proxy** oldu) ile iyimser yönlendirme
   - Asıl kontrol her Server Function ve veri erişim fonksiyonunun içinde
4. Her yazma sonrası `revalidateTag('villas')`.
5. Panel Türkçe; acenteye 1 sayfalık kullanım notu.

**Bitti sayılır:** Sen hiç kod yazmadan, panelden yeni villa eklenip fotoğrafıyla birlikte sitede yayınlanabiliyor.

---

## FAZ 6 — SEO, dil yapısı, içerik ve hukuki sayfalar

**Amaç:** Google'da bulunur olmak ve yasal olarak yayına uygun olmak.

**İşler**
1. **URL tabanlı dil**: `/tr/...` ve `/en/...` (`app/[locale]/...`). `<html lang>` dinamik, `hreflang` + `canonical` etiketleri, dil değiştirici aynı sayfanın diğer diline gitsin. localStorage yaklaşımı kalkar.
2. Slug'lar Türkçe ve okunur: `/tr/villa/villa-deniz-kalkan`, `/en/villa/villa-deniz-kalkan`.
3. `app/sitemap.ts` (villalar + bölgeler + kategoriler, iki dil), `app/robots.ts`.
4. Metadata: her villa için başlık/açıklama, `opengraph-image` (dinamik OG görseli), sosyal paylaşım kartı.
5. **JSON-LD**: villa sayfalarında `LodgingBusiness`/`Product` + `AggregateRating`, ana sayfada `TravelAgency` (TÜRSAB belge no dahil).
6. Bölge sayfaları (`/tr/kalkan-villalari` gibi) — asıl organik trafik buradan gelir.
7. Hukuki sayfalar (avukat/mali müşavir onaylı olmalı, taslakları ben hazırlarım):
   - KVKK Aydınlatma Metni + Açık Rıza
   - Gizlilik Politikası, Çerez Politikası + **çerez onay bandı** (analitik/pazarlama çerezleri onaydan önce yüklenmesin)
   - Mesafeli Satış Sözleşmesi + Ön Bilgilendirme Formu (ödeme alınacaksa zorunlu)
   - İptal/İade ve Depozito koşulları
   - Acente künyesi: unvan, adres, TÜRSAB belge no (17305), telefon, e-posta, vergi dairesi/no
8. 404 ve hata sayfaları, iletişim sayfası + harita.

**Bitti sayılır:** Search Console'a iki dil de eklendi, sitemap gönderildi, çerez bandı onay öncesi 3. taraf çerezi yüklemiyor.

---

## FAZ 7 — YAYIN

**Amaç:** Sitenin gerçek alan adında, izlenebilir ve yedekli şekilde canlıya çıkması.

### 7.1 Alan adı ve DNS
1. Alan adını al (öneri: `.com.tr` + `.com` birlikte; biri yönlendirme).
2. Vercel → Project → Domains → alan adını ekle; Vercel'in gösterdiği **A / CNAME kayıtlarını** alan adı sağlayıcına gir (değerleri Vercel panelinden kopyala, ezberden yazma).
3. `www` → köke (veya tersi) 301 yönlendirme; tek kanonik host seç.
4. SSL sertifikası otomatik gelir; "Valid Configuration" yazana kadar bekle (DNS yayılması 10 dk–24 sa).

### 7.2 Ortam değişkenleri (Vercel → Settings → Environment Variables)
```
NEXT_PUBLIC_SUPABASE_URL          (Production + Preview + Development)
NEXT_PUBLIC_SUPABASE_ANON_KEY     (hepsi)
SUPABASE_SERVICE_ROLE_KEY         (yalnızca Production + Preview, asla NEXT_PUBLIC_ değil)
NEXT_PUBLIC_SITE_URL              (https://alanadi.com)
RESEND_API_KEY                    (e-posta)
BOOKING_NOTIFY_EMAIL              (taleplerin düşeceği adres)
NEXT_PUBLIC_WHATSAPP_NUMBER
TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_GA_ID                 (analitik)
SENTRY_DSN                        (hata izleme)
```
> Preview ortamı için **ayrı bir Supabase projesi** kullan; test verisi canlı veriye karışmasın.

### 7.3 Supabase yayın ayarları
- Günlük yedek + mümkünse PITR aç
- `service_role` anahtarını yalnızca Vercel'de tut, hiçbir yere yapıştırma
- Auth e-postaları için özel SMTP (Resend) — varsayılan Supabase gönderimi düşük limitli
- Connection pooling açık, `search_path` ve RLS'in prod'da açık olduğunu doğrula
- Storage bucket'ta yalnızca gerekli dosyalar public

### 7.4 Yayın öncesi test listesi
- [ ] Mobil (375px) ve masaüstü: ana sayfa, liste, detay, form
- [ ] TR ve EN'de tüm metinler tam (eksik anahtar kalmadı)
- [ ] Rezervasyon talebi uçtan uca: form → DB → e-posta
- [ ] Dolu tarih seçilemiyor, min. gece kuralı çalışıyor
- [ ] Fiyat hesabı sunucu ve ekranda aynı sonucu veriyor
- [ ] 404, hata sayfası, boş arama sonucu ekranı
- [ ] `next build` uyarısız, lint temiz
- [ ] Lighthouse mobil: Performans ≥ 85, Erişilebilirlik ≥ 90, SEO ≥ 95
- [ ] Güvenlik başlıkları + CSP, form spam koruması testi
- [ ] Sitemap/robots erişilebilir, canonical doğru
- [ ] Yasal sayfalar linkli ve dolu

### 7.5 Canlıya alma günü
1. `dev` → `main` merge, preview URL'de son duman testi
2. Prod deploy, alan adı alias'ı kontrol
3. Search Console + Analytics doğrulaması
4. Uptime izleme (5 dk aralıkla) ve Sentry'de ilk hata akışı kontrolü
5. Bir gerçek talep gönder, acenteye ulaştığını teyit et
6. Geri dönüş planı: sorun çıkarsa Vercel'de bir önceki deployment'a **Instant Rollback**

**Bitti sayılır:** Alan adından site açılıyor, gerçek talep acenteye ulaşıyor, izleme ve yedek çalışıyor.

---

## FAZ 8 — Yayın sonrası

Öncelik sırasıyla:
1. **Online ödeme / kapora** — iyzico veya PayTR (TR pazarında sanal POS + taksit). Mesafeli satış sözleşmesi ve iade akışı bu fazın ön koşulu. Kapora modeli (%25–30) en yaygını.
2. **Yorum sistemi** — konaklama sonrası e-posta ile yorum daveti; moderasyondan geçince yayın. `rating`/`reviewCount` gerçek veriye döner.
3. **Üyelik + favoriler** — Header'daki kalp ve giriş butonu şu an boş; Supabase Auth ile bağlanır.
4. **Takvim senkronizasyonu (iCal)** — Airbnb/Booking'de de listeleniyorsa çift rezervasyonu önler.
5. **İçerik/blog** — "Kalkan'da ne yenir", bölge rehberleri; organik trafiğin uzun vadeli motoru.
6. **Performans ve dönüşüm takibi** — hangi villa kaç talep alıyor, hangi bölge aranıyor.

---

## Senin karar vermen gerekenler

| Konu | Seçenekler | Önerim |
|---|---|---|
| Rezervasyon modeli | (a) Talep formu → acente arıyor · (b) Online ödemeli anında rezervasyon | **(a) ile başla.** Ödemeyi Faz 8'de ekle; yasal yük ve entegrasyon süresi çok daha az. |
| Villa girişi | (a) Panel yaz · (b) Supabase Studio'dan elle | Villa sayısı 15'in altındaysa önce (b), panel Faz 5'te gelsin |
| Dil yapısı | (a) `/tr` `/en` ayrı URL · (b) mevcut tek URL | **(a)** — EN sayfalar Google'a girsin diye şart |
| Alan adı | — | Netleşince Faz 7.1 başlar |
| Fotoğraf kaynağı | Acentede hazır mı, çekim gerekli mi? | Faz 3'ün süresi buna bağlı |
| Villa sayısı (ilk yayın) | — | 10–20 arası gerçek villa yeterli; azsa site "boş" görünür |

---

## Sonraki adım

Faz 0'ı bugün bitirebiliriz: GitHub bağlantısı, `main` dalı, `.env.example`, lint temizliği ve Vercel'e ilk (hâlâ demo verili) deploy.
Bu, sonraki her fazın üstüne kurulacağı zemini hazırlar ve siteyi ilk kez gerçek bir adreste görürsün.
