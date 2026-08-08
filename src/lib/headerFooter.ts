/**
 * Header ve Footer içerik yapılandırması (panelden yönetilir).
 *
 * `site_settings.header_config` / `footer_config` (jsonb) içinde tutulur. Hem
 * sunucu veri katmanı (data/site.ts) hem istemci düzenleyicileri (HeaderEditor,
 * FooterEditor) ve render bileşenleri (Header, Footer) bu tipleri ve
 * `resolve*` fonksiyonlarını kullandığı için burası `server-only` DEĞİLDİR.
 *
 * Kayıt yoksa (null) koddaki VARSAYILAN döner — bu varsayılan bugünkü sabit
 * header/footer görünümüyle birebir aynıdır, böylece 0015 uygulanmadan da site
 * değişmez.
 */

// ————————————————————————— Header —————————————————————————

export interface MenuItem {
  id: string;
  labelTr: string;
  labelEn: string;
  href: string;
}

export interface HeaderConfig {
  /** Üstteki TÜRSAB güven şeridi. */
  topbar: {
    enabled: boolean;
    textTr: string;
    textEn: string;
    badgeTr: string;
    badgeEn: string;
  };
  menu: MenuItem[];
  /** Sağdaki vurgu butonu (bugünkü "Giriş Yap"). */
  cta: {
    enabled: boolean;
    labelTr: string;
    labelEn: string;
    href: string;
  };
}

// ————————————————————————— Footer —————————————————————————

export type FooterColumnType = "links" | "text" | "images";

export interface FooterLink {
  labelTr: string;
  labelEn: string;
  href: string;
}

export interface FooterImageItem {
  /** Storage yolu (raster) ya da yüklenmiş SVG yolu. */
  path: string;
  alt: string;
  /** Tıklanınca gidilecek bağlantı (opsiyonel). */
  href: string;
}

export interface FooterColumn {
  id: string;
  type: FooterColumnType;
  titleTr: string;
  titleEn: string;
  /** type === "links" */
  links: FooterLink[];
  /** type === "links" — hazır kaynaktan doldur (elle link yerine). */
  autoSource: "regions" | "pages" | null;
  /** type === "text" */
  bodyTr: string;
  bodyEn: string;
  /** type === "images" — TÜRSAB/sertifika/ödeme rozetleri. */
  items: FooterImageItem[];
}

export interface FooterConfig {
  /** İlk blok: logo + tanıtım + sosyal medya. */
  brand: {
    showLogo: boolean;
    taglineTr: string;
    taglineEn: string;
  };
  social: {
    instagram: string;
    facebook: string;
    youtube: string;
    x: string;
    whatsapp: string;
  };
  columns: FooterColumn[];
  bottomTextTr: string;
  bottomTextEn: string;
}

// ————————————————————————— Varsayılanlar —————————————————————————
// Bugünkü sabit header/footer ile birebir. id'ler SABİT (SSR/CSR uyumu için;
// yeni öğeler eklenirken crypto.randomUUID() kullanılır).

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  topbar: {
    enabled: true,
    textTr: "Kaş Likya Turizm Seyahat Acentası",
    textEn: "Kaş Likya Turizm Travel Agency",
    badgeTr: "TÜRSAB Belge No: 17305",
    badgeEn: "TÜRSAB Licence No: 17305",
  },
  menu: [
    { id: "villas", labelTr: "Villalar", labelEn: "Villas", href: "/villalar" },
    { id: "regions", labelTr: "Bölgeler", labelEn: "Regions", href: "/#regions" },
    { id: "about", labelTr: "Hakkımızda", labelEn: "About", href: "/#about" },
    { id: "contact", labelTr: "İletişim", labelEn: "Contact", href: "/#contact" },
  ],
  cta: {
    enabled: true,
    labelTr: "Giriş Yap",
    labelEn: "Log In",
    href: "/villalar",
  },
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  brand: {
    showLogo: true,
    taglineTr: "Türkiye'nin dört bir yanında seçkin kiralık villalar.",
    taglineEn: "Curated villa rentals across Türkiye.",
  },
  social: { instagram: "", facebook: "", youtube: "", x: "", whatsapp: "" },
  columns: [
    {
      id: "discover",
      type: "links",
      titleTr: "Keşfet",
      titleEn: "Discover",
      links: [],
      autoSource: "regions",
      bodyTr: "",
      bodyEn: "",
      items: [],
    },
    {
      id: "company",
      type: "links",
      titleTr: "Kurumsal",
      titleEn: "Company",
      links: [],
      autoSource: "pages",
      bodyTr: "",
      bodyEn: "",
      items: [],
    },
    {
      id: "support",
      type: "links",
      titleTr: "Destek",
      titleEn: "Support",
      links: [
        { labelTr: "+90 242 000 00 00", labelEn: "+90 242 000 00 00", href: "tel:+902420000000" },
        {
          labelTr: "info@kastayimbugunvillalari.com",
          labelEn: "info@kastayimbugunvillalari.com",
          href: "mailto:info@kastayimbugunvillalari.com",
        },
        { labelTr: "Sıkça Sorulan Sorular", labelEn: "FAQ", href: "#" },
      ],
      autoSource: null,
      bodyTr: "",
      bodyEn: "",
      items: [],
    },
  ],
  bottomTextTr: "Tüm hakları saklıdır.",
  bottomTextEn: "All rights reserved.",
};

