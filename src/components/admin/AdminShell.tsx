import Link from "next/link";
import {
  LayoutDashboard,
  CalendarCheck,
  Home,
  MapPin,
  Tags,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/admin/auth";
import type { StaffUser } from "@/lib/auth/staff";

/**
 * Panel kabuğu: sol menü + üst bar + içerik.
 * Aktif olmayan modüller "yakında" olarak gösterilir; ilgili faz gelince linke döner.
 */

const nav = [
  { href: "/yonetim", label: "Panel", icon: LayoutDashboard, ready: true },
  { href: "/yonetim/talepler", label: "Talepler", icon: CalendarCheck, ready: true },
  { href: "/yonetim/villalar", label: "Villalar", icon: Home, ready: true },
  { href: "/yonetim/bolgeler", label: "Bölgeler", icon: MapPin, ready: true },
  { href: "/yonetim/kategoriler", label: "Kategoriler", icon: Tags, ready: true },
];

const roleLabel: Record<StaffUser["role"], string> = {
  admin: "Yönetici",
  editor: "Editör",
};

export default function AdminShell({
  staff,
  children,
}: {
  staff: StaffUser;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-sand-50">
      {/* Sol menü */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sand-200 bg-white sm:flex">
        <div className="border-b border-sand-200 px-5 py-4">
          <span className="text-sm font-extrabold text-brand-950">
            Kastayım Bugün
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-brand-900/40">
            Yönetim
          </span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) =>
            item.ready ? (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
              >
                <item.icon className="h-4 w-4 text-brand-500" />
                {item.label}
              </Link>
            ) : (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-900/35"
                title="Yakında"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto text-[10px] font-bold uppercase text-brand-900/30">
                  yakında
                </span>
              </span>
            )
          )}
        </nav>
      </aside>

      {/* İçerik */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Üst bar */}
        <header className="flex items-center justify-between border-b border-sand-200 bg-white px-4 py-3 sm:px-6">
          <div className="text-sm text-brand-900/60">
            <span className="font-semibold text-brand-950">
              {staff.fullName ?? staff.email}
            </span>
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
              {roleLabel[staff.role]}
            </span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-100"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </form>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
