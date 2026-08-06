export type WaitingTone = "success" | "warning" | "danger";

/**
 * Bir talebin oluşturulmasından bu yana geçen süreyi rozet metnine çevirir.
 * Talepler listesi ve dashboard'daki "yanıt bekleyen" listesi aynı eşikleri
 * kullanır — sektör ölçütü: ilk saatte yanıtlananlarda dönüşüm belirgin
 * biçimde daha yüksek (bkz. docs/panel-yol-haritasi.md, Dalga 2.4).
 */
export function waitingBadge(createdAt: string): {
  label: string;
  tone: WaitingTone;
} {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  );
  const label =
    minutes < 60
      ? `${minutes} dk`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} sa`
        : `${Math.floor(minutes / 1440)} gün`;
  const tone: WaitingTone =
    minutes < 120 ? "success" : minutes < 480 ? "warning" : "danger";
  return { label: `${label} bekliyor`, tone };
}

/** Dakikayı "2 gün 4 sa" / "3 sa 20 dk" / "45 dk" biçiminde yazar. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} dk`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest ? `${h} sa ${rest} dk` : `${h} sa`;
  }
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h ? `${d} gün ${h} sa` : `${d} gün`;
}

/**
 * Talebin gelişiyle ilk durum değişimi arasındaki süre (yol haritası 2.4).
 * Henüz yanıtlanmamışsa null döner.
 */
export function responseMinutes(
  createdAt: string,
  firstResponseAt: string | null
): number | null {
  if (!firstResponseAt) return null;
  return Math.max(
    0,
    (new Date(firstResponseAt).getTime() - new Date(createdAt).getTime()) / 60000
  );
}
