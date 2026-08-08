import React from "react";
import Link from "next/link";
import { getAdminPages } from "@/lib/data/admin/pages";
import { Plus, Edit, ExternalLink, Globe, FileText, CheckCircle, Clock } from "lucide-react";
import { PageStatusToggle } from "@/components/admin/PageStatusToggle";
import { PageDeleteButton } from "@/components/admin/PageDeleteButton";

export const metadata = {
  title: "Dinamik Sayfalar | Yönetim Paneli",
};

export default async function PagesAdminPage() {
  const pages = await getAdminPages();

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Buton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            Dinamik Sayfa Yönetimi
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Yasal metinleri, sözleşmeleri ve özel sayfaları bu ekrandan yönetebilirsiniz.
          </p>
        </div>
        <Link
          href="/yonetim/sayfalar/yeni"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Yeni Sayfa Ekle
        </Link>
      </div>

      {/* Sayfa Liste Tablosu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">Henüz sayfa oluşturulmadı</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              KVKK, Gizlilik Politikası, İptal Koşulları gibi yasal metinleri hemen ekleyebilirsiniz.
            </p>
            <Link
              href="/yonetim/sayfalar/yeni"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              İlk Sayfayı Ekle
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sayfa Başlığı</th>
                  <th className="py-3.5 px-4">URL Bağlantısı (Slug)</th>
                  <th className="py-3.5 px-4 text-center">Durum</th>
                  <th className="py-3.5 px-4 text-center">Footer Menü</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50/80 transition">
                    {/* Sayfa Başlığı */}
                    <td className="py-4 px-4 font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{page.titleTr}</span>
                        <span className="text-xs text-gray-500">{page.titleEn}</span>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-4 font-mono text-xs text-emerald-700 font-medium">
                      /sayfa/{page.slug}
                    </td>

                    {/* Durum */}
                    <td className="py-4 px-4 text-center">
                      <PageStatusToggle pageId={page.id} currentStatus={page.status} />
                    </td>

                    {/* Footer Gösterimi */}
                    <td className="py-4 px-4 text-center">
                      {page.showInFooter ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Alt Bilgide
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Gizli</span>
                      )}
                    </td>

                    {/* İşlemler */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === "published" && (
                          <Link
                            href={`/sayfa/${page.slug}`}
                            target="_blank"
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Sitede Gör"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          href={`/yonetim/sayfalar/${page.id}`}
                          className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <PageDeleteButton pageId={page.id} pageTitle={page.titleTr} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
