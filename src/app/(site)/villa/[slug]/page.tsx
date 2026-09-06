import { notFound } from "next/navigation";
import type { Metadata } from "next";
import sanitize from "sanitize-html";
import VillaDetailClient from "@/components/VillaDetailClient";
import {
  getVilla,
  getSimilarVillas,
  getVillasBySlugs,
  getRegions,
  type Region,
} from "@/lib/data/villas";
import { getSiteSettings } from "@/lib/data/site";
import { getCategories } from "@/lib/data/categories";
import { amenityOptions } from "@/lib/adminMeta";
import {
  SITE_URL_UNUSABLE,
  VILLA_LIST_PATH,
  absoluteUrl,
  regionAncestors,
  regionPath,
  villaPath,
} from "@/lib/seo/urls";
import {
  breadcrumbList,
  serializeJsonLd,
  vacationRental,
} from "@/lib/seo/jsonLd";
import type { Villa } from "@/lib/types";

// Villa verisi değişince sayfa en geç 5 dakikada tazelenir
// (yönetim panelinde anlık tazeleme Faz 5'te eklenecek).
// DİKKAT: bu ayar BUGÜN etkisiz — nedeni aşağıdaki render stratejisi notunda.
export const revalidate = 300;

/**
 * RENDER STRATEJİSİ — `generateStaticParams` BİLEREK YOK.
 *
 * Sayfa aramadan gelen tarih/kişi bağlamını okuyor (aşağıda `searchParams`).
 * `searchParams` dinamik bir API'dir: okunduğu anda rota TAMAMEN dinamik olur.
 * Yani hem `generateStaticParams` hem yukarıdaki `revalidate = 300` bugün
 * hiçbir sayfa üretmiyor.
 *
 * Bu tahmin değil, son build çıktısından okundu:
 *  · `.next/prerender-manifest.json` içinde `/villa/**` için TEK kayıt yok —
 *    ne önceden üretilmiş yol, ne ISR fallback'i.
 *  · `.next/server/app/(site)/villa/[slug]/` içinde yalnızca `page.js` var;
 *    tek bir `.html`/`.rsc` üretilmemiş.
 *  · Karşılaştırma: `searchParams` OKUMAYAN `/sayfa/[slug]` aynı build'de ISR
 *    rotası olarak görünüyor. Fark tam olarak `searchParams`.
 *
 * Fonksiyon bu yüzden kaldırıldı. 602 villa için yaptığı tek iş, build'de 602
 * slug'ı DB'den çekip atmak ve okuyana "bu sayfalar statik" diye yanlış bilgi
 * vermekti. Asıl tehlike ise sessiz: biri `searchParams` okumasını kaldırdığı
 * gün build birdenbire 602 sayfayı önceden üretmeye başlardı — sayfa başına
 * getVilla + getSiteSettings + getSimilarVillas, üstüne düzenin
 * getRegions/getFooterPages'i ⇒ ~2.400 Supabase sorgusu ve dakikalarca build.
 *
 * Gerçek çözüm bu dosyanın DIŞINDA:
 *  a) next.config.ts'te PPR/`cacheComponents` açılır → kabuk statik üretilir,
 *     yalnızca `searchParams`'a bağlı kısım istekte çözülür; ya da
 *  b) tarih ön doldurması istemciye taşınır (VillaDetailClient).
 * İkisi de başka ajanın dosyası; karar raporlandı. O gün geldiğinde 602 sayfa
 * için doğru biçim yine "hepsini build'de üret" DEĞİL, boş liste + `revalidate`
 * ile ilk istekte üretimdir (ya da yalnızca öne çıkanlar).
 */

/** Meta açıklama için üst sınır — Google ~160 karakterden sonrasını kırpıyor. */
const META_DESCRIPTION_MAX = 160;

/**
 * Olanak anahtarı → EKRANDA GÖRÜNEN Türkçe ad.
 *
 * `vacationRental()` `AmenityKey` değil yerelleştirilmiş etiket bekliyor. Site
 * sözlüğü (`src/lib/i18n.tsx`) bir `"use client"` context'i, sunucudan
 * çağrılamaz; panelin olanak sözlüğü ise saf bir modül ve etiketleri site
 * sözlüğündeki TR karşılıklarıyla birebir aynı. Sözlükte olmayan bir anahtar
 * sessizce düşer — uydurma etiket üretilmez.
 */
