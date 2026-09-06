import { displayPriceRange } from "@/lib/villaUtils";
import { SITE_URL, absoluteUrl, villaPath } from "@/lib/seo/urls";
import { plainTextClamped } from "@/lib/seo/text";

/**
 * schema.org yapılandırılmış veri (JSON-LD) üreticileri.
 *
 * Saf fonksiyonlar: veri çekmez, JSX döndürmez, düz nesne döndürür. Çağıran
 * taraf sonucu `<script type="application/ld+json">` içine basar — bunun için
 * `serializeJsonLd()` kullanılmalı (aşağıdaki not).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ DEĞİŞTİRMEDEN ÖNCE OKU — `aggregateRating` BURAYA GİRMEZ.                 │
 * │                                                                          │
 * │ Villaların yıldız puanı (`rating`) ve yorum sayısı (`reviewCount`)        │
 * │ veritabanına ELLE girildi; arkalarında gerçek bir değerlendirme sistemi   │
 * │ YOK — ne bir yorum tablosu, ne bir doğrulama, ne bir kaynak. İşletme      │
 * │ sahibi bu rakamların ekranda kalmasına karar verdi, ama bunları           │
 * │ `AggregateRating` / `Review` ile Google'a BİLDİRMEK ayrı bir şeydir:      │
 * │ doğrulanamayan puan bildirmek sahte yorum yaptırımı kapsamına girer ve    │
 * │ manuel işlemde sitenin TÜM zengin sonuçları kaldırılır.                   │
 * │                                                                          │
 * │ Bu yüzden bu dosya `aggregateRating`, `AggregateRating`, `ratingValue`,   │
 * │ `reviewCount` ve `review` alanlarının HİÇBİRİNİ üretmez. Gerçek,          │
 * │ doğrulanabilir bir yorum sistemi kurulmadan eklenmeyecek. Eklemek         │
 * │ isteyen önce bu paragrafı çürütmek zorunda.                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** Üretilen her düğümün tipi. `unknown` değer: nesne iç içe olabilir. */
export type JsonLd = Record<string, unknown>;

const SCHEMA_CONTEXT = "https://schema.org";

/** Tüm fiyatlar ₺ (bkz. `src/lib/pricing.ts` → `currency = "TRY"`). */
const CURRENCY = "TRY";

/** UN/CEFACT birim kodları: gün (gecelik fiyat), metrekare, adet (kişi). */
const UNIT_DAY = "DAY";
const UNIT_SQUARE_METRE = "MTK";
const UNIT_COUNT = "C62";

/**
 * Şirket künyesinin kalıcı düğüm kimliği. Diğer düğümler künyeyi tekrar
 * yazmak yerine `{ "@id": ORGANIZATION_ID }` ile buna bağlanır.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const text = (value: string | null | undefined): string | null => {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
};

const positive = (value: number | null | undefined): number | null => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const httpUrl = (value: string | null | undefined): string | null => {
  const s = text(value);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

/**
 * Açıklamayı düz metne indirger.
 *
 * Panelden gelen açıklama zengin metin olabilir; JSON-LD `description` alanı
 * işaretleme kabul etmez (Google etiketleri metnin parçası sayar). Uzunluk da
 * sınırlanır — yapılandırılmış veri özet içindir, tüm sayfayı tekrarlamaz.
 */
/**
 * Zengin metni düz metne indirger.
 *
 * Burada eskiden `<[^>]*>` regex'i vardı ve HTML VARLIKLARINI ÇÖZMÜYORDU:
 * açıklamada `&` geçen bir villa JSON-LD'ye ham `&amp;` olarak iniyordu —
 * JSON dizesinin İÇİNDE, yani öznitelik kaçışı değil; Google adı gerçekten
 * "Villa Sül&amp;Sar 1" diye okuyordu. Aynı sayfada `name` doğru çıkarken
 * `description` bozuktu, çünkü aynı işi yapan ikinci bir uygulama daha vardı
 * (villa detay sayfasında). Tek kaynağa indirildi: `./text`.
 */
const plainText = (
  value: string | null | undefined,
  maxLength = 5000
): string | null => plainTextClamped(text(value), maxLength);

/**
 * "16:00" → "16:00:00".
 *
 * schema.org `checkinTime`/`checkoutTime` xsd:time bekler; veri katmanı saati
 * `hh:mm` biçiminde kısaltıyor (`villas.ts` → `hhmm()`), o hâliyle geçersiz olur.
 */
const clockTime = (value: string | null | undefined): string | null => {
  const s = text(value);
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3] ?? "0");
  if (hh > 23 || mm > 59 || ss > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
};

