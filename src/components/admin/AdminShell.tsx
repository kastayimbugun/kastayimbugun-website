"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  CalendarCheck,
  CalendarRange,
  Home,
  MapPin,
  Tags,
  Settings,
  FileText,
  Users,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/admin/auth";
import { ToastProvider } from "@/components/admin/ui/Toast";
import { ConfirmProvider } from "@/components/admin/ui/ConfirmDialog";
import { can, type ModuleKey } from "@/lib/auth/permissions";
import type { StaffUser } from "@/lib/auth/staff";

/**
 * Panel kabuğu: sol menü + üst bar + içerik.
 *
 * İstemci bileşenidir çünkü (a) aktif sayfa vurgusu `usePathname` ister,
 * (b) mobil menü açık/kapalı durumu tutar. `children` sunucudan prop olarak
 * geçtiği için sayfa içerikleri sunucuda render edilmeye devam eder.
 *
 * Toast ve onay diyaloğu sağlayıcıları burada — tüm panel ekranları erişir
 * (docs/panel-kurallari.md §4).
 */

/**
 * `perm`: bu öğeyi görmek için gereken modül izni. Yok → her personele açık
 * (Panel). "admin" → yalnızca admin (Personel). Diğerleri izin bazlı filtrelenir.
 */
type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: ModuleKey | "admin";
};

const nav: NavItem[] = [
  { href: "/yonetim", label: "Panel", icon: LayoutDashboard },
  { href: "/yonetim/talepler", label: "Talepler", icon: Inbox, perm: "reservations" },
  { href: "/yonetim/rezervasyonlar", label: "Rezervasyonlar", icon: CalendarCheck, perm: "reservations" },
  { href: "/yonetim/takvim", label: "Takvim", icon: CalendarRange, perm: "villas" },
  { href: "/yonetim/villalar", label: "Villalar", icon: Home, perm: "villas" },
  { href: "/yonetim/sayfalar", label: "Sayfalar", icon: FileText, perm: "pages" },
  { href: "/yonetim/bolgeler", label: "Bölgeler", icon: MapPin, perm: "regions" },
  { href: "/yonetim/kategoriler", label: "Kategoriler", icon: Tags, perm: "categories" },
  { href: "/yonetim/villa-basvurulari", label: "Villa Başvuruları", icon: ClipboardList, perm: "applications" },
  { href: "/yonetim/personel", label: "Personel", icon: Users, perm: "admin" },
  { href: "/yonetim/ayarlar", label: "Site ayarları", icon: Settings, perm: "settings" },
];

/** Personelin görebileceği nav öğeleri (izin/rol filtresi). */
function visibleNav(staff: StaffUser): NavItem[] {
  return nav.filter((item) => {
    if (!item.perm) return true; // Panel — herkese açık
    if (item.perm === "admin") return staff.role === "admin";
    return can(staff, item.perm);
  });
}

const roleLabel: Record<StaffUser["role"], string> = {
  admin: "Yönetici",
  editor: "Editör",
};

/** "/yonetim" yalnızca tam eşleşmede aktif; diğerleri alt yollarını da kapsar. */
function isActive(pathname: string, href: string) {
  if (href === "/yonetim") return pathname === "/yonetim";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  staff,
  pathname,
  onNavigate,
}: {
  staff: StaffUser;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-1 p-3">
      {visibleNav(staff).map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-300 ${
              active
                ? "bg-brand-50 text-brand-800"
                : "text-brand-900 hover:bg-sand-100"
            }`}
          >
            <item.icon
              className={`h-4 w-4 ${active ? "text-brand-600" : "text-brand-900/60"}`}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="border-b border-sand-200 px-5 py-4">
      <span className="text-sm font-extrabold text-brand-950">
        Kastayım Bugün
      </span>
      <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-900/70">
        Yönetim
      </span>
    </div>
  );
}

export default function AdminShell({
  staff,
  children,
}: {
  staff: StaffUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Çekmecenin açık olduğu yol tutulur; adres değişince (menüden tıklama,
  // tarayıcı geri tuşu) karşılaştırma tutmaz ve çekmece kendiliğinden kapanır.
  // Böylece pathname'i dinleyen bir efekte gerek kalmaz.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const menuOpen = openedAt === pathname;

  // Çekmece açıkken arka plan kaymasın.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex min-h-screen bg-sand-50 print:block print:bg-white">
          {/* Sol menü — masaüstü. print:hidden: konfirmasyon gibi yazdırılan
              sayfalarda gezinme çıktıya karışmasın. */}
          <aside className="hidden w-60 shrink-0 flex-col border-r border-sand-200 bg-white sm:flex print:hidden">
            <Brand />
            <NavLinks staff={staff} pathname={pathname} />
          </aside>

          {/* Sol menü — mobil çekmece */}
          {menuOpen && (
            <div className="fixed inset-0 z-50 sm:hidden">
              <button
                type="button"
                aria-label="Menüyü kapat"
                onClick={() => setOpenedAt(null)}
                className="absolute inset-0 bg-brand-950/40"
              />
              <div className="relative flex h-full w-64 max-w-[80vw] flex-col bg-white shadow-xl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Brand />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenedAt(null)}
                    aria-label="Menüyü kapat"
                    className="m-3 rounded-lg p-1.5 text-brand-800 transition hover:bg-sand-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <NavLinks
                  staff={staff}
                  pathname={pathname}
                  onNavigate={() => setOpenedAt(null)}
                />
              </div>
            </div>
          )}

          {/* İçerik */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-2 border-b border-sand-200 bg-white px-3 py-3 sm:px-6 print:hidden">
              <button
                type="button"
                onClick={() => setOpenedAt(pathname)}
                aria-label="Menüyü aç"
                aria-expanded={menuOpen}
                className="rounded-lg p-2 text-brand-800 transition hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-brand-300 sm:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold text-brand-950">
                  {staff.fullName ?? staff.email}
                </span>
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                  {roleLabel[staff.role]}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Siteye git</span>
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Çıkış</span>
                  </button>
                </form>
              </div>
            </header>

            <main className="flex-1 p-4 sm:p-6 print:p-0">{children}</main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
