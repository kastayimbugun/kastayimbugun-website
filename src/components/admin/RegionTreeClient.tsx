"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  Building2,
  MapPin,
  GripVertical,
  CornerDownRight,
  Map,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { updateRegionsTreeOrder } from "@/lib/actions/admin/regions";
import { useToast } from "@/components/admin/ui/Toast";
import SaveBar from "@/components/admin/ui/SaveBar";
import type { AdminRegion, AdminRegionTree3Level } from "@/lib/data/admin/regions";

export interface FlatRegionItem extends AdminRegion {
  parentId: string | null;
  depth: number;
}

export default function RegionTreeClient({
  initialTree,
}: {
  initialTree: AdminRegionTree3Level;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // Tüm hiyerarşiyi düz bir sıralı dizi olarak temsil ediyoruz
  const buildInitialFlatList = (): FlatRegionItem[] => {
    const list: FlatRegionItem[] = [];

    initialTree.cities.forEach((city) => {
      list.push({ ...city, parentId: null, depth: 0 });

      city.districts.forEach((district) => {
        list.push({ ...district, parentId: city.id, depth: 1 });

        district.neighborhoods.forEach((neighborhood) => {
          list.push({ ...neighborhood, parentId: district.id, depth: 2 });
        });
      });
    });

    initialTree.orphans.forEach((orphan) => {
      list.push({ ...orphan, parentId: null, depth: 0 });
    });

    return list;
  };

  const [items, setItems] = useState<FlatRegionItem[]>(buildInitialFlatList);
  const [savedItems, setSavedItems] = useState<FlatRegionItem[]>(buildInitialFlatList);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dropMode, setDropMode] = useState<"before" | "inside" | "after">("after");

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);

  // --- SÜRÜKLE - BIRAK MANTIĞI ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    setDragOverIdx(targetIndex);

    // Hedef elemanın üzerindeki dikey konuma göre "inside" (içine ekle) veya "after" (altına ekle) modu
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    if (offsetY > height * 0.25 && offsetY < height * 0.75) {
      setDropMode("inside");
    } else if (offsetY <= height * 0.25) {
      setDropMode("before");
    } else {
      setDropMode("after");
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIdx === null || draggedIdx === targetIndex) return;

    const nextItems = [...items];
    const [draggedItem] = nextItems.splice(draggedIdx, 1);
    const targetItem = items[targetIndex];

    if (dropMode === "inside") {
      // Hedef elemanın alt seviyesine (child) yap
      const newDepth = Math.min(targetItem.depth + 1, 2);
      draggedItem.parentId = targetItem.id;
      draggedItem.depth = newDepth;
      nextItems.splice(targetIndex + 1, 0, draggedItem);
    } else if (dropMode === "before") {
      draggedItem.parentId = targetItem.parentId;
      draggedItem.depth = targetItem.depth;
      nextItems.splice(targetIndex, 0, draggedItem);
    } else {
      draggedItem.parentId = targetItem.parentId;
      draggedItem.depth = targetItem.depth;
      nextItems.splice(targetIndex + 1, 0, draggedItem);
    }

    setItems(nextItems);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // --- OK TUŞLARI İLE GİRİNTİLEME (INDENT / OUTDENT) ---
  const handleIndent = (index: number) => {
    if (index <= 0) return;
    const prevItem = items[index - 1];
    if (prevItem.depth >= 2) return; // Maksimum depth 2

    const nextItems = [...items];
    const curr = { ...nextItems[index] };
    curr.parentId = prevItem.id;
    curr.depth = prevItem.depth + 1;
    nextItems[index] = curr;
    setItems(nextItems);
  };

  const handleOutdent = (index: number) => {
    const currItem = items[index];
    if (currItem.depth <= 0) return;

    const nextItems = [...items];
    const curr = { ...nextItems[index] };

    // Üstünün parent'ını bul veya root yap
    const parentMap: Record<string, FlatRegionItem> = {};
    items.forEach((i) => { parentMap[i.id] = i; });
    const parentObj = curr.parentId ? parentMap[curr.parentId] ?? null : null;

    curr.parentId = parentObj ? parentObj.parentId : null;
    curr.depth = Math.max(curr.depth - 1, 0);
    nextItems[index] = curr;
    setItems(nextItems);
  };

  // --- KAYDET ---
  const handleSave = () => {
    const payload = items.map((item, idx) => ({
      id: item.id,
      parentId: item.parentId,
      depth: item.depth,
      sortOrder: idx,
    }));

    startTransition(async () => {
      const res = await updateRegionsTreeOrder(payload);
      if (res.ok) {
        setSavedItems(items);
        toast.success("Hiyerarşi ve sıralama kaydedildi.");
      } else {
        toast.error("Sıralama kaydedilemedi.");
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6"
    >
      <div className="rounded-2xl border border-sand-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between border-b border-sand-200 pb-3">
          <div>
            <h3 className="font-bold text-brand-950">Konum Hiyerarşisi Düzenleyici</h3>
            <p className="text-xs text-brand-900/60">
              Bölgeleri tutup başka bir konumun **içine/üstüne** bırakarak veya **ok tuşlarıyla (← →)** seviyesini (İl, İlçe, Bölge) değiştirebilirsiniz.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, index) => {
            // Recursive toplam villa sayısı hesapla
            const getTotalVillaCount = (id: string): number => {
              let total = 0;
              items.forEach((child) => {
                if (child.parentId === id) {
                  total += child.villaCount + getTotalVillaCount(child.id);
                }
              });
              return total;
            };
            const totalVillaCount = item.villaCount + getTotalVillaCount(item.id);

            const isDragging = draggedIdx === index;
            const isDragOver = dragOverIdx === index;

            // Seviyeye göre ikon ve stil
            const levelLabel =
              item.depth === 0 ? "İl" : item.depth === 1 ? "İlçe" : "Bölge";
            const levelBadgeCls =
              item.depth === 0
                ? "bg-brand-100 text-brand-800 border-brand-200"
                : item.depth === 1
                ? "bg-amber-100 text-amber-900 border-amber-200"
                : "bg-emerald-100 text-emerald-900 border-emerald-200";

            const Icon =
              item.depth === 0 ? Building2 : item.depth === 1 ? Map : MapPin;

            // Derinliğe göre girinti (indentation)
            const indentMargin =
              item.depth === 1 ? "ml-6 sm:ml-10" : item.depth === 2 ? "ml-12 sm:ml-20" : "";

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition ${indentMargin} ${
                  isDragging
                    ? "border-dashed border-brand-400 bg-brand-50 opacity-40"
                    : isDragOver
                    ? dropMode === "inside"
                      ? "border-2 border-emerald-500 bg-emerald-50"
                      : "border-2 border-brand-500 bg-brand-50"
                    : "border-sand-200 bg-white hover:border-brand-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Sürükleme Tutamağı */}
                  <div
                    title="Sürükleyerek sırasını veya üst bölgesini değiştirin"
                    className="flex cursor-grab items-center justify-center text-sand-400 hover:text-brand-700 active:cursor-grabbing"
                  >
                    <GripVertical className="h-5 w-5" />
                  </div>

                  {/* Ağaç Çizgisi Göstergesi */}
                  {item.depth > 0 && (
                    <CornerDownRight className="h-4 w-4 shrink-0 text-brand-400" />
                  )}

                  {/* İkon & Resim */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand-100 text-brand-700">
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* İsim ve Bilgi */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/yonetim/bolgeler/${item.id}`}
                        className="font-bold text-sm text-brand-950 hover:underline truncate"
                      >
                        {item.name}
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${levelBadgeCls}`}
                      >
                        {levelLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-brand-900/60">
                      {totalVillaCount} villa{totalVillaCount !== item.villaCount && ` (doğrudan ${item.villaCount})`} · Sıra #{index}
                    </div>
                  </div>
                </div>

                {/* Hızlı Seviye ve İşlem Butonları */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Dışarı Çıkar (Outdent) */}
                  {item.depth > 0 && (
                    <button
                      type="button"
                      onClick={() => handleOutdent(index)}
                      title="Üst Seviyeye Taşı (Dışarı Çıkar)"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sand-200 bg-sand-50 text-brand-800 hover:bg-brand-100 hover:text-brand-900"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* İçeri Girintile (Indent) */}
                  {item.depth < 2 && index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleIndent(index)}
                      title="Alt Bölge Yap (İçeri Girintile)"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-sand-200 bg-sand-50 text-brand-800 hover:bg-brand-100 hover:text-brand-900"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Altına Ekle */}
                  <Link
                    href={`/yonetim/bolgeler/yeni?parent=${item.id}`}
                    title="Altına Yeni Konum Ekle"
                    className="flex h-7 px-2 items-center gap-1 rounded-lg border border-sand-200 bg-white text-xs font-semibold text-brand-700 hover:bg-sand-50"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Alt Ekle</span>
                  </Link>

                  {/* Düzenle */}
                  <Link
                    href={`/yonetim/bolgeler/${item.id}`}
                    className="p-1.5 text-brand-900/50 hover:text-brand-950"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manuel Kaydet Çubuğu */}
      <SaveBar pending={pending} dirty={dirty} label="Sıralamayı Kaydet" />
    </form>
  );
}
