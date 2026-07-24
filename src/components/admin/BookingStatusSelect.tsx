"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateBookingStatus } from "@/lib/actions/admin/bookings";
import {
  bookingStatusLabel,
  type BookingStatus,
} from "@/lib/schemas/adminBooking";

const order: BookingStatus[] = ["new", "contacted", "confirmed", "cancelled"];

const tone: Record<BookingStatus, string> = {
  new: "bg-sun-50 text-sun-700 border-sun-200",
  contacted: "bg-sky-50 text-sky-700 border-sky-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-600 border-rose-200",
};

export default function BookingStatusSelect({
  id,
  current,
}: {
  id: string;
  current: BookingStatus;
}) {
  const [value, setValue] = useState<BookingStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onChange = (next: BookingStatus) => {
    if (next === value) return;
    const prev = value;
    setError(null);
    setValue(next); // iyimser
    start(async () => {
      const res = await updateBookingStatus({ id, status: next });
      if (!res.ok) {
        setValue(prev); // geri al
        setError(
          res.error === "conflict"
            ? "Bu tarihler zaten dolu."
            : "İşlem başarısız."
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="relative inline-flex items-center">
        <select
          value={value}
          disabled={pending}
          onChange={(e) => onChange(e.target.value as BookingStatus)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold outline-none transition disabled:opacity-60 ${tone[value]}`}
        >
          {order.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel[s]}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin text-brand-500" />
        )}
      </div>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  );
}
