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