/**
 * JSON-LD'yi `<script>` içine basılabilir dizgeye çevirir.
 *
 * `<` karakteri unicode kaçışına çevrilir: veri panelden geliyor ve içinde
 * `</script>` geçen bir metin sayfadan çıkıp XSS'e dönüşür. Next'in kendi
 * rehberi de bunu şart koşuyor
 * (`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`).
 *
 * ARCHITECTURE.md §5 `dangerouslySetInnerHTML` kullanmayı yasaklıyor; JSON-LD
 * script'i için başka yol yok (React `<script>` çocuğunu metin olarak basmaz).
 * Kaçış mantığı bu yüzden tek yerde, burada tutulur — dört ayrı sayfada dört
 * kez elle yazılmasın.
 */
export function serializeJsonLd(node: JsonLd): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}

/* ────────────────────────────── BreadcrumbList ───────────────────────────── */

export interface BreadcrumbItem {
  name: string;
  /**
   * Göreli yol (ör. `regionPath()` çıktısı) ya da mutlak URL. Verilmezse o
   * basamak bağlantısız kalır — son basamak (bulunulan sayfa) için olağandır.
   */
  path?: string | null;
}

/**
 * Arama sonucunda başlığın altında görünen yol çizgisi.
 *
 * Her basamağa `item` (mutlak URL) yazılır — Google son basamakta bunu zorunlu
 * tutmaz ama yasaklamaz da; yazmak listeyi baştan sona takip edilebilir kılar.
 * `path` verilmeyen basamakta alan hiç basılmaz (boş string basmak hatadır).
 */
export function breadcrumbList(items: readonly BreadcrumbItem[]): JsonLd {
  const usable = (Array.isArray(items) ? items : []).filter(
    (item) => item && text(item.name) !== null
  );

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: usable.map((item, index) => {
      const element: JsonLd = {
        "@type": "ListItem",
        position: index + 1,
        name: text(item.name),
      };
      const path = text(item.path);
      if (path) element.item = absoluteUrl(path);
      return element;
    }),
  };
}

/* ────────────────────────────── TravelAgency ─────────────────────────────── */

/**
 * `getSiteSettings()` çıktısının künye için kullanılan alanları. `SiteSettings`
 * bu arayüzü yapısal olarak karşılar, doğrudan geçirilebilir.
 */
export interface TravelAgencyInput {
  brandName?: string | null;
  agencyName?: string | null;
  tursabNo?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  logoImage?: string | null;
  ogImage?: string | null;
}

/**
 * Şirket künyesi. Ana sayfada (ya da kök düzende) bir kez basılır.
 *
 * `TravelAgency` seçildi çünkü işletme villaları kendi mülkü olarak değil
 * aracı olarak kiralıyor (TÜRSAB belgesi de bunu gösteriyor).
 *
 * Panelde boş bırakılan alan HİÇ basılmaz. Boş string ya da uydurma varsayılan
 * basmak, alanı hiç yazmamaktan kötüdür: Google eksik alanı görmezden gelir,
 * yanlış alanı veri olarak kabul eder.
 */
export function travelAgency(site: TravelAgencyInput): JsonLd {
  const node: JsonLd = {
    "@context": SCHEMA_CONTEXT,
    "@type": "TravelAgency",
    "@id": ORGANIZATION_ID,
    url: SITE_URL,
  };

  // Künyenin adı: ticari unvan varsa o, yoksa marka adı. İkisi de boşsa alan
  // yazılmaz — kod içine marka adı gömmek ARCHITECTURE.md §7'ye aykırı, ve
  // ayarı panelden doldurmak zaten doğru çözüm.
  const name = text(site.agencyName) ?? text(site.brandName);
  if (name) node.name = name;

  const brand = text(site.brandName);
  if (brand && name && brand !== name) node.alternateName = brand;

  const logo = httpUrl(site.logoImage);
  if (logo) node.logo = logo;

  const image = httpUrl(site.ogImage) ?? logo;
  if (image) node.image = image;

  const phone = text(site.phone) ?? text(site.whatsapp);
  if (phone) node.telephone = phone;

  const email = text(site.email);
  if (email) node.email = email;

  const address = text(site.address);
  if (address) {
    node.address = {
      "@type": "PostalAddress",
      streetAddress: address,
      addressCountry: "TR",
    };
  }

  // TÜRSAB belge numarası: doğrulanabilir bir kimlik, künyenin güvenilirliğini
  // taşıyan tek resmî alan.
  const tursab = text(site.tursabNo);
  if (tursab) {
    node.identifier = {
      "@type": "PropertyValue",
      name: "TÜRSAB",
      value: tursab,
    };
  }

  const sameAs = [httpUrl(site.instagramUrl), httpUrl(site.facebookUrl)].filter(
    (u): u is string => u !== null
  );
  if (sameAs.length) node.sameAs = sameAs;

  return node;
}

