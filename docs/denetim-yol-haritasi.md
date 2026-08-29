# Denetim Yol Haritası — 29.08.2026

Bu doküman **29.08.2026 tam kapsam denetiminin** bulgularını uygulanabilir fazlara böler.
Denetim on alanı kapsadı: güvenlik, veritabanı/RLS, para-tarih doğruluğu, panel doğruluğu,
dönüşüm hunisi, SEO, performans, erişilebilirlik, panel deneyimi, kod sağlığı.

> [docs/panel-yol-haritasi.md](panel-yol-haritasi.md) ile aynı işlevi görür: o, 04.08.2026
> panel denetiminin çıktısıydı ve `PLAN.md` Faz 5.6/5.7 olarak kapandı. Bu doküman da
> `PLAN.md` Faz 5.8 → 6.5 aralığını tanımlar.

**Bulgu sayısı: 86.** 9 yayın engeli · 31 yüksek · 30 orta · 16 düşük.
Her bulgu ya dosya okunarak ya da çalışan siteden ölçüm alınarak doğrulandı.

---

## 1. Neden yeni faz gerekiyor

`PLAN.md`'nin faz haritası Faz 5 (panel) → Faz 6 (SEO) → Faz 7 (yayın) diye ilerliyor.
Denetim, bu sıranın arasına giren **iki iş kümesi** buldu:

1. **Veri kaybettiren hatalar.** Bunlar Faz 6/7'yi beklemez — bugünkü 21 villayla bile
   kayıp üretebilirler. Örnek: villa silindiğinde fotoğraflar Storage'da kalıyor
   (`villas.ts:485` var olmayan sütunu okuyor), onaylı rezervasyonu olan villa uyarısız
   silinebiliyor, toplu sezon fiyatı sil-sonra-yaz yapıyor ve geri alması yok.

2. **Ölçek borcu.** `PLAN.md` yazıldığında katalog 6 villaydı. Bugün 21, hedef 600.
   Ölçülen: `/villalar` sayfası 21 villayla **736 KB HTML** üretiyor; villa detay sayfası
   600 villa çekip **3 tanesini** kullanıyor. 600 villada build ~4,9 GB'a çıkar ve mobilde
   sayfa açılmaz. Bu, `PLAN.md`'nin "Mimari borçlar" listesinde yok çünkü o liste demo
   ölçeğinde yazıldı.

Ayrıca Faz 6'nın **iç sırası değişmeli** (bkz. §5) ve `PLAN.md`'de hiç olmayan bir konu
var: **dönüşüm hunisi** (§6).

---

## 2. İki kapı

Fazları tarihe değil, iki geçit noktasına göre sıraladım. Her iş bir kapıya bağlı.

```
              ┌──────────────────────┐        ┌──────────────────┐
  bugün ─────▶│  G1 · GÖÇ KAPISI     │───────▶│  G2 · YAYIN      │─────▶ Faz 8
              │  600 villa aktarımı  │        │  gerçek domain   │
              └──────────────────────┘        └──────────────────┘
                 Faz 5.8 + 5.9                  Faz 6 + 6.5 + 7
```

**G1 — Göç kapısı.** 600 villa aktarılmadan önce doğru olması gerekenler. Gerekçe: göç
sonrası bu hataların maliyeti katlanır (600 villanın fotoğrafı yetim kalır, 200 villanın
fiyatı tek tıkla silinir, sayfa açılmaz hale gelir) ve düzeltmek göç öncesine göre çok
daha pahalıdır.

**G2 — Yayın kapısı.** Gerçek alan adına çıkmadan önce doğru olması gerekenler.

**Kritik yol: 5.8 → 5.9 → G1 → 6 → 6.5 → G2 → 7.**
Faz 6.5 (dönüşüm) ile Faz 6 (SEO) paralel gidebilir; ikisi de 5.9'un URL değişikliğine bağlı.

---

## 3. Faz tablosu

