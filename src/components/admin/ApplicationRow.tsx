"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  ImageIcon,
  Pencil,
  Archive,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  archiveApplication,
  deleteApplication,
} from "@/lib/actions/admin/applications";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import ApplicationStatusSelect from "@/components/admin/ApplicationStatusSelect";
import { formatDateTime } from "@/lib/format";
import type { AdminApplication } from "@/lib/data/admin/applications";

/** Telefonu wa.me biçimine çevirir (TR varsayımı). */
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

export default function ApplicationRow({
  application: r,
}: {
  application: AdminApplication;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [pendingDelete, startDelete] = useTransition();

  const onArchive = async () => {
    const ok = await confirm({
      title: "Başvuru arşivlensin mi?",
      body: (
        <p className="text-sm text-brand-900/80">
          <strong className="text-brand-950">{r.villaName}</strong> başvurusu
          listeden kaldırılacak. Kayıt ve fotoğraflar korunur; “Arşiv”
          filtresinden erişebilirsiniz.
        </p>
      ),
      confirmLabel: "Arşivle",
      cancelLabel: "Vazgeç",
      tone: "default",
    });
    if (!ok) return;

    start(async () => {
      const res = await archiveApplication({ id: r.id });
      if (res.ok) {
        toast.success("Başvuru arşivlendi.");
        router.refresh();
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "İşlem başarısız."
        );
      }
    });
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Başvuru kalıcı olarak silinsin mi?",
      body: (
        <div className="space-y-1.5 text-sm text-brand-900/80">
          <p>
            <strong className="text-brand-950">{r.villaName}</strong> başvurusu
            ve tüm fotoğrafları kalıcı olarak silinecek.
          </p>
          <p className="text-xs font-semibold text-rose-700">
            Bu işlem geri alınamaz. Kaydı saklamak istiyorsanız “Arşivle”yi
            kullanın.
          </p>
        </div>
      ),
      confirmLabel: "Evet, kalıcı sil",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;

    startDelete(async () => {
      const res = await deleteApplication({ id: r.id });
      if (res.ok) {
        toast.success("Başvuru silindi.");
        router.refresh();
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Silme işlemi başarısız oldu."
        );
      }
    });
  };

  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[auto_1.4fr_1.3fr_1fr_auto] lg:items-start lg:gap-4">
      {/* Kapak */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-sand-200 bg-sand-50">
        {r.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-brand-900/30">
            <ImageIcon className="h-5 w-5" />
          </span>
        )}
      </div>

      {/* Villa + konum */}
      <div className="min-w-0">
        <Link
          href={`/yonetim/villa-basvurulari/${r.id}`}
          className="font-semibold text-brand-900 hover:text-brand-700 hover:underline"
        >
          {r.villaName}
        </Link>
        <div className="mt-0.5 flex items-center gap-1 text-sm text-brand-900/70">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{r.location}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Link
            href={`/yonetim/villa-basvurulari/${r.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Detay
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-brand-900/60">
            <ImageIcon className="h-3 w-3" />
            {r.photoCount} fotoğraf
          </span>
          <button
            type="button"
            onClick={onArchive}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900/60 hover:text-brand-800 hover:underline disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Archive className="h-3 w-3" />
            )}
            Arşivle
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pendingDelete}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline disabled:opacity-50"
          >
            {pendingDelete ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Sil
          </button>
        </div>
      </div>

      {/* İletişim */}
      <div className="text-sm">
        <div className="font-semibold text-brand-900">{r.ownerName}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <a
            href={`tel:${r.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800 transition hover:bg-brand-100"
          >
            <Phone className="h-3 w-3" />
            Ara
          </a>
          <a
            href={waHref(r.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        </div>
        <div className="mt-1 text-xs text-brand-900/70">{r.phone}</div>
        {r.email && (
          <a
            href={`mailto:${r.email}`}
            className="mt-0.5 flex items-center gap-1 text-xs text-brand-900/70 hover:underline"
          >
            <Mail className="h-3 w-3" />
            {r.email}
          </a>
        )}
      </div>

      {/* Tarih */}
      <div className="text-sm text-brand-900/70">
        {formatDateTime(r.createdAt)}
      </div>

      {/* Durum */}
      <div className="lg:justify-self-end">
        <ApplicationStatusSelect id={r.id} current={r.status} />
      </div>
    </li>
  );
}