/* ───────────────────────────── VacationRental ────────────────────────────── */

/**
 * `vacationRental()` girdisi — tam `Villa` şekli şart değil.
 *
 * `Villa` bu arayüzü karşılar; yalnızca `description` ayrıca verilmeli, çünkü
 * veri katmanı açıklamayı dile göre iki alanda tutuyor
 * (`descriptionTr` / `descriptionEn`) ve hangisinin basılacağına sayfa karar verir.
 */
export interface VacationRentalInput {
  slug: string;
  name: string;
  /** Tesis kodu (KBV1234) — `identifier` olarak yazılır. */
  code?: string | null;
  region?: string | null;
  province?: string | null;
  /** Tam URL'ler (`imageUrl()` çıktısı). */
  images?: readonly string[];
  /** Sayfada gösterilen dildeki açıklama. */
  description?: string | null;
  capacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** m² */
  size?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  petsAllowed?: boolean | null;
  /**
   * Olanakların EKRANDA GÖSTERİLEN (yerelleştirilmiş) adları.
   *
   * `AmenityKey` değil isim alınıyor: sözlük `src/lib/i18n.tsx` içinde ve o bir
   * `"use client"` context'i, sunucudan çağrılamaz. Burada ikinci bir etiket
   * sözlüğü tutmak iki listenin zamanla ayrışması demekti — çeviriyi zaten
   * elinde tutan çağıran taraf geçirir.
   */
  amenityLabels?: readonly string[];
  /** Fiyat alanları — hesap `displayPriceRange()` ile yapılır. */
  pricePerNight: number;
  seasons: readonly { price: number }[];
  discountPercent?: number | null;
}

/**
 * Villa detayının yapılandırılmış verisi.
 *
 * KARAR — `VacationRental`, `Product` DEĞİL:
 *
 *  · Bir villa gecesi satın alınan bir MAL değil, konaklama. Google'ın `Product`
 *    kuralları (merchant listing) kargo/iade/GTIN gibi mal alanlarını bekler;
 *    villayı `Product` diye bildirmek Search Console'da sürekli uyarı üretir ve
 *    içeriği yanlış tanıtır.
 *  · `Product` zengin sonucunun asıl çekiciliği yıldızlardır; bu proje
 *    `aggregateRating` BASAMAZ (dosya başındaki nota bak). Puansız bir `Product`
 *    yanlış tipte olmanın riskini alır, karşılığında hiçbir şey kazanmaz.
 *  · `VacationRental` bu içerik için schema.org'un/Google'ın tanımladığı tiptir.
 *    Zengin sonucu Google'ın Tatil Kiralama ortak programına bağlı olduğu için
 *    (site henüz orada değil) görsel bir kazanç beklenmemeli — ama işaretleme
 *    ANLAMCA doğru, yaptırım riski sıfır ve Google dışındaki tarayıcılar
 *    (yapay zekâ derleyicileri, diğer arama motorları) bunu okur. Alan adı
 *    bağlanıp program başvurusu yapılırsa temel hazır olur.
 *
 * Fiziksel özellikler `containsPlace` altındaki `Accommodation` düğümüne yazılır:
 * `VacationRental` bir `LodgingBusiness`'tır ve `occupancy`, `floorSize`,
 * `numberOfBedrooms` gibi alanlar `LodgingBusiness`'ta değil `Accommodation`'da
 * tanımlıdır. Google'ın tatil kiralama şeması da bu iç içe yapıyı kullanır.
 *
 * Fiyat `displayPriceRange()` ile alınır — yani flaş indirim UYGULANMIŞ, kartta
 * ve detay başlığında yazan rakamla aynı. Buraya ayrı bir fiyat hesabı
 * yazılmamalı: aynı villada iki farklı rakam göstermek, düzeltilmiş eski bir
 * hatanın (kart indirimli, başlık indirimsiz) yapılandırılmış veride tekrarı olur.
 */