| Faz | Konu | Süre | Ön koşul | Kapı |
|---|---|---|---|---|
| **5.8** | Veri kaybını durdur + güvenlik sertleştirme | 4 gün | — | G1 |
| **5.9** | Ölçek: 600 villaya hazırlık | 5 gün | 5.8 | G1 |
| **6** | SEO ve keşfedilebilirlik *(iç sırası değişti)* | 4 gün | 5.9 | G2 |
| **6.5** | Dönüşüm hunisi *(yeni — `PLAN.md`'de yoktu)* | 5 gün | 5.9 | G2 |
| **7** | Yayın *(denetim maddeleri eklendi)* | 2 gün | 6, 6.5 | G2 |
| **8** | Yayın sonrası *(yorum sistemi, a11y, i18n URL)* | sürekli | 7 | — |

Toplam G1'e kadar **9 gün**, G2'ye kadar **+11 gün**.

---

## FAZ 5.8 — Veri kaybını durdur + güvenlik sertleştirme — ✅ TAMAM (29.08.2026)

**Doğrulama:** `tsc --noEmit` temiz · `npm run build` başarılı · `npm audit` 0 açık ·
tüm herkese açık rotalar 200 · 6/6 güvenlik başlığı canlı · sanitize ve SVG beyaz
listesi bilinen saldırı yükleriyle test edildi.

**Amaç:** Bugün veri kaybettirebilen ve kimlik gerektirmeden istismar edilebilen her şeyi
kapatmak. Bu faz göçü değil, **bugünü** korur.

**Süre: 4 gün.** İlk üç madde birer satırlık; ilk yarım günde bitirilebilir.

### 5.8.1 — Sessiz veri kaybı (0,5 gün) — ✅ TAMAM (29.08.2026)

| ✅ | İş | Bulgu | Kanıt |
|---|---|---|---|
| ✅ | `.select("url")` → `.select("storage_path")` + hata kontrolü; dosyalar DB satırından **önce** siliniyor | BLK-02 | `actions/admin/villas.ts:485` |
| ✅ | Rezervasyon sorgularının hatasını yakala, fail-closed davran | BLK-03 | `villas.ts:453`, `:405` |
| ✅ | `DeleteVillaModal` — durum okunamazsa "0 adet" gösterme, silmeye izin verme | BLK-03 | `DeleteVillaModal.tsx:93` |
| ✅ | `PageStatusToggle` sonucunu oku, toast + `router.refresh()` | PUX-04 | `PageStatusToggle.tsx:17` |
| ✅ | `MultiCalendar.openRange` sonuçlarını topla, kısmi başarıyı bildir | PUX-04 | `MultiCalendar.tsx:185` |
| ✅ | `updateRegionsOrder` — silindi (0 çağrı, üstelik hataları yutuyordu) | KOD | `regions.ts:244` |

> **Modal eklemesi neden gerekti:** sunucu tarafı `{ok:false}` dönmeye başlayınca modal hâlâ
> `?? 0` ile "0 aktif rezervasyon" gösteriyordu — yani düzeltme kullanıcıya ulaşmıyordu.
> Artık durum okunamazsa silme akışı hiç başlamıyor.
>
> **Doğrulama:** `tsc --noEmit` temiz · `npm run build` başarılı · değiştirilen dosyalarda
> yeni lint hatası yok (`DeleteVillaModal`'daki 5 hata önceden vardı, satır numaraları kaydı).

> **Neden ilk sırada:** `villa_images` tablosunda `url` sütunu yok, `storage_path` var
> (`0001_init.sql:131-141`). PostgREST hata döner, hata okunmadığı için `images` `null`
> kalır ve temizlik bloğu tümüyle atlanır. Şemayı ve kodu yan yana koyup doğruladım.

### 5.8.2 — Atomik olmayan işlemler (1,5 gün) — ✅ TAMAM (29.08.2026)

Migration: **`0022_atomic_operations.sql`** (5 RPC). Hepsi `security invoker` —
RLS çağıran kullanıcının kimliğiyle uygulanır, panel `service_role` kullanmaz.

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | `bulkSetSeason` sil+yaz → `bulk_set_season()` RPC | BLK-04 |
| ✅ | `syncVillaCategories` → `sync_villa_categories()` RPC + hata döndürüyor (N+1 de kalktı) | BLK-04 |
| ✅ | `setCategoryVillas` → `set_category_villas()` RPC | BLK-04 |
| ✅ | `updateBooking` blok taşıma + kayıt → `update_booking_with_block()` RPC | PARA-02 |
| ✅ | `villa_blocks` silmelerinde `error` kontrolü (`updateBookingStatus`, `cancelReservation`) | PARA-07 |
| ✅ | `createManualBooking` telafi silmesi de başarısızsa yeni `orphan` hatası — sessiz çift rezervasyon riski kalktı | PARA-07 |
| ✅ | `createVilla` kısmi başarı: villa oluşup kategori yazılamazsa `warning` ile bildiriliyor | BLK-04 |

> Supabase JS istemcisinde transaction yok — bu yüzden sil+yaz çiftleri kaçınılmaz olarak
> atomik değil. Postgres fonksiyonuna taşımak tek doğru çözüm.

### 5.8.3 — Para ve tarih doğruluğu (1 gün) — ✅ TAMAM (29.08.2026)

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | `getVillaPricingOptions` fiyat kurallarını da çekiyor (`PriceRules` mirası); iki panel formu `calcPrice`'ı tam villa + `ctx` ile çağırıyor | PARA-01 |
| ✅ | `businessToday()` (`Europe/Istanbul`) — `BookingBox`, `actions/booking.ts`, `stats.ts`, `availability.isPast`, takvim sayfası aynı günü kullanıyor | PARA-06 |
| ✅ | Dashboard "bu ay" filtresi `+03:00` ofsetiyle sorguluyor (bare date UTC gece yarısı sayılıyordu) | PARA-06 |
| ✅ | Toplu güncellemede bitiş gününe `+1` — hem fiyat hem müsaitlik | PARA-04 |
| ✅ | "Tarihleri aç" artık **bölüyor**: `open_villa_dates()` RPC; üç çağrı yeri (BlockEditor, MultiCalendar, toplu) tek doğru yola bağlandı | PARA-05 |
| ✅ | Para alanları boş string'i reddediyor; `"0"` açıkça geçerli (davranış testiyle doğrulandı) | PARA |
| ✅ | `nightsBetween` NaN koruması | PARA |
| ✅ | Toplu panelde tarih seçilmeden "uygula" artık sessizce patlamıyor; 200 villa sınırı seçim anında uygulanıyor | PNL-03 |

> **PARA-01 örneği:** taban 12.000 ₺, hafta sonu +%25, 7 gece −%15 olan bir villada
> 3–10 Ağustos için site **82.325 ₺**, panel **90.200 ₺** hesaplıyor. 7.875 ₺ fark.
> Manuel rezervasyonda müşteriye baştan yanlış fiyat söyleniyor.

### 5.8.4 — Güvenlik (1 gün) — ✅ TAMAM (29.08.2026)

Migration: **`0023_rate_limits.sql`**, **`0024_module_rls_and_private_photos.sql`**

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | `lib/security/turnstile.ts` — tek kaynak, **üretimde fail-closed**; iki kopya silindi | BLK-01 |
| ✅ | `TurnstileWidget` bileşeni + `BookingBox` ve `VillaApplicationForm`'a bağlandı | BLK-01 |
| ✅ | `captcha` ve yeni `rate_limit` hata dalları + TR/EN sözlük anahtarları | BLK-01 |
| ✅ | IP başına hız sınırı: `rate_limits` tablosu + `rate_limit_hit()` RPC (rezervasyon 8/saat, başvuru 3/saat); IP ham değil sha256 özetiyle saklanıyor | BLK-01 |
| ✅ | `sanitizeRichText` sayfa kaydında **ve** `RichTextEditor`'ın iki render yolunda | BLK-06 |
| ✅ | Güvenlik başlıkları + CSP (`next.config.ts`); React dev'in `eval` ihtiyacı için yalnızca geliştirmede `'unsafe-eval'` | BLK-07 |
| ✅ | Oturum çerezleri `httpOnly` — `session.ts` **ve** `proxy.ts` (tazeleme de yazıyor) | BLK-08 |
| ✅ | `has_module()` + modül RLS — temiz eşleşen tablolarda (aşağıdaki nota bakın) | BLK-08 |
| ✅ | `villa-applications` bucket'ı gizli + panelde imzalı URL (toplu imzalama) | BLK-09 |
| ✅ | `deleteImage` dosya yolunu DB'den okuyor; istemci artık `storagePath` göndermiyor | GÜV-01 |
| ✅ | SVG yükleme beyaz listeye çevrildi (5 bilinen atlatma testle doğrulandı) | GÜV-02 |
| ✅ | `deleteVillaCascade` rezervasyona dokunuyorsa `reservations` izni istiyor; `villaId` Zod'dan geçiyor | GÜV-03 |
| ✅ | `npm audit`: 5 açık → **0** (`next` 16.2.11 → 16.3.3, semver aralığı içinde) | GÜV |
| ✅ | `.gitignore`'a `/scratch/` ve `/supabase/.temp/` | KOD-01 |

> **Modül RLS'i neden kısmi — bilinçli karar.**
> `pages`, `regions`, `categories`, `site_settings`, `villa_applications`,
> `villa_application_questions` ve `booking_notes` temiz tek-modül eşlemesine sahip;
> bunlar `has_module()`'a taşındı. Ama `booking_requests` ve `villa_*` tabloları
> birden çok modül tarafından okunuyor: `data/admin/calendar.ts` ve
> `data/admin/villas.ts` `booking_requests` okuyor, oysa o sayfalar `villas` izni
> istiyor. Bunlara `has_module('reservations')` koymak **paneli kırar**;
> `or has_module('villas')` eklemek ise izni neredeyse herkese açar — güvenlik
> kazancı olmaz. `0021`'deki karar bu yüzden geçerliliğini koruyor.
>
> Asıl saldırı vektörü zaten kapandı: token artık `httpOnly`, yani
> `document.cookie` ile okunup doğrudan PostgREST'e gidilemiyor. Kalan risk
> "personelin DevTools ile kendi token'ını kullanması" — 3-5 kişilik ekipte
> kabul edilebilir, ekip büyürse tablo ayrıştırması gerekir.
>
> ⚠️ **`0024` üretime uygulanmadan önce**, sınırlı izinli bir test personeliyle
> panelin her modülü açılıp doğrulanmalı.

**Bitti sayılır:** Bir villayı silmek fotoğraflarını da siliyor; onaylı rezervasyonu olan
villa silinemiyor; toplu fiyat işlemi yarıda kalırsa hiçbir şey değişmiyor; rezervasyon
formu captcha'lı ve hız sınırlı çalışıyor; `curl -I` yanıtında CSP ve HSTS görünüyor.

---

## FAZ 5.9 — Ölçek: 600 villaya hazırlık — ✅ TAMAM (29.08.2026)

Migration: **`0025_scale_indexes_and_constraints.sql`**

### Ölçülen sonuç (bugünkü 21 villa ile)

| Sayfa | Önce | Sonra | Değişim |
|---|---|---|---|
| `/villa/[slug]` | 766 KB | **254 KB** | −66% |
| `/villalar` | 736 KB | **397 KB** | −46% |
| `/` | 1.582 KB | **1.186 KB** | −25% |

Asıl kazanç ölçekte: villa başına RSC maliyeti **14,3 KB → ~0,9 KB**. 600 villada
villa detayı ~8,4 MB yerine ~120 KB, ana sayfa ~8,4 MB yerine ~540 KB.

### 5.9.1 — Payload ✅

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | `VillaCardData` dar tipi + `CARD_FIELDS` sorgusu (kart başına en fazla 5 görsel) | BLK-05 |
| ✅ | `villa/[slug]` artık `getVillas()` çağırmıyor → `getSimilarVillas()` SQL'de 3'e daraltıyor | BLK-05 |
| ✅ | Ana sayfa `getVillaCards()` kullanıyor (açıklama/sezon/blok hiç gelmiyor) | BLK-05 |
| ✅ | Kategori modundaki benzer villalar `getVillasBySlugs()` ile yalnız gerekenler | BLK-05 |
| ✅ | `getFooterPages()` üç sütun çekiyor — bekleyen payload bombası kapandı | PRF |
| ✅ | Manuel rezervasyon formu yalnızca onaylı + gelecekteki rezervasyonları taşıyor (PII daralması) | PNL |

> `VillaCard` artık `VillaCardData` alıyor; `Villa` bu şekli **yapısal olarak**
> karşıladığı için mevcut çağrı yerleri tek satır değişmeden çalıştı.

### 5.9.2 — Sunucu tarafı liste ✅

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | Filtreler URL'e taşındı; dört rota tek `VillaListPage` sunucu bileşenini paylaşıyor | UX-07 |
| ✅ | `useSearchParams` kaldırıldı → **CSR bailout çözüldü**: sunucu HTML'inde villa adları var | PRF-01 |
| ✅ | `getVillaCardPage()` — filtre, sıralama ve sayfalama SQL'de (24/sayfa) | PRF-02 |
| ✅ | Sayfalama arayüzü + TR/EN anahtarları | PRF-02 |
| ✅ | `<h1>` slug yerine bölge adı: "kalkan" → **"Kalkan Kiralık Villalar"** | SEO-01 |
| ✅ | Fiyat kaydırıcısı sınırları veriden (`getVillaPriceCeiling`) — 25.000 ₺ tavanı kalktı | UX-04 |
| ✅ | Bilinmeyen bölge slug'ı ve aralık dışı sayfa artık boş sonuç döndürüyor (500 değil) | SEO-03 |
| ✅ | Sonuç sayısına `aria-live`; kart ızgarası `<ul>/<li>` semantiği | ERŞ |

**Doğrulanan davranış:** `?kisi=8` → 21 villadan 5'i; geri tuşu filtreyi geri alıyor;
`?sayfa=99` ve geçersiz bölge slug'ı 200 dönüyor; `/villalar` sunucu HTML'inde
villa adları ve "Filtreler" metni mevcut.

### 5.9.3 — Görsel ve önbellek ✅

| ✅ | İş | Bulgu |
|---|---|---|
| ✅ | `priority` → `preload`, yalnızca ilk 3 kart (ana sayfada 25 preload → 3) | PRF-03 |
| ✅ | `sizes` üst sınırı `420px`; `deviceSizes`/`imageSizes` daraltıldı | PRF-04 |
| ✅ | `minimumCacheTTL` 31 gün (varsayılan 4 saatti) | PRF-04 |
| ✅ | `React.cache()` — `getSiteSettings`, `getCategories`, `getFooterPages` | PRF |
| ✅ | `latin-ext` alt kümesi — **ğ ş İ** font atlaması bitti | PRF |
| ✅ | `Logo` ve `AdBanner`'a boyut/oran verildi (CLS) | PRF |

### 5.9.4 — Veritabanı ✅

`0025` ile eklenenler: `pg_trgm` GIN arama index'leri (talep/villa/başvuru),
takvim ve tarih aralığı kısmi index'leri, `villa_categories` ters yön index'i,
liste sıralama index'leri, gereksiz `pages_slug_idx` kaldırıldı; `villa_seasons`
ve `booking_requests` çakışma kısıtları, bölge döngü koruması (trigger),
eksik `updated_at` trigger'ları, `price_estimate >= 0` kısıtı.

> ⚠️ İki `exclude` kısıtı mevcut veride çakışma varsa **sessizce atlanır**
> (notice ile). Migration'ın sonundaki iki kontrol sorgusunu önce çalıştırın.

### 5.9.5 — Göç kapısı kontrol listesi (G1)

600 villa aktarılmadan **önce** hepsi ✅ olmalı:

- ✅ Faz 5.8 tamamlandı
- ⬜ **Supabase Pro + PITR açık** — *yalnızca panelden yapılabilir, kod tarafı yok*
- ✅ 5.9.1 ve 5.9.2 tamamlandı
- ⬜ `0022`–`0025` migration'ları production'da çalıştırıldı
- ⬜ `0024` sınırlı izinli test personeliyle doğrulandı (modül RLS)
- ⬜ `0008_price_rules` production'da çalıştırıldı *(`PLAN.md` Faz 5.7'den açık kalmıştı)*
- ⬜ Göç script'i aykırı fiyat denetimi yapıyor *(bugün "₺10.000 – ₺125.000" gösteren villa var)*
- ⬜ Göç script'i açıklama boşluklarını normalize ediyor
- ⬜ Yinelenen bölge kayıtları temizlendi *("İslamlar" iki kez)*
- ⬜ Villalara **gerçek** tesis kodu giriliyor *(`villaCode()` hash üretiyor; 600 villada çakışma kesin)*
- ⬜ Ölü görsel URL'leri temizlendi *(villa detayında 4 fotoğraf eski siteye işaret ediyor, 404)*
- ⬜ `picsum.photos` / `images.unsplash.com` referansları ve `next.config.ts` satırları silindi

**Bitti sayılır:** ✅ 600 villalık test göçü hariç tüm kod tarafı hazır; kalan
maddeler veri ve Supabase panel işlemleri.

---

## FAZ 6 — SEO ve keşfedilebilirlik *(iç sırası değişti)*

**Amaç:** `PLAN.md`'deki Faz 6 ile aynı, ama **sırası değişti**.

### Neden sıra değişti

`PLAN.md` Faz 6'da i18n URL migrasyonunu **1. madde** yapmış. Denetim bunun ertelenmesini
öneriyor:

- i18n migrasyonu tüm public ağacı dokunan **3–4 günlük** bir iş.
- Oysa **Türkçe içerik bile şu an indekslenmiyor**: `sitemap.xml`, `robots.txt`, canonical,
  OG ve JSON-LD hiç yok (canlı HTTP ile doğrulandı); bölge sayfalarının hiçbirinde metadata
  yok, `<h1>` ham slug basıyor ("fethiye").
- Yani i18n önce yapılırsa büyük bir refactor riski **hiçbir ölçülebilir kazanç görülmeden**
  alınmış olur.

**Yeni sıra:** indeksleme altyapısı → hukuki sayfalar → *(TR trafiği gelsin)* → i18n (Faz 8).

### 6.1 — İndeksleme altyapısı (2 gün)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | `lib/seo/urls.ts`: `SITE_URL`, `absoluteUrl`, `regionPath`, `resolveRegion` | SEO-03 |
| ⬜ | `metadataBase` + `title.template` + OG/Twitter + `robots` kök layout'ta | SEO |
| ⬜ | Panelde girilen `seoTitleTr` / `ogImage` alanlarını bağla *(yazılıyor, hiçbir yere yansımıyor)* | SEO |
| ⬜ | `app/robots.ts` + `app/sitemap.ts` (~720 URL) | SEO-02 |
| ⬜ | Dört liste rotasına `generateMetadata` | SEO-01 |
| ⬜ | `<h1>`'de slug yerine bölge adı; villa adı `<h2>` | SEO-01 |
| ⬜ | Geçersiz slug'ları `notFound()`'a düşür *(bugün `/villalar/asdfgh` 200 dönüyor)* | SEO-03 |
| ⬜ | Link üretimini tek kanonik yola bağla *(aynı bölge 4 URL'den 200 dönüyor)* | SEO-03 |
| ⬜ | Villa detayına canonical + OG + kırpılmış açıklama | SEO |
| ⬜ | JSON-LD: `BreadcrumbList` + `Product/Offer` + `TravelAgency` + `VacationRental` | SEO-04 |
| ⬜ | Slug redirect tablosu + 301 | SEO |
| ⬜ | Teşekkür sayfalarına `noindex` | SEO |

> ⛔ **`AggregateRating` EKLENMEYECEK.** `rating`/`reviewCount` panelden elle giriliyor,
> `reviews` tablosu hiç okunmuyor, sayfada tek yorum görünmüyor. Bu veriyi işaretlemek
> Google'ın yapılandırılmış veri spam politikasını ihlal eder ve **manuel işlem** riski
> taşır — yani tüm alan adının sıralama kaybı. Sıra: gerçek yorumlar (Faz 8) → sayfada
> görünür → **sonra** şema. `PLAN.md` Faz 6 madde 5'teki `AggregateRating` ibaresi bu
> nedenle çıkarılmalı.

### 6.2 — Hukuki sayfalar (1 gün + hukuk onayı)

`PLAN.md` Faz 6 madde 7 aynen geçerli, **eksiksiz**. Denetim bir ek buldu:

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | KVKK, Gizlilik, Çerez + onay bandı, Mesafeli Satış, Ön Bilgilendirme, İptal/İade | *(PLAN.md)* |
| ⬜ | Acente künyesi (TÜRSAB 17305, unvan, adres, vergi no) | *(PLAN.md)* |
| ⬜ | **Footer'daki placeholder telefonu gerçeğiyle değiştir** — `+90 242 000 00 00` şu an canlı | UX-06 |
| ⬜ | Menüdeki `/#about`, `/#contact` çapalarını gerçek sayfalara bağla; SSS'in `href="#"`'ini düzelt | UX |

### 6.3 — Bölge içeriği (1 gün + içerik yazımı)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | `regions`'a `description_tr/en` + `updated_at` migration'ı | SEO-01 |
| ⬜ | Panelde bölge açıklaması editörü | SEO-01 |
| ⬜ | Bölge sayfasında sunucu-render açıklama bloğu | SEO-01 |

> **Orta vadenin en yüksek getirili tek işi.** "fethiye villa kiralama" sınıfı sorgularda
> sıralanmanın ön koşulu; rakipler bu sayfalarda 300–800 kelimelik metinle geliyor.
> Bugün bu sayfalarda `<h1>` ve sonuç sayısı dışında **tek satır indekslenebilir metin yok**.

**Bitti sayılır:** `sitemap.xml` 200 dönüyor ve ~720 URL içeriyor; her bölge sayfasının
kendi başlığı/açıklaması/canonical'ı var; Search Console'a gönderildi; Rich Results Test
`BreadcrumbList` ve `Offer`'ı hatasız okuyor.

---

## FAZ 6.5 — Dönüşüm hunisi *(yeni faz)*

**Amaç:** Müşterinin kendi ifadesiyle: *"kullanıcıyı en kolay şekilde yönlendirmek ve ona
en uygun teklifi ve villayı bulmasını sağlamak."*

`PLAN.md`'de bu konu hiç yok — Faz 4 rezervasyon **akışını** kurdu ama huninin
kullanılabilirliği hiç ele alınmadı. Denetim buranın en çok kayıp veren yer olduğunu
gösterdi.

**Süre: 5 gün.** Faz 6 ile paralel gidebilir (ikisi de 5.9.2'ye bağlı).

### Ölçülen mevcut durum

| Ölçüm | Değer |
|---|---|
| Ana sayfadan talebe tıklama sayısı | ~12 (arama yolu) / ~7 (kart yolu) |
| Mobilde rezervasyon butonuna mesafe | **5,2 ekran** (y=4.228 px) |
| Mobilde ilk fiyata mesafe | 3 ekran (y=2.465 px) |
| Yapışkan rezervasyon CTA'sı | yok |

### 6.5.1 — Arama bağlamı (1,5 gün)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | Liste `in`/`out` okusun ve `rangeHasConflict()` ile filtrelesin | UX-01 |
| ⬜ | Kart href'i mevcut query'yi taşısın | UX-01 |
| ⬜ | Detay sayfası `checkIn`/`checkOut`/`guests` ile önceden dolsun | UX-01 |

> `rangeHasConflict()` zaten `availability.ts:24`'te hazır, `bookedRanges` zaten çekiliyor.
> **Tek başına en kısa yolu 7 tıklamadan 3'e indiriyor.** Bugün kullanıcı tarihi iki kez
> giriyor ve ilki hiçbir işe yaramıyor.

### 6.5.2 — Mobil huni (1,5 gün)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | Yapışkan alt CTA çubuğu (`fixed bottom-0 lg:hidden`) | UX-02 |
| ⬜ | `BookingBox` bottom-sheet — **takvim kutunun içinde** | UX-02, UX-03 |
| ⬜ | WhatsApp CTA'sı (villa detayı + mobil çubuk + teşekkürler) | UX-06 |

### 6.5.3 — Fiyat tutarlılığı (1 gün)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | `discountPercent`'i `calcPrice`'a ekle *(bugün kartta ve takvimde gösteriliyor, toplama yansımıyor)* | PARA-03 |
| ⬜ | Kart, filtre, sıralama ve kutu **aynı metriği** göstersin | UX-03 |
| ⬜ | Fiyat filtresi sınırlarını veriden türet, çift uçlu yap *(bugün 25.000 ₺'de tavan)* | UX-04 |

> **UX-03 bugün görünür bir çelişki üretiyor:** kart sezon aralığını gösteriyor ama filtre
> ve sıralama taban fiyata bakıyor — "≤10.000 ₺" filtresi "₺12.000–₺25.000" yazan kart
> döndürebiliyor.

### 6.5.4 — Güven ve dürüstlük (1 gün)

| ⬜ | İş | Bulgu |
|---|---|---|
| ⬜ | Elle girilen yıldızları kaldır | UX-05 |
| ⬜ | Yerine: TÜRSAB 17305 + Bakanlık işletme belgesi + "yerinde denetlendi" + gerçek envanter sayısı | UX-05 |
| ⬜ | Sahte bileşenleri gerçeğe bağla veya kaldır: Kısa Kaçamak sayıları, iki arama sekmesi, favori kalbi, sahte harita, "Popüler" rozeti | UX-08 |
| ⬜ | 0-sonuç ekranını kurtarma ekranına çevir | UX |

> **UX-05 üç riski birden taşıyor:** reklam mevzuatı (gerçek olmayan değerlendirme =
> haksız ticari uygulama), SEO (bkz. Faz 6.1 uyarısı) ve dönüşüm (sahte görünen tekdüze
> puanlar güveni *düşürür*).

**Bitti sayılır:** Ana sayfada tarih seçip aramaya basan kullanıcı yalnızca o tarihlerde
müsait villaları görüyor; bir karta tıkladığında detay sayfası tarihleri ve fiyatı hesaplanmış
halde açılıyor; mobilde rezervasyon CTA'sı her zaman ekranda; kartta gösterilen fiyat ile
filtrede kullanılan fiyat aynı.

---

## FAZ 7 — Yayın *(denetim eklemeleri)*

`PLAN.md` Faz 7 aynen geçerli. Denetimin eklediği maddeler:

### 7.2'ye ek — ortam değişkenleri

| ⬜ | Değişken | Not |
|---|---|---|
| ⬜ | `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **Faz 5.8.4 bitmeden tanımlama** — widget yoksa tüm talepler reddedilir |
| ⬜ | `NEXT_PUBLIC_WHATSAPP_NUMBER` | Faz 6.5.2'de kullanılacak |
| ⬜ | `NEXT_PUBLIC_GA_ID` | Ölçüm — şu an hiç ölçüm yok |
| ⬜ | `NEXT_PUBLIC_SITE_URL` | `metadataBase` buna bağlı; yanlışsa OG görselleri `localhost`'a düşer |

### 7.3'e ek — Supabase yayın ayarları

- ⬜ **Pro plan + PITR** *(G1 kapısında zaten açılmış olmalı)*
- ⬜ "Allow new users to sign up" **kapalı** olduğunu Studio'dan teyit et
- ⬜ Tüm tablolarda `rowsecurity = true` teyidi
- ⬜ `villa-applications` bucket'ı `public = false` teyidi
- ⬜ `pages` tablosunda yalnızca `0010`'un politikaları olduğu teyidi

### 7.4'e ek — yayın öncesi test listesi

- ⬜ `curl -I` yanıtında CSP, HSTS, X-Frame-Options görünüyor
- ⬜ `/robots.txt` ve `/sitemap.xml` 200 dönüyor
- ⬜ Rezervasyon talebi uçtan uca çalışıyor **captcha açıkken**
- ⬜ Villa silme fotoğrafları da siliyor (Storage'da yetim kalmıyor)
- ⬜ Gece 01:00'de fiyat testi *(UTC/UTC+3 farkı — PARA-06)*
- ⬜ Lighthouse mobil: LCP < 2,5 sn, CLS < 0,1

---

## FAZ 8 — Yayın sonrası *(denetim eklemeleri)*

`PLAN.md` Faz 8'e eklenenler, öncelik sırasıyla:

1. **Gerçek yorum sistemi** — konaklama sonrası e-posta ile toplama. E-posta altyapısı
   (`lib/email/`) ve talep akışı zaten hazır. Bitince `AggregateRating` şeması açılabilir.
   *En büyük tek dönüşüm kazancı.*
2. **i18n URL migrasyonu** (`app/[locale]/...`) + `hreflang` + sitemap dil varyantları.
   *`PLAN.md` Faz 6'dan buraya taşındı — gerekçe §5'te.* DB'de `name_en`, `description_en`
   alanları zaten dolu; bugün hiç indekslenmiyor.
3. **Erişilebilirlik** — önce 30 dakikalık kazanımlar (odak halkası rengi, birincil buton
   kontrastı 2,22:1 → 7,25:1, 7 `aria-label`, "içeriğe atla", `role="alert"`), sonra
   `Field` bileşeninin `aria-describedby`/`aria-invalid` ile yeniden yazımı ve
   `useModalA11y` kancası.
4. **Panel cilası** — Sayfalar modülünü tasarım sistemine taşı *(tek hamlede 8 bulgu)*,
   `VillaForm`'daki kopya bölümleri sil *(5 dakika)*, `(panel)/not-found.tsx` ekle,
   `AdminTable`/`Pagination` ilkeli, `SiteSettingsForm`'u böl (1.425 satır, 24 `useState`).
5. **Kod sağlığı** — `ActionResult` jeneriği (18 kopya), `errorMessage()` (24 kopya),
   `paginate.ts` (4 kopya), `DeleteEntityButton` (5 kopya).
6. **Harita** — villa konumu ve en yakın POI mesafesi *(bugün "Konum" bölümü CSS gradient
   ile çizilmiş sahte bir harita; kısa vadede kapatılmalı)*.
7. **Ölçüm** — GA4 event'leri: arama, filtre, detay görüntüleme, talep gönderimi.

---

## 4. Kapsam dışı — bilinçli

`panel-yol-haritasi.md §5` konvansiyonunu izleyerek, denetimde çıkıp **yapılmayacak**
olanlar ve gerekçeleri:

| Ne | Gerekçe |
|---|---|
| Modül izinlerini RLS'e taşımak yerine ayrı şema | Küçük ekip; `has_module()` fonksiyonu yeterli (Faz 5.8.4) |
| Audit log tablosu | Faz 8'de değerlendirilir; PITR + soft delete kısa vadede yeterli |
| `cacheComponents` / `use cache` migrasyonu | Önce 5.9.1–5.9.2 yapılmalı; sonra değerlendirilir |
| Kesişim sayfaları (bölge × kategori) | 2.000 sayfa üretir, çoğu 0–2 villalı. Faz 8'de ≥5 villa eşiğiyle |
| `contact_messages` ve `reviews` tablolarını silmek | `reviews` Faz 8'de kullanılacak; `contact_messages` bırakılsın |
| Sonsuz kaydırma | Sayfalama tercih edildi — paylaşılabilir ve indekslenebilir |

---

## 5. Doküman borcu

Denetim, kod ile yazılı kuralın ayrıştığı üç yer buldu. `AGENTS.md` *"ihlal gerekiyorsa
önce dokümanı güncelle"* diyor:

- ⬜ **`docs/panel-kurallari.md §1`** — *"Oturum çerezleri httpOnly"* iddiası bugün yanlış.
  Faz 5.8.4 kodu düzeltiyor; düzelttikten sonra ifade doğru olacak, ama düzeltilene kadar
  doküman gerçeği yansıtmıyor.
- ⬜ **`docs/panel-kurallari.md §3`** — *"Kalıcı silme YOK"* diyor ama kodda üç yerde
  kontrollü kalıcı silme var (ve iyi yazılmış: `DeleteVillaModal` üç aşamalı, isim yazdırıyor).
  Kararı "kontrollü kalıcı silme" olarak güncelle.
- ⬜ **`ARCHITECTURE.md §7`** — panel dilinin tek dilli (Türkçe) olduğu istisnası yazılı
  değil; karar yalnızca `PLAN.md:325`'te, başka bir konunun içinde geçiyor. E-posta
  istisnası nasıl yazıldıysa bu da yazılmalı.
- ⬜ **`docs/panel-yol-haritasi.md §5`** — "Yapmayacaklarımız" listesinde Sayfalar ve
  rol/izin ekranı hâlâ duruyor; ikisi de yapıldı.
- ⬜ **`PLAN.md §0`** — "Sahte olanlar" ve "Mimari borçlar" listeleri demo dönemine ait;
  büyük kısmı çözüldü, yerine bu dokümanın bulguları geçmeli.

---

## 6. Karar bekleyenler

| Konu | Seçenekler | Öneri |
|---|---|---|
| **Yorum sistemi** | (a) Yıldızları şimdi kaldır, Faz 8'de gerçek sistem · (b) Elle girmeye devam | **(a).** Mevzuat + Google spam politikası riski; ayrıca sahte görünen puan dönüşümü düşürüyor |
| **i18n migrasyonu** | (a) Faz 8'e ertele · (b) `PLAN.md`'deki gibi Faz 6'da | **(a).** TR bile indekslenmiyorken 3–4 günlük refactor riski alınmamalı |
| **Kalıcı silme** | (a) Soft delete'e dön · (b) Kontrollü kalıcı silmeyi belgele | **(b).** Kod zaten iyi yazılmış; dokümanı koda eşitle. Ama PITR şart |
| **600 villa göç zamanı** | (a) G1 kapısından sonra · (b) Şimdi, düzeltmeler paralel | **(a).** Göç sonrası aynı hataların maliyeti katlanıyor |
| **Faz 6 ile 6.5 sırası** | (a) Paralel · (b) Önce 6.5 | Ekip tek kişiyse **6.5 önce** — dönüşüm etkisi daha hızlı ölçülür |

---

## 7. Kaynak

Tam denetim raporu (86 bulgu, kanıt ve çözüm kodlarıyla):
**https://claude.ai/code/artifact/53db25f7-d775-48aa-bdec-710438881dc5**

Denetimde doğrulanamayan ve **panelden/Supabase konsolundan teyit edilmesi gerekenler**:
Vercel üretim ortam değişkenleri (özellikle üretimde `TURNSTILE_SECRET_KEY` tanımlı mı —
tanımlıysa bugün tüm rezervasyon talepleri kırık demektir), Supabase Studio'daki gerçek RLS
durumu, "Allow new users to sign up" ayarı, ve PostgREST `db-max-rows` sınırı.
