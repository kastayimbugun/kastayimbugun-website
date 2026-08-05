import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bir villa değiştiğinde tazelenmesi gereken tüm yolları tek yerden tazeler.
 *
 * Daha önce bu yardımcının iki ayrı kopyası vardı (`villas.ts` ve `images.ts`)
 * ve yalnızca biri ana sayfayı tazeliyordu — yani görsel eklenince ana sayfa
 * güncelleniyor, sezon/tarih değişince güncellenmiyordu.
 */
export async function revalidateVilla(
  supabase: SupabaseClient,
  villaId: string
) {
  const { data } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", villaId)
    .maybeSingle();

  revalidatePath("/yonetim/villalar");
  revalidatePath(`/yonetim/villalar/${villaId}`);
  if (data?.slug) revalidatePath(`/villa/${data.slug}`);
  // Ana sayfa ve liste sayfaları villa verisini gösterir.
  revalidatePath("/", "layout");
}
