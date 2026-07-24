import { Suspense } from "react";
import VillaListClient from "@/components/VillaListClient";

export default function VillalarPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <VillaListClient />
    </Suspense>
  );
}