export function vacationRental(villa: VacationRentalInput): JsonLd {
  const url = absoluteUrl(villaPath(villa.slug));

  const node: JsonLd = {
    "@context": SCHEMA_CONTEXT,
    "@type": "VacationRental",
    "@id": `${url}#lodging`,
    url,
  };

  const name = text(villa.name);
  if (name) node.name = name;

  const description = plainText(villa.description);
  if (description) node.description = description;

  const identifier = text(villa.code);
  if (identifier) node.identifier = identifier;

  const images = (villa.images ?? [])
    .map((src) => httpUrl(src))
    .filter((src): src is string => src !== null);
  if (images.length) node.image = images.slice(0, 20);

  // Adres: villanın açık konumu bilinerek yazılmıyor (kiralık villalarda tam
  // adres rezervasyon sonrası paylaşılır). Bölge/il düzeyi hem doğru hem yeterli.
  const locality = text(villa.region);
  const administrativeArea = text(villa.province);
  if (locality || administrativeArea) {
    const address: JsonLd = { "@type": "PostalAddress", addressCountry: "TR" };
    if (locality) address.addressLocality = locality;
    if (administrativeArea) address.addressRegion = administrativeArea;
    node.address = address;
  }

  const checkinTime = clockTime(villa.checkIn);
  if (checkinTime) node.checkinTime = checkinTime;

  const checkoutTime = clockTime(villa.checkOut);
  if (checkoutTime) node.checkoutTime = checkoutTime;

  if (typeof villa.petsAllowed === "boolean") node.petsAllowed = villa.petsAllowed;

  const bedrooms = positive(villa.bedrooms);
  if (bedrooms) node.numberOfRooms = bedrooms;

  const accommodation: JsonLd = {
    "@type": "Accommodation",
    // Villa bütün olarak kiralanır; oda bazlı satış yok.
    additionalType: "EntirePlace",
  };
  if (bedrooms) accommodation.numberOfBedrooms = bedrooms;

  const bathrooms = positive(villa.bathrooms);
  if (bathrooms) accommodation.numberOfBathroomsTotal = bathrooms;

  const capacity = positive(villa.capacity);
  if (capacity) {
    accommodation.occupancy = {
      "@type": "QuantitativeValue",
      value: capacity,
      unitCode: UNIT_COUNT,
    };
  }

  const size = positive(villa.size);
  if (size) {
    accommodation.floorSize = {
      "@type": "QuantitativeValue",
      value: size,
      unitCode: UNIT_SQUARE_METRE,
    };
  }

  const amenityLabels = (villa.amenityLabels ?? [])
    .map((label) => text(label))
    .filter((label): label is string => label !== null);
  if (amenityLabels.length) {
    accommodation.amenityFeature = amenityLabels.map((label) => ({
      "@type": "LocationFeatureSpecification",
      name: label,
      value: true,
    }));
  }
  node.containsPlace = accommodation;

  const offer = nightlyOffer(villa, url);
  if (offer) node.makesOffer = offer;

  return node;
}

/**
 * Gecelik fiyat teklifi.
 *
 * `availability` BİLEREK yazılmıyor: müsaitlik tarihe bağlı (`villa_blocks`) ve
 * sayfa düzeyinde "stokta" demek çoğu gün yanlış olur. Bilmediğimiz bir şeyi
 * bildiriyormuş gibi yapmaktansa alanı hiç basmamak doğru.
 *
 * Fiyat hem düz alan (`price` / `lowPrice`+`highPrice`) hem de
 * `UnitPriceSpecification` olarak yazılır. Düz alanı her tüketici okur;
 * birim belirtimi ise rakamın TOPLAM değil GECELİK olduğunu söyler — bu ayrım
 * olmadan bir hafta kiralama fiyatı sanılabilir.
 */
function nightlyOffer(villa: VacationRentalInput, url: string): JsonLd | null {
  const { min, max } = displayPriceRange({
    pricePerNight: villa.pricePerNight,
    seasons: [...(villa.seasons ?? [])],
    discountPercent: villa.discountPercent ?? null,
  });

  const low = positive(min);
  const high = positive(max) ?? low;
  if (!low || !high) return null;

  const offeredBy = { "@id": ORGANIZATION_ID };

  if (low === high) {
    return {
      "@type": "Offer",
      url,
      priceCurrency: CURRENCY,
      price: low,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: CURRENCY,
        price: low,
        unitCode: UNIT_DAY,
      },
      offeredBy,
    };
  }

  return {
    "@type": "AggregateOffer",
    url,
    priceCurrency: CURRENCY,
    lowPrice: low,
    highPrice: high,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      priceCurrency: CURRENCY,
      minPrice: low,
      maxPrice: high,
      unitCode: UNIT_DAY,
    },
    offeredBy,
  };
}
