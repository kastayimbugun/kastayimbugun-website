import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPageBySlug, getAllPublishedPageSlugs } from "@/lib/data/pages";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

interface PublicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return { title: "Sayfa Bulunamadı" };
  }

  return {
    title: page.metaTitleTr || `${page.titleTr} | Kastayım Bugün`,
    description: page.metaDescriptionTr || `${page.titleTr} - Kastayım Bugün Villa Kiralama`,
    openGraph: {
      title: page.metaTitleTr || page.titleTr,
      description: page.metaDescriptionTr || `${page.titleTr} - Kastayım Bugün`,
    },
  };
}

export default async function PublicDynamicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="bg-sand-50/50 min-h-screen py-10 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Ekmek Kırıntısı (Breadcrumbs) */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-700 transition">
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-800 font-medium truncate">{page.titleTr}</span>
        </nav>

        {/* Sayfa Kartı */}
        <article className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-sand-200">
          {/* Sayfa Başlığı */}
          <header className="border-b border-sand-200 pb-6 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Kurumsal & Yasal Metin
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-brand-950 tracking-tight">
              {page.titleTr}
            </h1>
            <p className="text-xs text-gray-400 mt-2">
              Son güncelleme: {new Date(page.updatedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </header>

          {/* Sayfa İçeriği (WordPress Rich Text HTML Render) */}
          <div
            className="prose prose-slate max-w-none text-gray-800 leading-relaxed
              prose-headings:font-bold prose-headings:text-brand-950
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-a:text-emerald-700 prose-a:underline hover:prose-a:text-emerald-800
              prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6
              prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-sand-50 prose-blockquote:py-2
              prose-table:w-full prose-table:border-collapse prose-table:my-6
              prose-th:bg-sand-100 prose-th:p-3 prose-th:text-left prose-th:border prose-th:border-sand-200
              prose-td:p-3 prose-td:border prose-td:border-sand-200"
            // İçerik panelden HTML olarak geliyor; ziyaretçiye basmadan önce
            // sanitize ediliyor (ARCHITECTURE.md §5).
            dangerouslySetInnerHTML={{
              __html:
                sanitizeRichText(page.contentTr) ||
                "<p>İçerik henüz eklenmedi.</p>",
            }}
          />
        </article>
      </div>
    </div>
  );
}
