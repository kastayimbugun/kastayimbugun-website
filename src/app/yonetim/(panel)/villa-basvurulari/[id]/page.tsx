import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import {
  getApplication,
  getAllQuestions,
} from "@/lib/data/admin/applications";
import { applicationStatusLabel } from "@/lib/schemas/villaApplication";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";
import StatusBadge, { type BadgeTone } from "@/components/admin/ui/StatusBadge";
import { Section } from "@/components/admin/ui/FormField";
import ApplicationStatusSelect from "@/components/admin/ApplicationStatusSelect";
import ApplicationActions from "@/components/admin/ApplicationActions";
import { formatDateTime } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/schemas/villaApplication";
import type { ApplicationQuestion } from "@/lib/data/applicationQuestions";

export const dynamic = "force-dynamic";

const statusTone: Record<ApplicationStatus, BadgeTone> = {
  new: "warning",
  contacted: "info",
  accepted: "success",
  rejected: "danger",
  archived: "neutral",
};

/** Bir cevabı, soru tanımına göre gösterime hazır metne çevirir. */
function formatAnswer(
  q: ApplicationQuestion | undefined,
  value: string | number | boolean
): string {
  if (typeof value === "boolean") return value ? "Evet" : "Hayır";
  if (q?.type === "select") {
    const opt = q.options.find((o) => o.value === String(value));
    return opt ? opt.labelTr : String(value);
  }
  return String(value);
}

function waHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("90")
    ? d
    : d.startsWith("0")
      ? `90${d.slice(1)}`
      : d.length === 10
        ? `90${d}`
        : d;
  return `https://wa.me/${intl}`;
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [app, questions] = await Promise.all([
    getApplication(id),
    getAllQuestions(),
  ]);
  if (!app) notFound();

  const byKey = new Map(questions.map((q) => [q.qkey, q]));

  // Cevaplar: önce tanımlı soru sırasına göre, sonra tanımı silinmiş "yetim"
  // cevaplar (geçmiş korunur).
  const orderedKeys = [
    ...questions.map((q) => q.qkey).filter((k) => k in app.answers),
    ...Object.keys(app.answers).filter((k) => !byKey.has(k)),
  ];
  const answerRows = orderedKeys.map((k) => {
    const q = byKey.get(k);
    return {
      label: q ? q.labelTr : k,
      value: formatAnswer(q, app.answers[k]),
    };
  });

  return (
    <div className="space-y-5">
      <BackLink href="/yonetim/villa-basvurulari">
        Villa Başvuruları
      </BackLink>

      <PageHeader
        title={app.villaName}
        description={`Başvuru tarihi: ${formatDateTime(app.createdAt)}`}
        badge={
          <StatusBadge tone={statusTone[app.status]}>
            {applicationStatusLabel[app.status]}
          </StatusBadge>
        }
        actions={<ApplicationStatusSelect id={app.id} current={app.status} />}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* İletişim */}
          <Section title="İletişim">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Ad Soyad" value={app.ownerName} />
              <Info label="Telefon" value={app.phone} />
              <Info label="E-posta" value={app.email ?? "—"} />
              <Info label="Konum" value={app.location} />
              {app.address && (
                <div className="sm:col-span-2">
                  <Info label="Açık adres" value={app.address} />
                </div>
              )}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`tel:${app.phone.replace(/\s/g, "")}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
              >
                <Phone className="h-4 w-4" />
                Ara
              </a>
              <a
                href={waHref(app.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
              {app.email && (
                <a
                  href={`mailto:${app.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sand-100 px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-200"
                >
                  <Mail className="h-4 w-4" />
                  E-posta
                </a>
              )}
            </div>
          </Section>

          {/* Villa özellikleri */}
          {answerRows.length > 0 && (
            <Section title="Villa Özellikleri">
              <dl className="grid gap-3 sm:grid-cols-2">
                {answerRows.map((row) => (
                  <Info key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </Section>
          )}

          {/* Açıklama */}
          {app.description && (
            <Section title="Açıklama">
              <p className="whitespace-pre-line text-sm leading-relaxed text-brand-900/80">
                {app.description}
              </p>
            </Section>
          )}

          {/* Fotoğraflar */}
          {app.photoUrls.length > 0 && (
            <Section title={`Fotoğraflar (${app.photoUrls.length})`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {app.photoUrls.map((url, i) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square overflow-hidden rounded-xl border border-sand-200 bg-sand-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Fotoğraf ${i + 1}`}
                      className="h-full w-full object-cover transition hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Yan panel: not + işlemler */}
        <div className="lg:col-span-1">
          <Section title="Yönetim">
            <ApplicationActions
              id={app.id}
              villaName={app.villaName}
              initialNote={app.adminNote}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-brand-900/60">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 text-sm font-medium text-brand-950">
        {label === "Konum" && <MapPin className="h-3.5 w-3.5 text-brand-900/40" />}
        {value}
      </dd>
    </div>
  );
}
