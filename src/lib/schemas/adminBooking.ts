import { z } from "zod";

// Talep durumu geçişleri için şema (panel).
export const bookingStatusSchema = z.enum([
  "new",
  "contacted",
  "confirmed",
  "cancelled",
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const updateBookingStatusSchema = z.object({
  id: z.uuid(),
  status: bookingStatusSchema,
});

// Kullanıcıya görünen Türkçe etiketler (panel tek dilli).
export const bookingStatusLabel: Record<BookingStatus, string> = {
  new: "Yeni",
  contacted: "Görüşüldü",
  confirmed: "Onaylandı",
  cancelled: "İptal",
};