const AMENITY_LABELS = new Map(amenityOptions.map((a) => [a.key, a.label]));

/**
 * Zengin metni düz metne indirger.
 *
 * Açıklama panelde zengin metin editöründen giriliyor, yani HTML içerebilir;
 * meta açıklamaya ham etiket girmemeli. Etiketler KENDİ regex'imizle değil
 * `sanitize-html` ile sökülüyor (paket zaten projede: `src/lib/sanitizeHtml.ts`)
 * çünkü `<[^>]*>` biçiminde bir regex `<script>` GÖVDESİNİ metin olarak
 * bırakır, `title="a>b"` gibi bir öznitelikte yanlış yerde keser ve
 * `&nbsp;`/`&#39;` gibi varlıkları hiç çözmez. `allowedTags: []` üçünü de
 * doğru yapar.
 */
function plainText(html: string | null | undefined): string {
  if (!html) return "";

  // Etiket sınırlarına önce boşluk konur. sanitize-html etiketi silerken yerine
  // HİÇBİR ŞEY koymuyor: `<h2>Villa Deniz</h2><p>Kalkan'da…` düz metne
  // "Villa DenizKalkan'da…" olarak iniyor, yani iki kelime birbirine yapışıyor.
  // İşaretleme ayrıştırmadan ÖNCE yapıldığı için ayrıştırmayı bozmaz: `<` ya
  // etiket başlangıcıdır (önüne boşluk zararsız) ya da zaten düz metindir.
  const stripped = sanitize(html.replace(/</g, " <"), {
    allowedTags: [],
    allowedAttributes: {},
  });

  // sanitize-html çıkan METİNDEKİ `&`, `<`, `>`, `"` karakterlerini yeniden
  // kaçırır; açıklamada `&amp;` görünmesin diye geri çözülür (React öznitelik
  // değerini kendisi kaçırdığı için güvenli). `&amp;` EN SONDA: önce çözülürse
  // `&amp;lt;` yanlışlıkla `<` olur.
  const decoded = stripped
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");

  // `\s` kırılmaz boşluğu (`&nbsp;` →  ) da kapsar, tek boşluğa iner.
  return decoded.replace(/\s+/g, " ").trim();
}

