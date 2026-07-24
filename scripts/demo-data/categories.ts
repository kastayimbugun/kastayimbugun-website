import {
  Waves,
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
  type LucideIcon,
} from "lucide-react";

export type CategoryColor =
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "violet"
  | "teal";

export interface VillaCategory {
  slug: string;
  icon: LucideIcon;
  color: CategoryColor;
  /** true → ana sayfada tam kaydırmalı satır olarak da gösterilir. */
  featuredOnHome: boolean;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  /** Bu kategoride gösterilecek villalar — elle seçilir, sırası da burada. */
  villaSlugs: string[];
  /** Kategori tarayıcısında gösterilecek görsel URL'si */
  image: string;
}

/**
 * Villa kategorileri (sitenin gerçek "Villa Seçenekleri" yapısıyla eşleşir).
 * - Tümü üstteki "kategori tarayıcı" tile'larında görünür.
 * - Sadece `featuredOnHome: true` olanlar ana sayfada tam kaydırmalı satır olur.
 * Kategori/villa eklemek için sadece bu listeyi düzenle.
 */
export const villaCategories: VillaCategory[] = [
  {
    slug: "sea-view",
    icon: Waves,
    color: "sky",
    featuredOnHome: true,
    titleTr: "Deniz Manzaralı Villa",
    titleEn: "Sea View Villa",
    descTr: "Eşsiz deniz manzarasına hâkim villalar",
    descEn: "Villas overlooking a stunning sea view",
    villaSlugs: [
      "villa-deniz-kalkan",
      "villa-mavi-kas",
      "villa-panorama-kas",
      "villa-inci-bodrum",
      "villa-gunes-kalkan",
    ],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop",
  },
  {
    slug: "muhafazakar",
    icon: Lock,
    color: "violet",
    featuredOnHome: false,
    titleTr: "Muhafazakar Villa",
    titleEn: "Private Villa",
    descTr: "Yüksek duvarlarla çevrili, mahremiyeti önceliklendiren villalar",
    descEn: "High-walled villas prioritizing privacy",
    villaSlugs: ["villa-lavanta-islamlar", "villa-zeytin-gocek"],
    image:
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&h=400&fit=crop",
  },
  {
    slug: "luxury",
    icon: Gem,
    color: "amber",
    featuredOnHome: false,
    titleTr: "Lüks Villa",
    titleEn: "Luxury Villa",
    descTr: "Üst düzey konfor ve tasarım sunan villalar",
    descEn: "Villas with premium comfort and design",
    villaSlugs: [
      "villa-panorama-kas",
      "villa-deniz-kalkan",
      "villa-inci-bodrum",
    ],
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop",
  },
  {
    slug: "honeymoon",
    icon: Heart,
    color: "rose",
    featuredOnHome: true,
    titleTr: "Balayı Villası",
    titleEn: "Honeymoon Villa",
    descTr: "Çiftler için romantik ve mahremiyeti yüksek kaçamaklar",
    descEn: "Romantic, private escapes for couples",
    villaSlugs: [
      "villa-mavi-kas",
      "villa-gunes-kalkan",
      "villa-deniz-kalkan",
      "villa-lavanta-islamlar",
    ],
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=400&fit=crop",
  },
  {
    slug: "near-sea",
    icon: Ship,
    color: "sky",
    featuredOnHome: false,
    titleTr: "Denize Yakın Villa",
    titleEn: "Villa Near the Sea",
    descTr: "Denize kısa yürüme mesafesindeki villalar",
    descEn: "Villas just steps from the sea",
    villaSlugs: ["villa-deniz-kalkan", "villa-gunes-kalkan", "villa-mavi-kas"],
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=400&h=400&fit=crop",
  },
  {
    slug: "heated-pool",
    icon: Flame,
    color: "amber",
    featuredOnHome: true,
    titleTr: "Havuz Isıtmalı Villa",
    titleEn: "Heated Pool Villa",
    descTr: "Dört mevsim yüzme keyfi sunan ısıtmalı havuzlar",
    descEn: "Heated pools for year-round swimming",
    villaSlugs: ["villa-orman-fethiye", "villa-panorama-kas"],
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop",
  },
  {
    slug: "economic",
    icon: Wallet,
    color: "teal",
    featuredOnHome: false,
    titleTr: "Ekonomik Villalar ve Kiralık Apartlar",
    titleEn: "Budget Villas & Apartments",
    descTr: "Uygun fiyatlı, bütçe dostu konaklama seçenekleri",
    descEn: "Affordable, budget-friendly stays",
    villaSlugs: ["villa-inci-bodrum", "villa-lavanta-islamlar"],
    image:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=400&fit=crop",
  },
  {
    slug: "private-garden",
    icon: Flower2,
    color: "emerald",
    featuredOnHome: false,
    titleTr: "Özel Bahçeli Villalar",
    titleEn: "Private Garden Villas",
    descTr: "Geniş, özel kullanımlı bahçesi olan villalar",
    descEn: "Villas with a spacious private garden",
    villaSlugs: [
      "villa-lavanta-islamlar",
      "villa-orman-fethiye",
      "villa-zeytin-gocek",
    ],
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=400&fit=crop",
  },
  {
    slug: "luxury-honeymoon",
    icon: Sparkles,
    color: "rose",
    featuredOnHome: false,
    titleTr: "Lüks Balayı Villaları",
    titleEn: "Luxury Honeymoon Villas",
    descTr: "Balayı çiftleri için üst segment, ayrıcalıklı villalar",
    descEn: "Premium villas for honeymooning couples",
    villaSlugs: ["villa-panorama-kas", "villa-deniz-kalkan"],
    image:
      "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=400&fit=crop",
  },
  {
    slug: "sauna",
    icon: Thermometer,
    color: "violet",
    featuredOnHome: false,
    titleTr: "Saunalı Villalar",
    titleEn: "Villas with Sauna",
    descTr: "Özel saunası bulunan, rahatlatıcı villalar",
    descEn: "Relaxing villas with a private sauna",
    villaSlugs: ["villa-orman-fethiye", "villa-panorama-kas"],
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop",
  },
  {
    slug: "sea-view-honeymoon",
    icon: Sunset,
    color: "sky",
    featuredOnHome: false,
    titleTr: "Deniz Manzaralı Balayı Villaları",
    titleEn: "Sea View Honeymoon Villas",
    descTr: "Gün batımı eşliğinde deniz manzaralı balayı kaçamağı",
    descEn: "A honeymoon escape with sea view sunsets",
    villaSlugs: ["villa-mavi-kas", "villa-deniz-kalkan"],
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=400&fit=crop",
  },
  {
    slug: "pet-friendly",
    icon: PawPrint,
    color: "teal",
    featuredOnHome: false,
    titleTr: "Evcil Hayvan Dostu Villalar",
    titleEn: "Pet-Friendly Villas",
    descTr: "Dostunuzla birlikte konaklayabileceğiniz villalar",
    descEn: "Villas where your furry friend is welcome",
    villaSlugs: ["villa-lavanta-islamlar", "villa-zeytin-gocek"],
    image:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop",
  },
  {
    slug: "kids-pool",
    icon: Baby,
    color: "emerald",
    featuredOnHome: false,
    titleTr: "Çocuk Havuzlu Villalar",
    titleEn: "Kids Pool Villas",
    descTr: "Çocuklar için ayrı sığ havuzu bulunan aile villaları",
    descEn: "Family villas with a separate shallow kids' pool",
    villaSlugs: ["villa-orman-fethiye", "villa-zeytin-gocek"],
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=400&fit=crop",
  },
];

export const featuredCategories = villaCategories.filter(
  (c) => c.featuredOnHome
);
