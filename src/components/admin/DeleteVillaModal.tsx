"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, CheckCircle2, ShieldAlert, Loader2, ArrowRight, X } from "lucide-react";
import { getVillaDeleteStatus, deleteVillaCascade, type VillaDeleteStatus } from "@/lib/actions/admin/villas";
import { useToast } from "@/components/admin/ui/Toast";

export default function DeleteVillaModal({
  villaId,
  villaName,
  isOpen,
  onClose,
}: {
  villaId: string;
  villaName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<VillaDeleteStatus | null>(null);
  
  // Kullanıcı seçenekleri
  const [cancelBookingsOption, setCancelBookingsOption] = useState<"cancel_auto" | "review_manual">("cancel_auto");
  const [confirmNameInput, setConfirmNameInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Modal açıldığında durumu sorgula
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmNameInput("");
      setLoading(true);
      getVillaDeleteStatus(villaId).then((res) => {
        setStatus(res);
        setLoading(false);
      });
    }
  }, [isOpen, villaId]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setDeleting(true);
    const res = await deleteVillaCascade(villaId, {
      cancelActiveBookings: cancelBookingsOption === "cancel_auto",
    });

    if (res.ok) {
      toast.success("Villa ve bağlı verileri başarıyla silindi.");
      onClose();
      router.push("/yonetim/villalar");
      router.refresh();
    } else {
      setDeleting(false);
      if (res.error === "has_active_bookings") {
        toast.error(`Aktif rezervasyonlar var (${res.activeCount} adet). İptal seçeneğini onaylayın.`);
        setStep(1);
      } else {
        toast.error("Villa silinirken bir hata oluştu.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-sand-200">
        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          disabled={deleting}
          className="absolute right-4 top-4 rounded-full p-1.5 text-sand-400 hover:bg-sand-100 hover:text-sand-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Adım Göstergesi (Stepper) */}
        <div className="mb-6 flex items-center justify-between border-b border-sand-200 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-sm">
              {step}/3
            </span>
            <div>
              <h3 className="font-bold text-brand-950 text-base">Villayı Kalıcı Olarak Sil</h3>
              <p className="text-xs text-brand-900/60">{villaName}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sand-500">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 mb-2" />
            <p className="text-sm font-medium">Villa durumu kontrol ediliyor…</p>
          </div>
        ) : (
          <>
            {/* AŞAMA 1: Rezervasyon & Veri Durum Kontrolü */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-sand-50 p-4 border border-sand-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-900/70 font-medium">Görsel Sayısı:</span>
                    <span className="font-bold text-brand-950">{status?.imageCount ?? 0} adet</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-900/70 font-medium">Aktif/Bekleyen Rezervasyon:</span>
                    <span className={`font-bold ${(status?.activeBookingsCount ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      {status?.activeBookingsCount ?? 0} adet
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-900/70 font-medium">İptal Edilen Rezervasyon:</span>
                    <span className="font-bold text-sand-600">{status?.cancelledBookingsCount ?? 0} adet</span>
                  </div>
                </div>

                {/* Aktif Rezervasyon Uyarısı */}
                {(status?.activeBookingsCount ?? 0) > 0 ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-950 text-sm">Dikkat: Aktif Rezervasyonlar Var!</h4>
                        <p className="text-amber-900/80 mt-1">
                          Bu villaya ait <strong>{status?.activeBookingsCount} adet aktif veya bekleyen rezervasyon</strong> bulunuyor.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-amber-200/60">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cancelOption"
                          checked={cancelBookingsOption === "cancel_auto"}
                          onChange={() => setCancelBookingsOption("cancel_auto")}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-amber-950 font-medium">
                          Aktif rezervasyonları otomatik <strong>"İptal Edildi"</strong> durumuna al ve silmeye devam et.
                        </span>
                      </label>

                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cancelOption"
                          checked={cancelBookingsOption === "review_manual"}
                          onChange={() => setCancelBookingsOption("review_manual")}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-amber-950 font-medium">
                          Önce Talepler sayfasına gidip elle kapatmak istiyorum.
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>Bu villaya ait açık/aktif rezervasyon bulunmuyor. Güvenle ilerleyebilirsiniz.</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-sand-200">
                  <button
                    onClick={onClose}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-sand-700 bg-sand-100 hover:bg-sand-200 transition"
                  >
                    Vazgeç
                  </button>
                  {cancelBookingsOption === "review_manual" && (status?.activeBookingsCount ?? 0) > 0 ? (
                    <button
                      onClick={() => {
                        onClose();
                        router.push("/yonetim/talepler");
                      }}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 transition"
                    >
                      Talepler Sayfasına Git
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
                    >
                      Aşama 2: Veri Onayına Geç <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* AŞAMA 2: Veri Saklama & Temizlik Bilgisi */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs space-y-2 text-rose-950">
                  <h4 className="font-bold text-sm text-rose-900 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    Silinecek ve Saklanacak Veriler:
                  </h4>
                  <ul className="list-disc list-inside space-y-1.5 text-rose-900/90">
                    <li><strong>Fotoğraflar:</strong> Yüklü {status?.imageCount} adet görsel sunucudan kalıcı olarak silinecek.</li>
                    <li><strong>Fiyatlar & Takvim:</strong> Sezon fiyatları ve kapalı tarihler silinecek.</li>
                    <li>
                      <strong>Rezervasyonlar (Önemli):</strong> İptal edilmiş tüm rezervasyonlar <strong>silinmeyecek</strong>;
                      muhasebe ve rezervasyon geçmişiniz için "İptal Edilen Rezervasyonlar" alanında saklanacaktır.
                    </li>
                  </ul>
                </div>

                <div className="flex justify-between gap-2 pt-3 border-t border-sand-200">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-sand-700 bg-sand-100 hover:bg-sand-200 transition"
                  >
                    Geri
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition"
                  >
                    Aşama 3: Son İsim Teyidine Geç <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* AŞAMA 3: İsim Yazarak Kalıcı Silme Teyidi */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-rose-100/80 border border-rose-300 p-4 text-xs space-y-2 text-rose-950">
                  <p className="font-bold text-sm text-rose-950">
                    Kalıcı Silme Onayı
                  </p>
                  <p>
                    Bu işlem geri alınamaz! Villayı ve tüm görsellerini silmek üzeresiniz.
                  </p>
                  <p className="pt-2 font-medium">
                    Onaylamak için lütfen kutuya villanın adını yazın: <strong className="text-rose-900 font-bold select-all bg-white/80 px-1.5 py-0.5 rounded border border-rose-300">{villaName}</strong>
                  </p>
                </div>

                <input
                  type="text"
                  value={confirmNameInput}
                  onChange={(e) => setConfirmNameInput(e.target.value)}
                  placeholder={villaName}
                  className="w-full rounded-xl border border-rose-300 p-3 text-sm font-bold text-brand-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                />

                <div className="flex justify-between gap-2 pt-3 border-t border-sand-200">
                  <button
                    onClick={() => setStep(2)}
                    disabled={deleting}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-sand-700 bg-sand-100 hover:bg-sand-200 transition disabled:opacity-50"
                  >
                    Geri
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmNameInput.trim() !== villaName || deleting}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Siliniyor…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Villayı Kalıcı Olarak Sil
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
