import type { AmenityKey, PoolType } from "@/lib/types";

/**
 * Panel form seçenekleri (Türkçe etiketler). Site sözlüğünden bağımsız,
 * panel tek dilli olduğu için burada sabit.
 */

export const amenityOptions: { key: AmenityKey; label: string }[] = [
  { key: "privatePool", label: "Özel Havuz" },
  { key: "heatedPool", label: "Isıtmalı Havuz" },
  { key: "protectedPool", label: "Korumalı Havuz" },
  { key: "kidsPool", label: "Çocuk Havuzu" },
  { key: "seaView", label: "Deniz Manzarası" },
  { key: "natureView", label: "Doğa Manzarası" },
  { key: "jacuzzi", label: "Jakuzi" },
  { key: "sauna", label: "Sauna" },
  { key: "wifi", label: "Ücretsiz Wi-Fi" },
  { key: "airCon", label: "Klima" },
  { key: "bbq", label: "Barbekü" },
  { key: "parking", label: "Otopark" },
  { key: "petFriendly", label: "Evcil Hayvan Dostu" },
  { key: "babyCot", label: "Bebek Yatağı" },
  { key: "childproof", label: "Korunaklı Bahçe" },
  { key: "dishwasher", label: "Bulaşık Makinesi" },
  { key: "washingMachine", label: "Çamaşır Makinesi" },
  { key: "kitchen", label: "Tam Donanımlı Mutfak" },
  { key: "tv", label: "Smart TV" },
  { key: "fireplace", label: "Şömine" },
  { key: "gym", label: "Fitness Odası" },
  { key: "gameRoom", label: "Oyun Odası" },
  { key: "generator", label: "Jeneratör" },
];

export const amenityKeys = amenityOptions.map((a) => a.key);

export const poolOptions: { value: PoolType; label: string }[] = [
  { value: "private", label: "Özel havuz" },
  { value: "shared", label: "Ortak havuz" },
  { value: "none", label: "Havuz yok" },
];

export const dealTagOptions: { value: string; label: string }[] = [
  { value: "", label: "Yok" },
  { value: "shortStay", label: "Kısa Konaklama" },
  { value: "earlyBooking", label: "Erken Rezervasyon" },
  { value: "lastMinute", label: "Son Dakika" },
];

export const statusOptions: { value: string; label: string }[] = [
  { value: "draft", label: "Taslak" },
  { value: "published", label: "Yayında" },
  { value: "archived", label: "Arşiv" },
];

export type VillaStatusValue = "draft" | "published" | "archived";

/**
 * Villa durumunun etiketi + rozet tonu. Tek kaynak — daha önce villa listesi
 * ve villa detay sayfasında birebir kopya `statusMeta` nesnesi vardı.
 */
export const villaStatusMeta: Record<
  VillaStatusValue,
  { label: string; tone: "success" | "warning" | "neutral" }
> = {
  published: { label: "Yayında", tone: "success" },
  draft: { label: "Taslak", tone: "warning" },
  archived: { label: "Arşiv", tone: "neutral" },
};

// Kategori renkleri (site kategori rozetleriyle eşleşir)
export const categoryColorOptions: { value: string; label: string }[] = [
  { value: "sky", label: "Mavi" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Pembe" },
  { value: "emerald", label: "Yeşil" },
  { value: "violet", label: "Mor" },
  { value: "teal", label: "Turkuaz" },
];

// Kategori ikonları — src/lib/categoryIcons.tsx ile eşleşmeli
export const categoryIconOptions: { value: string; label: string }[] = [
  { value: "WavesHorizontal", label: "Dalga (deniz)" },
  { value: "Gem", label: "Elmas (lüks)" },
  { value: "Heart", label: "Kalp (balayı)" },
  { value: "Ship", label: "Gemi (denize yakın)" },
  { value: "Flame", label: "Alev (ısıtmalı)" },
  { value: "Wallet", label: "Cüzdan (ekonomik)" },
  { value: "Flower2", label: "Çiçek (bahçe)" },
  { value: "Sparkles", label: "Işıltı (özel)" },
  { value: "Thermometer", label: "Termometre (sauna)" },
  { value: "Sunset", label: "Gün batımı" },
  { value: "PawPrint", label: "Pati (evcil dostu)" },
  { value: "Baby", label: "Bebek (çocuk)" },
  { value: "Lock", label: "Kilit (korunaklı)" },
];
