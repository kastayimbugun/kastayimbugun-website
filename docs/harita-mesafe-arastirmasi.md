# Haritadan Konum Seçimi ve Otomatik Mesafe Ölçümü — Fizibilite Raporu

Hazırlanma tarihi: 05.08.2026
Soru: Panelde villayı haritadan işaretleyip (sürüklenebilir iğne), çevredeki
market / hastane / sahil / restoran gibi noktalara mesafeyi **otomatik** ölçebilir miyiz?

**Kısa cevap: Evet, yapılabilir ve tahmin edilenden ucuz.** Ama "her villa için
internetten çevresindeki mekânları ara" biçiminde değil. Senin tarif ettiğin
şekilde — *"3–4 bölge var, hastane/market/sahil çoğu sabit"* — kurmak hem daha
doğru sonuç verir hem neredeyse bedava olur. Gerekçeler aşağıda.

---

## 0. Önce durdurucu bir bulgu: bugün gösterilen mesafeler **uydurma**

Haritadan bağımsız, bu rapordan önce çözülmesi gereken bir sorun var.

`src/lib/distances.ts` mesafeleri **villa slug'ından türetilen sahte sayılarla**
üretiyor:

```ts
function seedNum(slug: string) {
  return Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
}
// slug'a bağlı sabit "rastgele" km değeri
const km = (salt, min, max) => (min + ((s * salt) % ((max - min) * 10)) / 10)
```

`VillaDetailClient.tsx:102` bunu doğrudan misafire gösteriyor: "Market 2.3 km",
"Eczane 1.7 km" — **hiçbiri gerçek değil.** Slug değişirse sayılar da değişir.

Buna karşılık Faz 5.6'da `0005_distance_facts.sql` ile gerçek alanlar eklenmiş
(`distance_airport_km`, `distance_market_km`, `distance_restaurant_km`,
`distance_transit_km`, `distance_center_km`) ve panelde bu alanlar elle
giriliyor — **ama site bu değerleri hiç okumuyor.**

> **Sonuç:** Bugün acente panelde doğru mesafeyi girse bile misafir uydurma sayı
> görüyor. Bu, harita projesinden bağımsız olarak hemen kapatılmalı: bir saatlik
> iş, `villaDistances()` sahte üreticiyi bırakıp villa kaydındaki gerçek alanları
> okuyacak; alan boşsa satırı hiç göstermeyecek.

Harita çalışması bunun **üzerine** gelir: elle girilen alanları otomatik dolduran
bir katman.

---

## 0.1 Eski sistemde harita zaten var — ve Leaflet ile yazılmış

Acentenin mevcut panelinde (`kaspanel26/property_map/`) villaları harita üzerinde
gösteren bir ekran mevcut ve altında **Leaflet** logosu görünüyor.

Bunun iki sonucu var:

- **Villa koordinatları eski veritabanında kayıtlı.** Bu raporun en büyük
  belirsizliğini kapatıyor: 600 villanın konumunu elle işaretleme işi (adım 7)
  büyük olasılıkla hiç gerekmeyecek, veri göçüyle `lat`/`lng` hazır gelecek.
  → MySQL dump alınırken koordinat sütunları **mutlaka** listeye dahil edilmeli.
- **Kütüphane seçimi doğrulanmış oldu.** Aşağıda Leaflet öneriliyor; acentenin
  bugünkü panelinde de aynı kütüphane var, yani ekran onlara tanıdık gelecek.

> Açık soru: haritada görünen işaretçi sayısı azdı. 600 villanın tamamında
> koordinat dolu mu, yoksa yalnızca bir kısmında mı? Göç sırasında `lat`/`lng`
> boş olan kayıtların sayısı, elle işaretlenecek villa sayısını verir.

---

## 1. İşin doğası: bu bir "POI arama" problemi değil

Sektörde bu iş genelde şöyle kurulur: villanın koordinatı alınır, her seferinde
bir POI servisine "bu noktanın 5 km çevresindeki marketleri ver" diye sorulur, en
yakını seçilir. Pahalı ve kırılgan yol budur.

Senin durumunda gerçekler farklı:

- **3–4 bölge var** (Kalkan, Kaş, İslamlar, Patara…), 600 villa bu bölgelere dağılmış
- Bir bölgedeki referans noktaları **herkes için aynı**: Kalkan'ın hastanesi,
  merkez marketi, halk plajı, otobüs terminali değişmiyor
- Havaalanı mesafeleri zaten bölge bazında sabit (kodda `airportsByRegion` olarak
  hâlihazırda var)

Yani asıl değişken **tek şey**: villanın kendi konumu. Referans noktaları sabit.

