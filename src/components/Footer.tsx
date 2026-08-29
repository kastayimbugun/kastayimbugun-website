"use client";

import Link from "next/link";
import Logo from "./Logo";
import { useI18n } from "@/lib/i18n";
import { imageUrl } from "@/lib/images/url";
import type { Region } from "@/lib/data/villas";
import {
  DEFAULT_FOOTER_CONFIG,
  type FooterConfig,
  type FooterColumn,
} from "@/lib/headerFooter";

/** Sosyal medya ikon path'leri (24x24, currentColor). */
const SOCIAL_PATHS: Record<string, string> = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .4 1.4.9.5.4.7.8.9 1.4.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.4 1-.9 1.4-.4.5-.8.7-1.4.9-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.4-1.4-.9-.5-.4-.7-.8-.9-1.4-.1-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.4-1 .9-1.4.4-.5.8-.7 1.4-.9.4-.1 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z",
  facebook:
    "M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5v1.8h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12Z",
  youtube:
    "M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.5 31 31 0 0 0-.5-4.5ZM9.8 15.3V8.7l5.7 3.3Z",
  x: "M18.2 2h3.3l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2l7.7-8.8L1.7 2h6.8l4.7 6.2L18.2 2Zm-1.2 18h1.8L7.1 3.9H5.2L17 20Z",
  whatsapp:
    "M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.1-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.7 1.1 1.4 1.7.9.8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.9.9c.2.1.4.2.5.3.1.2.1.6-.1 1.1Z",
};

export interface FooterPageLink {
  slug: string;
  titleTr: string;
  titleEn: string;
}

export default function Footer({
  regions,
  footerPages = [],
  config = DEFAULT_FOOTER_CONFIG,
}: {
  regions: Region[];
  footerPages?: FooterPageLink[];
  config?: FooterConfig;
}) {
  const { lang } = useI18n();
  const tr = lang !== "en";

  const socials = (
    ["instagram", "facebook", "youtube", "x", "whatsapp"] as const
  )
    .map((key) => ({ key, url: config.social[key] }))
    .filter((s) => s.url);

  const linkCls = "text-brand-900/60 hover:text-sun-600 transition";

  const renderColumn = (col: FooterColumn) => {
    const title = tr ? col.titleTr : col.titleEn;

    if (col.type === "text") {
      const body = tr ? col.bodyTr : col.bodyEn;
      return (
        <>
          {title && (
            <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
              {title}
            </h4>
          )}
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-brand-900/60">
            {body}
          </p>
        </>
      );
    }

    if (col.type === "images") {
      return (
        <>
          {title && (
            <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
              {title}
            </h4>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {col.items.map((it, i) => {
              const src = imageUrl(it.path);
              if (!src) return null;
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={it.alt || title || "logo"}
                  className="h-10 w-auto object-contain"
                />
              );
              return it.href ? (
                <a key={i} href={it.href} target="_blank" rel="noreferrer">
                  {img}
                </a>
              ) : (
                <span key={i}>{img}</span>
              );
            })}
          </div>
        </>
      );
    }

    // links — autoSource varsa hazır kaynaktan, yoksa elle girilenler
    let links: { label: string; href: string }[];
    if (col.autoSource === "regions") {
      // regionSlugs null ⇒ tüm bölgeler; dizi ⇒ yalnızca seçilenler (bölge sırası korunur).
      const picked =
        col.regionSlugs == null
          ? regions
          : regions.filter((r) => col.regionSlugs!.includes(r.slug));
      links = picked.map((r) => {
        const href = r.parentSlug
          ? `/villalar/${r.parentSlug}/${r.slug}`
          : `/villalar/${r.slug}`;
        return {
          label: r.parentName ? `${r.name}, ${r.parentName}` : r.name,
          href,
        };
      });
    } else if (col.autoSource === "pages") {
      links = footerPages.map((p) => ({
        label: tr ? p.titleTr : p.titleEn,
        href: `/sayfa/${p.slug}`,
      }));
    } else {
      links = col.links.map((l) => ({
        label: tr ? l.labelTr : l.labelEn,
        href: l.href,
      }));
    }

    return (
      <>
        {title && (
          <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
            {title}
          </h4>
        )}
        <ul className="mt-4 space-y-2.5 text-sm">
          {links.map((l, i) => (
            <li key={i}>
              {l.href.startsWith("/") ? (
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              ) : (
                <a href={l.href} className={linkCls}>
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <footer
      id="contact"
      className="mt-12 border-t border-sand-200 bg-sand-50 text-brand-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {/* Marka bloğu */}
          <div>
            {config.brand.showLogo && <Logo variant="dark" />}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-900/60">
              {tr ? config.brand.taglineTr : config.brand.taglineEn}
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-white p-2.5 text-brand-700 shadow-sm ring-1 ring-sand-200 transition hover:bg-sun-500 hover:text-white"
                    aria-label={s.key}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d={SOCIAL_PATHS[s.key]} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {config.columns.map((col) => (
            <div key={col.id}>{renderColumn(col)}</div>
          ))}
        </div>

        <div className="mt-12 border-t border-sand-200 pt-6 text-center text-xs text-brand-900/50">
          © {new Date().getFullYear()} Kastayım Bugün Villaları.{" "}
          {tr ? config.bottomTextTr : config.bottomTextEn}
        </div>
      </div>
    </footer>
  );
}
