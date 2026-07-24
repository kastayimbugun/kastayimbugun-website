"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import Logo from "./Logo";
import { useI18n } from "@/lib/i18n";
import { regions } from "@/lib/villas";

const socials = [
  {
    label: "Instagram",
    path: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .4 1.4.9.5.4.7.8.9 1.4.1.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.4 1-.9 1.4-.4.5-.8.7-1.4.9-.4.1-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.4-1.4-.9-.5-.4-.7-.8-.9-1.4-.1-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.4-1 .9-1.4.4-.5.8-.7 1.4-.9.4-.1 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.8-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z",
  },
  {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5v1.8h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12Z",
  },
  {
    label: "YouTube",
    path: "M23 7.5a3 3 0 0 0-2.1-2.1C19 4.9 12 4.9 12 4.9s-7 0-8.9.5A3 3 0 0 0 1 7.5 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.5 31 31 0 0 0-.5-4.5ZM9.8 15.3V8.7l5.7 3.3Z",
  },
];

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer
      id="contact"
      className="mt-12 border-t border-sand-200 bg-sand-50 text-brand-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-900/60">
              {t("footer.tagline")}
            </p>
            <div className="mt-5 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  className="rounded-full bg-white p-2.5 text-brand-700 shadow-sm ring-1 ring-sand-200 transition hover:bg-sun-500 hover:text-white"
                  aria-label={s.label}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
              {t("footer.discover")}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {regions.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/villalar?region=${encodeURIComponent(r.name)}`}
                    className="text-brand-900/60 hover:text-sun-600 transition"
                  >
                    {r.name}, {r.province}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
              {t("footer.company")}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                t("nav.about"),
                t("nav.listProperty"),
                t("footer.terms"),
                t("footer.privacy"),
              ].map((l) => (
                <li key={l}>
                  <a href="#" className="text-brand-900/60 hover:text-sun-600 transition">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-brand-950">
              {t("footer.support")}
            </h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a
                  href="tel:+902420000000"
                  className="inline-flex items-center gap-2 text-brand-900/60 hover:text-sun-600 transition"
                >
                  <Phone className="h-4 w-4" /> +90 242 000 00 00
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@kastayimbugunvillalari.com"
                  className="inline-flex items-center gap-2 text-brand-900/60 hover:text-sun-600 transition"
                >
                  <Mail className="h-4 w-4" /> info@kastayimbugunvillalari.com
                </a>
              </li>
              <li>
                <a href="#" className="text-brand-900/60 hover:text-sun-600 transition">
                  {t("footer.faq")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-sand-200 pt-6 text-center text-xs text-brand-900/50">
          © {new Date().getFullYear()} Kastayım Bugün Villaları. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