Bu, problemi "600 villa × 8 POI = 4.800 dış servis sorgusu, her villa
kaydedilişinde tekrar" olmaktan çıkarıp **"bölge başına ~10 nokta bir kez
tanımlanır, villa taşınınca sadece o villanın mesafeleri yeniden hesaplanır"**
haline getiriyor. Maliyet ve karmaşıklık farkı 100 kat.

---

## 2. Üç yaklaşım

| | A — Sabit referans noktaları | B — Overpass ile otomatik keşif | C — Google Places |
|---|---|---|---|
| Nasıl çalışır | Bölge başına POI'ler panelde bir kez işaretlenir | Villa koordinatı çevresinde OSM sorgulanır, en yakın bulunur | Google'ın mekân veritabanı sorgulanır |
| Doğruluk | **En yüksek** — acente hangi marketi kastettiğini kendi seçer | Orta — OSM'de kayıtlı olana bağlı | Yüksek ama "en yakın market" acentenin kastettiği olmayabilir |
| Türkiye veri kalitesi | Konu dışı (veriyi siz giriyorsunuz) | Kaş/Kalkan'da eksikler var; küçük bakkallar, yerel plajlar çoğu zaman yok | İyi |
| Maliyet | **0 TL** | 0 TL (adil kullanım) | Aylık ücret, aşağıda |
| Bağımlılık | Yok | Overpass'ın ayakta olmasına | Google faturasına |
| Kurulum | Bölge başına ~15 dk elle işaretleme | Kod + sorgu ayarı | Kod + API anahtarı + faturalandırma |

**Öneri: A.** B ve C'nin çözdüğü problem ("bilmediğim bir şehirde en yakın
marketi bul") sende yok — acente bölgeyi zaten avucunun içi gibi biliyor ve
misafire hangi noktayı referans göstermek istediğini kendisi bilir.

> B seçeneği tamamen ıskartaya çıkmasın: bölge referans noktalarını **ilk kez
> girerken** Overpass'tan öneri çekmek ("Kalkan çevresindeki hastaneler")
> işaretleme süresini kısaltır. Yani B'yi ana mekanizma değil, bir kerelik
> doldurma yardımcısı olarak kullanmak mantıklı.

---

## 3. Kuş uçuşu mu, yol mesafesi mi?

Bu, projenin en önemli teknik kararı.

**Kuş uçuşu (Haversine formülü)** — iki koordinat arasındaki düz çizgi.
Sıfır bağımlılık, sıfır maliyet, anında hesaplanır, ~15 satır kod.

**Ama Kaş–Kalkan coğrafyasında yanıltıcı.** Bölge dağlık ve kıyı virajlı; deniz
kenarındaki bir villa ile merkez arasında kuş uçuşu 1,2 km olabilirken araç
yolu 3,5 km sürebiliyor. Misafire "merkez 1,2 km" deyip 3,5 km yol yaptırmak,
bugünkü uydurma sayılardan daha iyi ama yine de şikâyet üretir.

**Yol mesafesi (routing)** gerçek sürüş mesafesini ve süresini verir. Bunun için
bir yönlendirme servisi gerekir:

| Servis | Durum |
|---|---|
| **OSRM demo sunucusu** | ⚠️ **Kullanılamaz.** Kullanım politikası açıkça *"non-commercial use-cases"* diyor ve paywall arkasına konmasını yasaklıyor. Acente sitesi ticari — ihlal olur |
| **GraphHopper / Geoapify / Stadia Maps** | Ücretsiz katmanları var (günlük birkaç bin istek). Bu iş için fazlasıyla yeterli |
| **Kendi OSRM/Valhalla sunucun** | Docker ile kurulur, Türkiye haritası ~1 GB. Sınırsız ve bedava ama bir sunucu daha bakmak demek |

**Önerilen kurgu — hibrit:**

1. Mesafeler **villa kaydedilirken bir kez** hesaplanır ve veritabanına yazılır.
   Sayfa her açıldığında dış servise gidilmez.
2. Hesaplama sırasında yol mesafesi servisi denenir; ulaşılamazsa kuş uçuşuna
   düşülür ve kayda "tahmini" işareti konur.
3. 600 villa × ~8 nokta = ~4.800 istek, **tek seferlik**. Ücretsiz katmanların
   günlük sınırına birkaç güne yayarak rahat sığar.