// ————————————————————————— Resolve (normalize) —————————————————————————

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
/** Client + server'da kısa benzersiz id. */
export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function resolveHeaderConfig(raw: unknown): HeaderConfig {
  const d = DEFAULT_HEADER_CONFIG;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const tb = (r.topbar ?? {}) as Record<string, unknown>;
  const cta = (r.cta ?? {}) as Record<string, unknown>;
  const menuRaw = Array.isArray(r.menu) ? r.menu : null;

  return {
    topbar: {
      enabled: bool(tb.enabled, d.topbar.enabled),
      textTr: str(tb.textTr, d.topbar.textTr),
      textEn: str(tb.textEn, d.topbar.textEn),
      badgeTr: str(tb.badgeTr, d.topbar.badgeTr),
      badgeEn: str(tb.badgeEn, d.topbar.badgeEn),
    },
    menu: menuRaw
      ? menuRaw.map((m) => {
          const mm = (m ?? {}) as Record<string, unknown>;
          return {
            id: str(mm.id) || newId(),
            labelTr: str(mm.labelTr),
            labelEn: str(mm.labelEn) || str(mm.labelTr),
            href: str(mm.href, "/"),
          };
        })
      : d.menu,
    cta: {
      enabled: bool(cta.enabled, d.cta.enabled),
      labelTr: str(cta.labelTr, d.cta.labelTr),
      labelEn: str(cta.labelEn, d.cta.labelEn),
      href: str(cta.href, d.cta.href),
    },
  };
}

function resolveColumn(raw: unknown): FooterColumn {
  const c = (raw ?? {}) as Record<string, unknown>;
  const type: FooterColumnType =
    c.type === "text" || c.type === "images" ? c.type : "links";
  const links = Array.isArray(c.links)
    ? c.links.map((l) => {
        const ll = (l ?? {}) as Record<string, unknown>;
        return {
          labelTr: str(ll.labelTr),
          labelEn: str(ll.labelEn) || str(ll.labelTr),
          href: str(ll.href, "#"),
        };
      })
    : [];
  const items = Array.isArray(c.items)
    ? c.items
        .map((it) => {
          const ii = (it ?? {}) as Record<string, unknown>;
          return { path: str(ii.path), alt: str(ii.alt), href: str(ii.href) };
        })
        .filter((it) => it.path)
    : [];
  const autoSource =
    c.autoSource === "regions" || c.autoSource === "pages" ? c.autoSource : null;

  return {
    id: str(c.id) || newId(),
    type,
    titleTr: str(c.titleTr),
    titleEn: str(c.titleEn) || str(c.titleTr),
    links,
    autoSource,
    bodyTr: str(c.bodyTr),
    bodyEn: str(c.bodyEn),
    items,
  };
}

export function resolveFooterConfig(raw: unknown): FooterConfig {
  const d = DEFAULT_FOOTER_CONFIG;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const brand = (r.brand ?? {}) as Record<string, unknown>;
  const social = (r.social ?? {}) as Record<string, unknown>;
  const columnsRaw = Array.isArray(r.columns) ? r.columns : null;

  return {
    brand: {
      showLogo: bool(brand.showLogo, d.brand.showLogo),
      taglineTr: str(brand.taglineTr, d.brand.taglineTr),
      taglineEn: str(brand.taglineEn, d.brand.taglineEn),
    },
    social: {
      instagram: str(social.instagram),
      facebook: str(social.facebook),
      youtube: str(social.youtube),
      x: str(social.x),
      whatsapp: str(social.whatsapp),
    },
    columns: columnsRaw ? columnsRaw.map(resolveColumn) : d.columns,
    bottomTextTr: str(r.bottomTextTr, d.bottomTextTr),
    bottomTextEn: str(r.bottomTextEn, d.bottomTextEn),
  };
}

/** Boş bir footer sütunu (panelde "sütun ekle" için). */
export function emptyFooterColumn(type: FooterColumnType = "links"): FooterColumn {
  return {
    id: newId(),
    type,
    titleTr: "",
    titleEn: "",
    links: [],
    autoSource: null,
    bodyTr: "",
    bodyEn: "",
    items: [],
  };
}
