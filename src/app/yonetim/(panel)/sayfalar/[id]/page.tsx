import React from "react";
import { notFound } from "next/navigation";
import { getAdminPageById } from "@/lib/data/admin/pages";
import { PageForm } from "@/components/admin/PageForm";

export const metadata = {
  title: "Sayfa Düzenle | Yönetim Paneli",
};

interface EditPageAdminPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPageAdminPage({ params }: EditPageAdminPageProps) {
  const { id } = await params;
  const page = await getAdminPageById(id);

  if (!page) {
    notFound();
  }

  return <PageForm initialData={page} />;
}
