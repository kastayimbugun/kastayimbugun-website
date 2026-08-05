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
