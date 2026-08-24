"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateApplicationStatus } from "@/lib/actions/admin/applications";
import { useToast } from "@/components/admin/ui/Toast";
import {
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/schemas/villaApplication";

const order: ApplicationStatus[] = [
  "new",
  "contacted",
  "accepted",
  "rejected",
  "archived",
];

const tone: Record<ApplicationStatus, string> = {
  new: "bg-sun-50 text-sun-800 border-sun-200",
  contacted: "bg-sky-50 text-sky-800 border-sky-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-50 text-rose-800 border-rose-200",
  archived: "bg-sand-100 text-brand-900/70 border-sand-300",
};

/** Başvuru durum seçici — takvim yan etkisi yok, doğrudan kaydeder. */
export default function ApplicationStatusSelect({
  id,
  current,
}: {
  id: string;
  current: ApplicationStatus;
}) {
  const [value, setValue] = useState<ApplicationStatus>(current);
  const [pending, start] = useTransition();
  const toast = useToast();

  const onChange = (next: ApplicationStatus) => {
    if (next === value) return;
    const prev = value;
    setValue(next); // iyimser
    start(async () => {
      const res = await updateApplicationStatus({ id, status: next });
      if (res.ok) {
        toast.success(
          `Durum "${applicationStatusLabel[next]}" olarak kaydedildi.`
        );
      } else {
        setValue(prev);
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "İşlem başarısız."
        );
      }
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        disabled={pending}
        aria-label="Başvuru durumu"
        onChange={(e) => onChange(e.target.value as ApplicationStatus)}
        className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60 ${tone[value]}`}
      >
        {order.map((s) => (
          <option key={s} value={s}>
            {applicationStatusLabel[s]}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin text-brand-600" />
      )}
    </div>
  );
}