/** Sınırı aşan metni kelimeyi ortadan bölmeden kırpar. */
function clamp(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Son boşluk çok başta kaldıysa (tek uzun sözcük) olduğu yerden kesilir.
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/**
 * Meta açıklama. Sayfa Türkçe render ediliyor (kök düzen `lang="tr"`), o yüzden
 * önce TR metin; TR boşsa hiç açıklama basmaktansa EN metin yeğdir (602 villa
 * göç edecek, tek dili boş satırlar olacak).
 */
function metaDescription(villa: Villa): string | null {
  const text = plainText(villa.descriptionTr) || plainText(villa.descriptionEn);
  return text ? clamp(text, META_DESCRIPTION_MAX) : null;
}

/**
 * OG görseli: villanın İLK fotoğrafı.
 *
 * Veri katmanı yolları `imageUrl()` ile tam Supabase Storage adresine
 * çeviriyor. Yine de http(s) süzgeci var: `NEXT_PUBLIC_SUPABASE_URL` eksikse
 * `imageUrl()` göreli bir yol üretir, OG görseli ise mutlak adres ister.
 * Fotoğrafı olmayan villada alan HİÇ basılmaz — uydurma yol basmaktansa
 * önizlemenin görselsiz kalması doğru.
 */
function coverImage(villa: Villa): string | null {
  return villa.images.find((src) => /^https?:\/\//i.test(src)) ?? null;
}

/**
 * Kanonik adres.
 *
 * `urls.ts`'teki açık uyarı: `NEXT_PUBLIC_SITE_URL` üretimde localhost kalırsa
 * buradan localhost döner. Canonical bir TAVSİYE değil YÖNERGEDİR — Google'ın
 * erişemediği bir adresi göstermek sayfayı indeksten düşürebilir. Böyle bir
 * üretim derlemesinde alan hiç basılmaz (Google o zaman sayfayı kendine
 * canonical sayar, yani doğru davranışa düşer); geliştirmede basılır ki
 * doğrulanabilsin. JSON-LD'deki `url` alanları aynı korumayı almıyor bilerek:
 * onlar yönerge değil betimlemedir, tutarsızsa Google yok sayar.
 */
function canonicalUrl(slug: string): string | null {
  if (SITE_URL_UNUSABLE) return null;
  return absoluteUrl(villaPath(slug));
}

/**
 * Villanın bölge düğümü.
 *
 * Veri katmanı villaya bölgenin yalnızca ADINI veriyor (`regions ( name,
 * province )`), id/slug'ını değil; zincir bu yüzden addan kuruluyor. Aynı adı
 * birden çok bölge taşıyabilir (iki ilin "Merkez"i) — o zaman il adıyla
 * daraltılır. Yine tek düğüme inilemezse `null` döner ve ekmek kırıntısında
 * bölge basamakları HİÇ yazılmaz: yanlış bölgeye bağlanan bir kırıntı,
 * eksik olandan kötüdür.
 */
function findRegion(villa: Villa, regions: Region[]): Region | null {
  const norm = (s: string | null | undefined) =>
    typeof s === "string" ? s.trim().toLocaleLowerCase("tr") : "";

  const name = norm(villa.region);
  if (!name) return null;

  const byName = regions.filter((r) => norm(r.name) === name);
  if (byName.length === 1) return byName[0];
  if (byName.length === 0) return null;

  // İl adıyla daralt. `getRegions()` alt bölgelerde `province` alanına ÜST
  // bölgenin adını yazıyor, villadaki `province` ise ham sütun — bu yüzden
  // ikisi de denenir (kök ata ya da doğrudan alan).
  const province = norm(villa.province);
  const narrowed = byName.filter(
    (r) =>
      norm(regionAncestors(r, regions)[0]?.name) === province ||
      norm(r.province) === province
  );
  return narrowed.length === 1 ? narrowed[0] : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // `getSiteSettings()` React `cache()` ile sarılı: sayfa da çağırdığı için
  // istek başına tek sorgu.
  const [villa, site] = await Promise.all([getVilla(slug), getSiteSettings()]);
  // Marka eki YAZILMAZ: kök düzendeki `title.template` (%s — <marka>) zaten
  // ekliyor. Burada da yazınca canlıda başlık "Villa Derin, Çukurbağ —
  // Kastayım Bugün Villaları — Kastayım Bugün Villaları" çıkıyordu; bu dosya
  // şablon eklenmeden önce yazıldığı için fark edilmemişti.
  if (!villa) return { title: "Villa bulunamadı" };

  const brand = site.brandName?.trim() || "Kastayım Bugün Villaları";
  const place = villa.region.trim();
  const heading = place ? `${villa.name}, ${place}` : villa.name;
  // Sekme başlığına marka EKLENMEZ (yukarıdaki nota bak). Open Graph başlığı
  // ise ayrı: paylaşımda marka `og:site_name` ile taşınır, o yüzden orada da
  // tekrar etmeye gerek yok.
  const title = heading;

  const description = metaDescription(villa);
  const canonical = canonicalUrl(villa.slug);
  const cover = coverImage(villa);

  return {
    title,
    ...(description ? { description } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      locale: "tr_TR",
      title,
      siteName: brand,
      ...(description ? { description } : {}),
      ...(canonical ? { url: canonical } : {}),
      ...(cover ? { images: [{ url: cover, alt: heading }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description ? { description } : {}),
      ...(cover ? { images: [cover] } : {}),
    },
  };
}

export default async function VillaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Aramadan gelen bağlam: kullanıcı listede tarih seçtiyse burada da hazır
  // gelsin. Sunucuda çözülür, istemciye prop olarak iner (useSearchParams'a
  // gerek yok — o statik sayfayı CSR bailout'a düşürür).
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const iso = (v: string | string[] | undefined) => {
    const x = one(v);
    return x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
  };
  const initialCheckIn = iso(sp.giris) ?? iso(sp.in);
  const initialCheckOut = iso(sp.cikis) ?? iso(sp.out);
  const kisi = Number(one(sp.kisi) ?? one(sp.guests));
  const initialGuests = Number.isFinite(kisi) && kisi > 0 ? kisi : null;
  const [villa, site, regions] = await Promise.all([
    getVilla(slug),
    getSiteSettings(),
    getRegions(),
  ]);
  if (!villa) notFound();

  const prefs = site.villaDetailPrefs;

  // "Benzer Villalar" kategori moduna alınmışsa, o kategorinin villalarını
  // önceden çöz — istemci bileşeni kategori verisine erişmesin diye burada yapılır.
  let categoryVillas: Villa[] | undefined;
  if (prefs.similar.mode === "category" && prefs.similar.categorySlug) {
    const cats = await getCategories();
    const cat = cats.find((c) => c.slug === prefs.similar.categorySlug);
    if (cat) {
      categoryVillas = await getVillasBySlugs(
        cat.villaSlugs.filter((s) => s !== slug),
        3
      );
    }
  }

  // Kategori modu değilse benzer villalar SQL'de 3'e daraltılır.
  // Eskiden burada `getVillas()` ile 600 villanın TAMAMI çekilip istemciye
  // prop'lanıyor, 3 tanesi kullanılıyordu.
  const similar =
    prefs.similar.mode === "category"
      ? []
      : await getSimilarVillas(slug, villa.region, 3);

  // Villa düğümü: fiyat `displayPriceRange()` ile temelde hesaplanıyor, puan ve
  // yorum sayısı BİLEREK basılmıyor (bkz. jsonLd.ts başındaki not).
  const rental = vacationRental({
    ...villa,
    description: villa.descriptionTr || villa.descriptionEn,
    amenityLabels: villa.amenities
      .map((key) => AMENITY_LABELS.get(key))
      .filter((label): label is string => Boolean(label)),
    // `petFriendly` işaretliyse evcil hayvan kabul ediliyor demektir. İşaretli
    // DEĞİLSE alan hiç yazılmaz: panelde boş bırakılmış olması "yasak" değil
    // "belirtilmemiş" de olabilir — bilmediğimizi bildirmeyiz.
    petsAllowed: villa.amenities.includes("petFriendly") ? true : undefined,
  });

  // Ekmek kırıntısı: Ana Sayfa → Villalar → (bölge zinciri) → villa.
  // Zincir YALNIZCA `parentId`'den kuruluyor (`regionAncestors`); `regions.depth`
  // sütunu bozuk (25 bölgenin 7'sinde yanlış), ona bakan bir zincir Kaş'ı
  // Antalya'nın altına koymaz. Basamak adları burada sabit: `i18n.tsx` bir
  // `"use client"` context'i, sunucudan çağrılamaz (e-posta şablonlarındaki
  // istisnanın aynısı, ARCHITECTURE.md §7).
  const crumbs = breadcrumbList([
    { name: "Ana Sayfa", path: "/" },
    { name: "Villalar", path: VILLA_LIST_PATH },
    ...regionAncestors(findRegion(villa, regions), regions).map((r) => ({
      name: r.name,
      path: regionPath(r, regions),
    })),
    { name: villa.name, path: villaPath(villa.slug) },
  ]);

  return (
    <>
      {/*
        JSON-LD. React `<script>` çocuğunu METİN olarak basmaz, bu yüzden tek
        yol `dangerouslySetInnerHTML`. ARCHITECTURE.md §5 bunu genel olarak
        yasaklıyor; JSON-LD bilinen tek istisna — kural ihlali değil. Kaçış elle
        yapılmıyor; temeldeki `serializeJsonLd()` `<` karakterini unicode
        kaçışına çeviriyor,
        yani panelden gelen metinde `</script>` geçse bile sayfadan çıkamaz.
        Next'in kendi rehberi de bu deseni tarif ediyor:
        node_modules/next/dist/docs/01-app/02-guides/json-ld.md
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(rental) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(crumbs) }}
      />
      <VillaDetailClient
        villa={villa}
        otherVillas={similar}
        prefs={prefs}
        categoryVillas={categoryVillas}
        initialCheckIn={initialCheckIn}
        initialCheckOut={initialCheckOut}
        initialGuests={initialGuests}
        whatsapp={site.whatsapp}
      />
    </>
  );
}