Bu kurgunun yan faydası: sayfa hızına sıfır etki, dış servis çökse bile site
etkilenmez (ARCHITECTURE.md'deki "veri katmanı" kuralıyla da uyumlu).

---

## 4. Hangi kütüphaneler?

### Harita: **Leaflet + react-leaflet**

MapLibre GL daha modern (WebGL, vektör tile, 3B) ve 2026'da yeni projeler için
sık önerilen varsayılan. Ama bizim ihtiyacımız **tek bir sürüklenebilir iğne** —
MapLibre'ın getirdiği her şey fazlalık. Leaflet ~40 KB, API'si yıllardır sabit,
sürüklenebilir işaretçi resmî dokümanda hazır örnek olarak var.

> Not: `react-leaflet` bir istemci bileşeni; Next.js'te `ssr: false` ile dinamik
> yüklenmeli. Bu, ARCHITECTURE.md §2'deki *"`use client` yaprak bileşende"*
> kuralıyla uyumlu — panel sayfası sunucu bileşeni kalır, sadece harita istemcide.

### Altlık (tile) sağlayıcısı

OSM'in kendi tile sunucusu **ticari kullanım için uygun değil** (adil kullanım
politikası). Ücretsiz katmanı olan sağlayıcılardan biri seçilmeli: MapTiler,
Stadia Maps, Geoapify, Jawg, Thunderforest. Hepsi API anahtarı istiyor,
hepsinin düşük hacim için bedava katmanı var. Panelde ayda birkaç yüz harita
açılışı olacağı için ücretsiz katman fazlasıyla yeter.

### Adres arama (geocoding)

Panelde "Kalkan merkez" yazıp haritayı oraya götürmek için. Nominatim (OSM)
ücretsiz ama **saniyede 1 istek** sınırı var ve sonuçların önbelleğe alınması
şart. Panelde nadir kullanılacağı için bu sınır sorun değil.

### Hazır bir paket var mı?

Aradım: **tam olarak bu işi yapan hazır bir paket yok.** Parçalar hazır:

- [react-leaflet resmî "Draggable Marker" örneği](https://react-leaflet.js.org/docs/example-draggable-marker/) — sürüklenebilir iğnenin tamamı
- [react-leaflet-location-picker](https://github.com/Ben-Bourne/react-leaflet-location-picker) — nokta/alan seçici bileşen
- [leaflet-control-geocoder](https://github.com/perliedman/leaflet-control-geocoder) — harita üstü adres arama kutusu

Bunları birleştirip mesafe hesabını eklemek **1–2 günlük** iş. Hazır paket
beklemek yerine kendi bileşenimizi yazmak daha doğru, çünkü mesafe mantığı
bize özgü (bölge referans noktaları).

---

## 5. Maliyet

| Kalem | Seçenek A (önerilen) | Google Places ile |
|---|---|---|
| Harita altlığı | Ücretsiz katman (MapTiler/Stadia) | Maps JS API — ücretli |
| Mekân verisi | Yok (kendi noktalarımız) | Places Nearby Search — SKU başına ücretli |
| Mesafe | GraphHopper/Geoapify ücretsiz katman veya self-host | Distance Matrix — ücretli |
| **Aylık maliyet** | **0 TL** | Değişken, faturalandırma zorunlu |

Google tarafında önemli bir değişiklik: **aylık 200 $ ortak kredi Mart 2025'te
kaldırıldı.** Artık her API'nin kendi küçük ücretsiz kotası var (düşük hacimli
ürünlerde tipik olarak ayda 0–200 istek). Yani "200 dolarlık kredi zaten yeter"
varsayımı artık geçerli değil; kredi kartı bağlamak ve faturayı izlemek gerekiyor.

---

## 6. Gereken şema değişikliği

```sql
-- Villanın haritadaki konumu
alter table villas
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

-- Bölge başına referans noktaları (hastane, market, plaj, merkez…)
create table if not exists distance_points (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references regions(id) on delete cascade,
  kind text not null check (kind in
    ('beach','market','pharmacy','hospital','restaurant',
     'center','bus','gas','airport')),
  name text not null,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  sort_order int not null default 0
);

-- Hesaplanmış mesafeler (villa × nokta)
create table if not exists villa_distances (
  villa_id uuid references villas(id) on delete cascade,
  point_id uuid references distance_points(id) on delete cascade,
  meters int not null,
  minutes int,
  -- yol mesafesi mi, kuş uçuşu tahmini mi
  method text not null check (method in ('route','straight')),
  computed_at timestamptz not null default now(),
  primary key (villa_id, point_id)
);
```

`0005_distance_facts.sql` ile gelen elle girilen sütunlar **kalır**: otomatik
hesap tutmadığında acentenin üzerine yazabilmesi gerekir (ör. "market" olarak
kastedilen yer OSM'de yoksa). Öncelik sırası: elle girilen değer > hesaplanan
değer > gösterme.

---

## 7. Uygulama planı

| Adım | İş | Süre |
|---|---|---|
| 0 | **Uydurma mesafeleri kaldır**, gerçek alanları siteye bağla | 1 sa |
| 1 | Şema: `lat/lng`, `distance_points`, `villa_distances` | 1 sa |
| 2 | Harita bileşeni: sürüklenebilir iğne + adres arama (panel villa formu) | 4–6 sa |
| 3 | Bölge referans noktaları ekranı — haritadan tıklayarak nokta ekleme | 4 sa |
| 4 | Mesafe hesaplama servisi (yol mesafesi + kuş uçuşu yedeği) | 4 sa |
| 5 | Villa kaydında otomatik yeniden hesaplama + "yeniden hesapla" butonu | 2 sa |
| 6 | Site tarafı: mesafe cetvelini gerçek veriden basma | 2 sa |
| 7 | Konumu boş kalan villaların elle işaretlenmesi | koordinatların ne kadarı göçle gelirse o kadar az |

Toplam geliştirme: **~2,5 gün.** Adım 7'nin yükü büyük ölçüde kalktı: eski
panelde Leaflet haritası olduğuna göre koordinatlar veritabanında duruyor
(bkz. §0.1) ve göçle birlikte gelecek. Geriye yalnızca koordinatı boş olan
kayıtlar kalır.

---

## 8. Verilen kararlar (05.08.2026)

Kullanıcı, otomatik keşif isteğini net biçimde teyit etti: villayı haritadan
işaretle → sistem en yakın hastane/market/restoran/plajı kendi bulsun →
mesafeyi ölçüp paneldeki alanlara **otomatik yazsın**. Bu **B yaklaşımıdır**
(§2). Raporun ilk önerisi A'ydı; kullanıcı tercihi B yönünde olduğu için plan
B'ye göre kesinleşti.

1. ✅ **Adım 0 yapıldı (05.08.2026)** — uydurma mesafeler kaldırıldı, site artık
   panelde girilen gerçek alanları okuyor, boş alan için satır göstermiyor.
2. **Yaklaşım B — Overpass ile otomatik en-yakın-POI keşfi.** Villa koordinatı
   çevresinde OSM sorgulanır, her tür için en yakın nokta bulunur.
3. **Mesafe türü: gerçek yol mesafesi** (kullanıcı seçimi). Dağlık coğrafyada
   kuş uçuşu yanıltıcı olduğu için. Ulaşılamazsa kuş uçuşuna düşülüp kayda
   "tahmini" işareti konur.
   - Yol mesafesi servisi: OSRM demo sunucusu **kullanılamaz** (ticari kısıt).
     Kendi OSRM/Valhalla sunucumuz (Docker, TR haritası ~1 GB) veya GraphHopper/
     Geoapify ücretsiz katmanı.
4. **Otomatik doldurulan alanlar düzenlenebilir kalır.** OSM Kaş/Kalkan kırsalında
   eksiksiz değil; küçük yerel noktalar kayıtlı olmayabilir. Otomatik değer bir
   başlangıçtır, acente üstüne yazabilir.
5. **Zamanlama: Faz 5.7 (panel tamamlama) bittikten sonra** (kullanıcı seçimi).
   Villalar panele girilmeden konum işaretlemenin anlamı yok; koordinatlar da
   büyük olasılıkla eski siteden göçle gelecek (§0.1).
6. Google Places'e gerek yok; ücretsiz katmanlarla dönen kurgu bu ölçekte yeter.

---

## Kaynaklar

- [MapLibre GL JS vs. Leaflet — Jawg](https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/)
- [Mapbox vs Leaflet vs MapLibre 2026 — PkgPulse](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026)
- [react-leaflet — Draggable Marker örneği](https://react-leaflet.js.org/docs/example-draggable-marker/)
- [react-leaflet-location-picker (GitHub)](https://github.com/Ben-Bourne/react-leaflet-location-picker)
- [leaflet-control-geocoder (GitHub)](https://github.com/perliedman/leaflet-control-geocoder)
- [OSRM API Usage Policy — ticari kullanım kısıtı](https://github.com/Project-OSRM/osrm-backend/wiki/API%20Usage%20Policy)
- [OSRM Demo server wiki](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)
- [Overpass API commons / adil kullanım](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [OSMF API Usage Policy](https://operations.osmfoundation.org/policies/api/)
- [Google Maps API fiyatlandırma 2026 — MapAtlas](https://mapatlas.eu/blog/google-maps-api-pricing-2026)
- [Google Places API gerçek maliyeti 2026 — Woosmap](https://www.woosmap.com/blog/google-places-api-pricing)
- [Stadia Maps — Google Maps alternatifleri 2026](https://stadiamaps.com/switch-to-stadia/from-google/)
- [Basemap seçenekleri ve maliyetleri — LuminFire](https://luminfire.com/2026/05/15/choosing-basemap/)
