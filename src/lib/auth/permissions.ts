/**
 * Panel modül izinleri — tek kaynak (docs/panel-kurallari.md §1).
 *
 * Bu dosya SAF ve import'suz: hem sunucuda (guard'lar) hem istemcide (AdminShell
 * nav filtreleme) çalışır. Her anahtar bir action dosyasına ve nav öğe(ler)ine
 * birebir eşleşir; 'admin' rolü tüm modülleri kapsar.
 */

export const MODULE_KEYS = [
  "villas",
  "reservations",
  "applications",
  "regions",
  "categories",
  "pages",
  "settings",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Personelin izin kutucuklarında ve nav'da görünen etiketler (Türkçe, panel tek dilli). */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  villas: "Villalar & Takvim",
  reservations: "Talepler & Rezervasyonlar",
  applications: "Villa Başvuruları",
  regions: "Bölgeler",
  categories: "Kategoriler",
  pages: "Sayfalar",
  settings: "Site ayarları",
};

/** Hızlı seçim şablonları — kutucukları önceden işaretler. */
export const PRESETS: { key: string; label: string; permissions: ModuleKey[] }[] = [
  {
    key: "villa",
    label: "Villa sorumlusu",
    permissions: ["villas"],
  },
  {
    key: "reservations",
    label: "Rezervasyon sorumlusu",
    permissions: ["reservations"],
  },
  {
    key: "content",
    label: "İçerik editörü",
    permissions: ["pages", "regions", "categories"],
  },
  {
    key: "all",
    label: "Tüm modüller",
    permissions: [...MODULE_KEYS],
  },
];

/** İzin taşıyan asgari personel şekli (StaffUser bunu karşılar). */
export interface PermissionHolder {
  role: "admin" | "editor";
  permissions: string[];
}

/** Bir personel verilen modüle erişebilir mi? Admin her zaman erişir. */
export function can(user: PermissionHolder, key: ModuleKey): boolean {
  if (user.role === "admin") return true;
  return user.permissions.includes(key);
}
