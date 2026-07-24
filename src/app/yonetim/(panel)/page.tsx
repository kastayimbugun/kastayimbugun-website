import { CalendarCheck, Home, CheckCircle2 } from "lucide-react";
import { getDashboardStats } from "@/lib/data/admin/stats";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    {
      label: "Yeni talep",
      value: stats.newRequests,
      icon: CalendarCheck,
      tone: "text-sun-600 bg-sun-50",
    },
    {
      label: "Toplam villa",
      value: stats.villasTotal,
      icon: Home,
      tone: "text-brand-600 bg-brand-50",
    },
    {
      label: "Yayında villa",
      value: stats.villasPublished,
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-950">Panel</h1>
      <p className="mt-1 text-sm text-brand-900/55">Özet</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}
            >
              <c.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-extrabold text-brand-950">
              {c.value}
            </div>
            <div className="text-sm text-brand-900/55">{c.label}</div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-brand-900/45">
        Talep, villa, bölge ve kategori yönetimi sonraki adımlarda eklenecek.
      </p>
    </div>
  );
}
