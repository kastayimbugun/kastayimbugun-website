import { createElement } from "react";
import {
  WavesHorizontal,
  Lock,
  Gem,
  Heart,
  Ship,
  Flame,
  Wallet,
  Flower2,
  Sparkles,
  Thermometer,
  Sunset,
  PawPrint,
  Baby,
  Home,
  type LucideIcon,
} from "lucide-react";

/**
 * Kategori ikonları veritabanında isim olarak tutulur (categories.icon).
 * Tüm lucide setini paketlememek için burada açık bir eşleme var —
 * yeni kategori ikonu eklendiğinde bu listeye de eklenmeli.
 */
const icons: Record<string, LucideIcon> = {
  WavesHorizontal,
  Waves: WavesHorizontal,
  Lock,
  Gem,
  Heart,
  Ship,
  Flame,
  Wallet,
  Flower2,
  Sparkles,
  Thermometer,
  Sunset,
  PawPrint,
  Baby,
};

/** Kategori ikonunu adına göre çizer. Bilinmeyen ad → varsayılan ikon. */
export function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  return createElement((name && icons[name]) || Home, { className });
}
