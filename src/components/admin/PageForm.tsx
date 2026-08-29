"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPageAction, updatePageAction } from "@/lib/actions/admin/pages";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CustomPage } from "@/lib/types";
import { Save, ArrowLeft, Globe, Search, FileText } from "lucide-react";
import Link from "next/link";

interface PageFormProps {
  initialData?: CustomPage;
}

export function PageForm({ initialData }: PageFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);

  const [activeTab, setActiveTab] = useState<"tr" | "en" | "seo">("tr");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    slug: initialData?.slug || "",
    titleTr: initialData?.titleTr || "",
    titleEn: initialData?.titleEn || "",
    contentTr: initialData?.contentTr || "",
    contentEn: initialData?.contentEn || "",
    metaTitleTr: initialData?.metaTitleTr || "",
    metaTitleEn: initialData?.metaTitleEn || "",
    metaDescriptionTr: initialData?.metaDescriptionTr || "",
    metaDescriptionEn: initialData?.metaDescriptionEn || "",
    status: initialData?.status || ("draft" as "draft" | "published"),
    showInFooter: initialData?.showInFooter ?? true,
    sortOrder: initialData?.sortOrder ?? 0,
  });

  // Automatically generate slug from titleTr if creating new page
  const handleTitleTrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, titleTr: val };
      if (!isEdit && (!prev.slug || prev.slug === slugify(prev.titleTr))) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  function slugify(text: string) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }

  // Doğrulama hatası hangi sekmedeyse oraya geç ki kullanıcı hatayı görebilsin.
  const focusErrorTab = (fields: Record<string, string>) => {
    if (fields.titleEn || fields.contentEn) setActiveTab("en");
    else if (fields.metaTitleTr || fields.metaTitleEn || fields.metaDescriptionTr || fields.metaDescriptionEn)
      setActiveTab("seo");
    else setActiveTab("tr");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setFieldErrors({});

    try {
      const res = isEdit && initialData
        ? await updatePageAction(initialData.id, form)
        : await createPageAction(form);

      if (res.ok) {
        router.push("/yonetim/sayfalar");
        router.refresh();
      } else if (res.error === "auth") {
        setErrorMsg("Oturumunuz sona ermiş görünüyor. Lütfen yeniden giriş yapın.");
      } else if (res.error === "validation" && res.fields) {
        setFieldErrors(res.fields);
        focusErrorTab(res.fields);
        setErrorMsg("Bazı alanlar eksik veya hatalı — işaretli yerlere bakın.");
      } else if (res.error === "slug") {
        const fields = res.fields || {
          slug: "Bu URL uzantısı (slug) zaten kullanılıyor.",
        };
        setFieldErrors(fields);
        focusErrorTab(fields);
        setErrorMsg("Bu URL uzantısı (slug) başka bir sayfada kullanılıyor.");
      } else {
        setErrorMsg("Sayfa kaydedilirken bilinmeyen bir hata oluştu.");
      }
    } catch {
      setErrorMsg("Bağlantı hatası oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {/* Üst Çubuk */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/yonetim/sayfalar"
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {isEdit ? `Sayfa Düzenle: ${initialData?.titleTr}` : "Yeni Sayfa Ekle"}
            </h1>
            <p className="text-xs text-gray-500">
              Yasal metinleri ve özel sayfaları buradan düzenleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/yonetim/sayfalar"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {errorMsg}
        </div>
      )}

      {/* Temel Ayarlar Kartı */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b pb-3">
          <FileText className="w-4 h-4 text-emerald-600" />
          Sayfa Yapılandırması & Bağlantı
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slug (URL Bağlantısı) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              URL Uzantısı (Slug) <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-xs font-mono">
                /sayfa/
              </span>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().trim() })}
                placeholder="kvkk-aydinlatma-metni"
                className="flex-1 min-w-0 block w-full px-3 py-2 text-sm border border-gray-300 rounded-r-md focus:ring-emerald-500 focus:border-emerald-500 font-mono text-emerald-800"
              />
            </div>
            {fieldErrors.slug && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.slug}</p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              Sadece küçük harf, rakam ve tire kullanın (ör: <code>gizlilik-politikasi</code>).
            </p>
          </div>

          {/* Durum & Footer Ayarları */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Yayın Durumu</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="draft">Taslak (Gizli)</option>
                <option value="published">Yayınlandı (Açık)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={form.showInFooter}
                  onChange={(e) => setForm({ ...form, showInFooter: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs font-medium text-gray-700">Footer'da Göster</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dil & İçerik Sekmeleri */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Sekme Butonları */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("tr")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "tr"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            🇹🇷 Türkçe İçerik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("en")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "en"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            🇬🇧 İngilizce İçerik (English)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seo")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === "seo"
                ? "border-emerald-600 text-emerald-700 bg-white rounded-t-lg"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Search className="w-4 h-4 text-emerald-600" />
            SEO ve Meta Verileri
          </button>
        </div>

        {/* Sekme İçerikleri */}
        <div className="p-6">
          {/* Türkçe Sekmesi */}
          {activeTab === "tr" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Türkçe Sayfa Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.titleTr}
                  onChange={handleTitleTrChange}
                  placeholder="KVKK Aydınlatma Metni"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
                {fieldErrors.titleTr && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.titleTr}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Türkçe İçerik (WordPress Tarzı Editör)
                </label>
                <RichTextEditor
                  value={form.contentTr}
                  onChange={(val) => setForm({ ...form, contentTr: val })}
                  placeholder="Sayfa içeriğinizi yazın..."
                />
              </div>
            </div>
          )}

          {/* İngilizce Sekmesi */}
          {activeTab === "en" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  İngilizce Sayfa Başlığı (English Title)
                  <span className="ml-1 font-normal text-gray-400">(isteğe bağlı)</span>
                </label>
                <input
                  type="text"
                  value={form.titleEn}
                  onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                  placeholder="Privacy & Data Protection Policy"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Boş bırakılırsa Türkçe başlık kullanılır.
                </p>
                {fieldErrors.titleEn && (
                  <p className="text-xs text-red-600 mt-1">{fieldErrors.titleEn}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  İngilizce İçerik (English Content)
                </label>
                <RichTextEditor
                  value={form.contentEn}
                  onChange={(val) => setForm({ ...form, contentEn: val })}
                  placeholder="Write english page content..."
                />
              </div>
            </div>
          )}

          {/* SEO Sekmesi */}
          {activeTab === "seo" && (
            <div className="space-y-4 max-w-3xl">
              <h3 className="text-sm font-semibold text-gray-800 border-b pb-2">
                Arama Motorı (Google) Optimizasyonu
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meta Başlık (TR)
                  </label>
                  <input
                    type="text"
                    value={form.metaTitleTr}
                    onChange={(e) => setForm({ ...form, metaTitleTr: e.target.value })}
                    placeholder="KVKK Aydınlatma Metni | Kastayım Bugün"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meta Title (EN)
                  </label>
                  <input
                    type="text"
                    value={form.metaTitleEn}
                    onChange={(e) => setForm({ ...form, metaTitleEn: e.target.value })}
                    placeholder="Privacy Policy | Kastayım Bugün"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meta Açıklama (TR)
                  </label>
                  <textarea
                    rows={3}
                    value={form.metaDescriptionTr}
                    onChange={(e) => setForm({ ...form, metaDescriptionTr: e.target.value })}
                    placeholder="Kastayım Bugün kişisel verilerin korunması ve KVKK aydınlatma metni."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Meta Description (EN)
                  </label>
                  <textarea
                    rows={3}
                    value={form.metaDescriptionEn}
                    onChange={(e) => setForm({ ...form, metaDescriptionEn: e.target.value })}
                    placeholder="Privacy policy and data protection information for Kastayım Bugün."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
