"use server";

import { z } from "zod";

import { getVillaCardsBySlugs, type VillaCardData } from "@/lib/data/villas";

/**
 * Favori villaların kartlarını getirir.
 *
 * Favoriler tarayıcıda (`localStorage`) durur, sunucu onları bilmez — bu yüzden
 * `/favoriler` sayfası slug listesini istemciden yollamak zorunda. Yalnızca
 * YAYINDAKİ villalar döner (`getVillaCardsBySlugs` böyle filtreliyor), yani bu
 * uç nokta üzerinden taslak/arşiv villa sızdırılamaz.
 *
 * Girdi doğrulaması ARCHITECTURE.md §4 gereği: liste istemciden geliyor, uzunluk
 * ve biçim burada sınırlanır — yoksa tek istekte binlerce slug yollanıp veri
 * katmanı zorlanabilirdi.
 */
const schema = z
  .array(z.string().regex(/^[a-z0-9-]{1,120}$/))
  .max(120);

export async function getFavoriteCards(
  slugs: unknown
): Promise<VillaCardData[]> {
  const parsed = schema.safeParse(slugs);
  if (!parsed.success) return [];
  if (parsed.data.length === 0) return [];
  return getVillaCardsBySlugs(parsed.data);
}
