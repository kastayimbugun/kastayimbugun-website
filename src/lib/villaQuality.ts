/**
 * Villa içerik kalite skoru (yol haritası 4.1).
 *
 * Booking.com'un "Property Page Score"una esinlenir: %100 skor, %18'e kadar
 * daha fazla rezervasyona denk geliyor. Teknik bilgisi düşük kullanıcıyı
 * eğitim vermeden doğru davranışa itmek için — hangi alan eksik, kaç puan.
 *
 * SAF fonksiyon: mevcut villa alanlarından hesaplanır, şema değişikliği yok.
 * Hem villa listesi (rozet) hem villa detayı (eksik listesi) aynı kaynağı
 * kullansın diye burada.
 */

export interface VillaQualityInput {
  descriptionTr: string | null;
  descriptionEn: string | null;
  imageCount: number;
  basePrice: number;
  seasonCount: number;
  minNights: number | null;
}

export interface QualityItem {
  key: string;
  label: string;
  /** 0–100 arası ağırlık; toplamları 100. */
  weight: number;
  done: boolean;
}

export interface VillaQuality {
  /** 0–100 arası yüzde. */
  score: number;
  items: QualityItem[];
  /** Yapılması gereken (done olmayan) maddeler. */
  missing: QualityItem[];
  tone: "danger" | "warning" | "success";
}

export function villaQuality(v: VillaQualityInput): VillaQuality {
  const has = (s: string | null) => !!s && s.trim().length > 0;

  const items: QualityItem[] = [
    { key: "cover", label: "Kapak fotoğrafı", weight: 20, done: v.imageCount >= 1 },
    {
      key: "photos",
      label: "En az 8 fotoğraf",
      weight: 15,
      done: v.imageCount >= 8,
    },
    {
      key: "descTr",
      label: "Türkçe açıklama",
      weight: 15,
      done: has(v.descriptionTr),
    },
    {
      key: "descEn",
      label: "İngilizce açıklama",
      weight: 15,
      done: has(v.descriptionEn),
    },
    {
      key: "basePrice",
      label: "Gecelik taban fiyat",
      weight: 15,
      done: v.basePrice > 0,
    },
    {
      key: "season",
      label: "Sezon fiyatı tanımlı",
      weight: 10,
      done: v.seasonCount >= 1,
    },
    {
      key: "minNights",
      label: "Minimum gece",
      weight: 10,
      done: (v.minNights ?? 0) >= 1,
    },
  ];

  const score = items.reduce((sum, it) => sum + (it.done ? it.weight : 0), 0);
  const missing = items.filter((it) => !it.done);
  const tone: VillaQuality["tone"] =
    score >= 85 ? "success" : score >= 60 ? "warning" : "danger";

  return { score, items, missing, tone };
}
