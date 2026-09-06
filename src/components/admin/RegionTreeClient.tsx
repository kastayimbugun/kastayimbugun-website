"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Plus,
  Building2,
  MapPin,
  GripVertical,
  CornerDownRight,
  Map as MapIcon,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { updateRegionsTreeOrder } from "@/lib/actions/admin/regions";
import { useToast } from "@/components/admin/ui/Toast";
import SaveBar from "@/components/admin/ui/SaveBar";
import {
  MAX_REGION_DEPTH,
  flattenRegionTree,
  regionLevelLabel,
} from "@/lib/regionTree";
import type { AdminRegion, AdminRegionTree } from "@/lib/data/admin/regions";

export type FlatRegionItem = AdminRegion & { depth: number };

// Seviye rozetleri. Sabit dört seviye YOK: derinlik paletten taşarsa son renk
// tekrar eder, yeni bir seviye eklemek kod değişikliği gerektirmez.
const LEVEL_BADGE_CLASSES = [
  "bg-brand-100 text-brand-800 border-brand-200",
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-emerald-100 text-emerald-900 border-emerald-200",
  "bg-purple-100 text-purple-900 border-purple-200",
  "bg-sky-100 text-sky-900 border-sky-200",
  "bg-rose-100 text-rose-900 border-rose-200",
];

const levelBadgeClass = (depth: number) =>
  LEVEL_BADGE_CLASSES[Math.min(depth, LEVEL_BADGE_CLASSES.length - 1)];

export default function RegionTreeClient({
  initialTree,
}: {
  initialTree: AdminRegionTree;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // Tüm hiyerarşiyi düz bir sıralı dizi olarak temsil ediyoruz.
  //
  // ESKİ HATALI DAVRANIŞ: bu liste dört seviye elle yazılarak kuruluyordu
  // (city → district → neighborhood → subRegion). Daha derin bölgeler listeye
  // hiç girmiyor, dolayısıyla panelde görünmüyordu. Artık ağaç özyinelemeli
  // olarak açılıyor; derinlik ne olursa olsun her kayıt listede.
  const buildInitialFlatList = (): FlatRegionItem[] => [
    ...flattenRegionTree(initialTree.roots),
    // Üst bölgesi bulunamayan kayıtlar kök seviyesinde en sonda gösterilir —
    // görünmezlerse yönetici onları düzeltemez.
    ...initialTree.orphans.map((o) => ({ ...o, depth: 0 })),
  ];

  const [items, setItems] = useState<FlatRegionItem[]>(buildInitialFlatList);
  const [savedItems, setSavedItems] = useState<FlatRegionItem[]>(buildInitialFlatList);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dropMode, setDropMode] = useState<"before" | "inside" | "after">("after");
  // Kapatılan (alt ağacı gizlenen) konumların id'leri.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);

  // --- YARDIMCILAR ---
  // Bir konumun doğrudan alt sayısı (yalnızca bir seviye alt).
  const directChildCount = (id: string) =>
    items.reduce((n, i) => (i.parentId === id ? n + 1 : n), 0);

  // Sürüklenen bloğun (konum + tüm alt ağacı) bittiği son indeks.
  const blockEndIndex = (start: number) => {
    const d = items[start].depth;
    let end = start;
    for (let i = start + 1; i < items.length; i++) {
      if (items[i].depth > d) end = i;
      else break;
    }
    return end;
  };

  // Bloğun kendi içindeki en derin kademe farkı (yaprak = 0). Taşımadan önce
  // sınırı aşıp aşmayacağını bilmek için gerekiyor.
  const blockHeight = (start: number) => {
    const end = blockEndIndex(start);
    let deepest = items[start].depth;
    for (let i = start; i <= end; i++) {
      if (items[i].depth > deepest) deepest = items[i].depth;
    }
    return deepest - items[start].depth;
  };

  // Bir konum, üst zincirindeki herhangi biri kapalıysa gizlidir.
  const byId = new Map(items.map((i) => [i.id, i]));
  const isHidden = (item: FlatRegionItem) => {
    let p = item.parentId;
    while (p) {
      if (collapsed.has(p)) return true;
      p = byId.get(p)?.parentId ?? null;
    }
    return false;
  };

  // Ekranda bir üstteki satır. Kapalı bir alt ağacın içindeki gizli satırlar
  // atlanır — kullanıcı görmediği bir konumun altına girintileyemez.
  const prevVisibleIndex = (index: number) => {
    for (let i = index - 1; i >= 0; i--) {
      if (!isHidden(items[i])) return i;
    }
    return -1;
  };

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const tooDeepMessage = `En fazla ${MAX_REGION_DEPTH + 1} kademe olabilir; bu taşıma sınırı aşıyor.`;

  // Sürüklenen bloğun görsel aralığı (soluklaştırma için).
  const draggedBlockEnd = draggedIdx !== null ? blockEndIndex(draggedIdx) : -1;
  const draggedHeight = draggedIdx !== null ? blockHeight(draggedIdx) : 0;

  // Sürüklenen blok bu derinliğe sığar mı? (bloğun en derin yaprağı da dahil)
  const fitsAtDepth = (depth: number) => depth + draggedHeight <= MAX_REGION_DEPTH;
  // Hedefin İÇİNE bırakmak sınırı aşıyor mu?
  const canDropInside = (targetDepth: number) => fitsAtDepth(targetDepth + 1);

  // --- OTOMATİK KAYDIRMA (sürükleme sırasında kenarlarda) ---
  const pointerYRef = useRef(0);
  useEffect(() => {
    if (draggedIdx === null) return;
    const onOver = (e: DragEvent) => {
      pointerYRef.current = e.clientY;
    };
    window.addEventListener("dragover", onOver);
    let raf = 0;
    const tick = () => {
      const y = pointerYRef.current;
      const h = window.innerHeight;
      const edge = 110; // kenardan bu kadar piksel içeride kaydırma başlar
      const maxSpeed = 22;
      if (y > 0 && y < edge) {
        window.scrollBy(0, -Math.ceil((maxSpeed * (edge - y)) / edge));
      } else if (y > h - edge) {
        window.scrollBy(0, Math.ceil((maxSpeed * (y - (h - edge))) / edge));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("dragover", onOver);
      cancelAnimationFrame(raf);
    };
  }, [draggedIdx]);

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

    // Bir konumu kendi alt ağacının içine bırakmak yapıyı bozar — engelle.
    // (Veritabanındaki `regions_no_cycle` trigger'ı da reddederdi.)
    if (targetIndex > draggedIdx && targetIndex <= draggedBlockEnd) {
      setDragOverIdx(null);
      return;
    }

    setDragOverIdx(targetIndex);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const offsetX = e.clientX - rect.left;
    const height = rect.height;

    // Sağa sürükleme (offsetX > 45) VEYA kartın ortasına gelme -> Üsttekinin Alt Bölgesi Yap (inside)
    if (offsetX > 45 || (offsetY > height * 0.25 && offsetY < height * 0.75)) {
      // Sınırı aşacaksa "içine" yerine "altına sırala"ya düş; kullanıcı
      // bırakabildiği hâlde reddedilen bir hedefi görmesin.
      setDropMode(canDropInside(items[targetIndex].depth) ? "inside" : "after");
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

    // Kendi alt ağacının içine bırakmayı yok say.
    if (targetIndex > draggedIdx && targetIndex <= draggedBlockEnd) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const nextItems = [...items];
    const draggedItem = nextItems[draggedIdx];

    // Sürüklenen öğenin tüm alt çocuklarını bul (bütünlüklü ağaç bloku)
    let blockCount = 1;
    for (let i = draggedIdx + 1; i < nextItems.length; i++) {
      if (nextItems[i].depth > draggedItem.depth) {
        blockCount++;
      } else {
        break;
      }
    }

    const draggedBlock = nextItems.splice(draggedIdx, blockCount);

    // Splice sonrası hedef indeksi güncelle
    let adjustedTargetIdx = targetIndex;
    if (draggedIdx < targetIndex) {
      adjustedTargetIdx -= blockCount;
    }

    const targetItem = nextItems[adjustedTargetIdx];
    if (!targetItem) return;

    let newDepth = targetItem.depth;
    let newParentId = targetItem.parentId;

    if (dropMode === "inside") {
      newDepth = targetItem.depth + 1;
      newParentId = targetItem.id;
    } else if (dropMode === "before" || dropMode === "after") {
      newDepth = targetItem.depth;
      newParentId = targetItem.parentId;
    }

    // Sınırı aşan taşımayı BURADA durdur. Sunucuya gidip toptan reddedilirse
    // kullanıcı o ana kadar yaptığı bütün düzenlemeleri kaybederdi.
    if (!fitsAtDepth(newDepth)) {
      toast.error(tooDeepMessage);
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const depthDelta = newDepth - draggedBlock[0].depth;
    draggedBlock[0].parentId = newParentId;

    // Tüm blok elemanlarının derinliğini güncelle (blok bütünlüğü korunur).
    draggedBlock.forEach((item) => {
      item.depth = Math.max(item.depth + depthDelta, 0);
    });

    let insertIdx = adjustedTargetIdx;
    if (dropMode === "before") {
      insertIdx = adjustedTargetIdx;
    } else if (dropMode === "inside" || dropMode === "after") {
      // Hedef ögenin mevcut tüm alt çocuklarının sonuna ekle
      insertIdx = adjustedTargetIdx + 1;
      while (
        insertIdx < nextItems.length &&
        nextItems[insertIdx].depth > targetItem.depth
      ) {
        insertIdx++;
      }
    }

    nextItems.splice(insertIdx, 0, ...draggedBlock);

    // İçine bırakıldıysa hedefi otomatik aç ki sonuç görünür olsun.
    if (dropMode === "inside" && collapsed.has(targetItem.id)) {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(targetItem.id);
        return next;
      });
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
  //
  // ESKİ HATALI DAVRANIŞ: yalnızca tıklanan satırın derinliği değişiyordu, alt
  // ağacınınki olduğu gibi kalıyordu. Düz listede hiyerarşi derinliğe bağlı
  // olduğu için çocuklar bir anda kardeş görünüyor ve bir sonraki sürükleme
  // yanlış bloğu taşıyordu. Artık blok bütün hâlinde kaydırılıyor.
  const handleIndent = (index: number) => {
    const prevIdx = prevVisibleIndex(index);
    if (prevIdx < 0) return;

    const prevItem = items[prevIdx];
    const delta = prevItem.depth + 1 - items[index].depth;
    if (delta <= 0) return; // zaten prevItem'in altında

    const end = blockEndIndex(index);
    if (items[index].depth + blockHeight(index) + delta > MAX_REGION_DEPTH) {
      toast.error(tooDeepMessage);
      return;
    }

    const nextItems = [...items];
    for (let i = index; i <= end; i++) {
      nextItems[i] = { ...nextItems[i], depth: nextItems[i].depth + delta };
    }
    nextItems[index] = { ...nextItems[index], parentId: prevItem.id };
    setItems(nextItems);
  };

  const handleOutdent = (index: number) => {
    const currItem = items[index];
    if (currItem.depth <= 0) return;

    const end = blockEndIndex(index);
    const block = items
      .slice(index, end + 1)
      .map((i) => ({ ...i, depth: i.depth - 1 }));

    const parent = currItem.parentId ? byId.get(currItem.parentId) : null;
    block[0] = { ...block[0], parentId: parent?.parentId ?? null };

    const rest = [...items.slice(0, index), ...items.slice(end + 1)];

    // Eski üstünün alt ağacının SONUNA taşı. Yerinde bırakılırsa blok, hâlâ bir
    // kademe altta duran eski kardeşlerinin üstünde kalır ve düz listede onlar
    // bu bloğun çocuğu gibi görünür.
    let insertIdx = index;
    if (parent) {
      const parentIdx = rest.findIndex((i) => i.id === parent.id);
      if (parentIdx >= 0) {
        insertIdx = parentIdx + 1;
        while (insertIdx < rest.length && rest[insertIdx].depth > parent.depth) {
          insertIdx++;
        }
      }
    }

    rest.splice(insertIdx, 0, ...block);
    setItems(rest);
  };

  // --- KAYDET ---
  const handleSave = () => {
    // `depth` GÖNDERİLMİYOR: sunucu onu `parent_id` zincirinden kendisi
    // hesaplıyor. Bu hatanın kaynağı, istemcide 3'e kırpılmış derinliğin
    // olduğu gibi veritabanına yazılmasıydı.
    const payload = items.map((item, idx) => ({
      id: item.id,
      parentId: item.parentId,
      sortOrder: idx,
    }));

    startTransition(async () => {
      const res = await updateRegionsTreeOrder(payload);
      if (res.ok) {
        setSavedItems(items);
        toast.success("Bölge ağacı ve sıralaması kaydedildi.");
        return;
      }

      // Sunucunun reddini sessizce yutma — hangi kuralın çiğnendiğini söyle.
      if (res.error === "cycle") {
        toast.error(
          "Bir bölge kendi alt bölgesinin altına taşınamaz. Hiçbir değişiklik kaydedilmedi."
        );
      } else if (res.error === "depth") {
        toast.error(tooDeepMessage + " Hiçbir değişiklik kaydedilmedi.");
      } else if (res.error === "auth") {
        toast.error("Oturumunuz sona ermiş. Yeniden giriş yapın.");
      } else {
        toast.error("Kaydedilemedi.");
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-900/60">
          <span className="min-w-0 flex-1">
            Sürükleyerek sırasını veya üst konumunu değiştirin. Sağ/sol ok butonlarıyla hızlıca alt bölge yapabilir veya üst seviyeye çıkarabilirsiniz. Kaydırırken üst/alt kenara götürünce liste otomatik kayar.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCollapsed(
                  new Set(
                    items.filter((i) => directChildCount(i.id) > 0).map((i) => i.id)
                  )
                )
              }
              className="rounded-lg border border-sand-200 bg-white px-2.5 py-1 font-medium text-brand-800 hover:bg-sand-50"
            >
              Tümünü kapat
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(new Set())}
              className="rounded-lg border border-sand-200 bg-white px-2.5 py-1 font-medium text-brand-800 hover:bg-sand-50"
            >
              Tümünü aç
            </button>
            <span className="font-semibold text-brand-950">
              Toplam {items.length} konum
            </span>
          </div>
        </div>

        {/* Girinti bir CSS değişkeninden gelir: derinlik sınırsız olduğu için
            her seviye için ayrı Tailwind sınıfı yazılamaz. */}
        <div className="space-y-2 [--region-indent:1.25rem] sm:[--region-indent:2rem]">
          {items.map((item, index) => {
            // Üst konumu kapalıysa bu satır gizli — indeksi korumak için null döner.
            if (isHidden(item)) return null;

            const childCount = directChildCount(item.id);
            const hasChildren = childCount > 0;
            const isCollapsed = collapsed.has(item.id);

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

            const isDragOver = dragOverIdx === index;
            // Sürüklenen konum + tüm alt ağacı birlikte soluklaşsın.
            const inDraggedBlock =
              draggedIdx !== null &&
              index >= draggedIdx &&
              index <= draggedBlockEnd;

            const levelLabel = regionLevelLabel(item.depth);
            const levelBadgeCls = levelBadgeClass(item.depth);

            const Icon =
              item.depth === 0 ? Building2 : item.depth === 1 ? MapIcon : MapPin;

            const dragOverStyle = isDragOver
              ? dropMode === "inside"
                ? "border-2 border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200"
                : dropMode === "before"
                ? "border-t-4 border-t-brand-600 border-sand-200 bg-brand-50/70"
                : "border-b-4 border-b-brand-600 border-sand-200 bg-brand-50/70"
              : "border-sand-200 bg-white hover:border-brand-300 hover:shadow-sm";

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  marginInlineStart: `calc(var(--region-indent) * ${item.depth})`,
                }}
                className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                  inDraggedBlock
                    ? "border-dashed border-brand-400 bg-brand-50 opacity-40"
                    : dragOverStyle
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

                  {/* Aç/Kapa — alt konumu olanlarda; kapalıyken alt ağaç gizlenir */}
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleCollapse(item.id)}
                      aria-expanded={!isCollapsed}
                      title={
                        isCollapsed
                          ? `${childCount} bağlı konumu göster`
                          : `${childCount} bağlı konumu gizle`
                      }
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-brand-700 hover:bg-sand-100"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isCollapsed ? "-rotate-90" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" aria-hidden />
                  )}

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
                    <div className="flex flex-wrap items-center gap-2">
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
                      {isDragOver && (
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ${
                            dropMode === "inside"
                              ? "bg-emerald-600 animate-pulse"
                              : "bg-brand-600"
                          }`}
                        >
                          {dropMode === "inside"
                            ? `↳ ${item.name} İçine (Alt Bölge Olarak) Ekle`
                            : dropMode === "before"
                            ? `↑ ${item.name} Üstüne Sırala`
                            : `↓ ${item.name} Altına Sırala`}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-brand-900/60">
                      {totalVillaCount} villa{totalVillaCount !== item.villaCount && ` (doğrudan ${item.villaCount})`} · Sıra #{index}
                      {isCollapsed && (
                        <span className="ml-1 font-semibold text-brand-700">
                          · {childCount} bağlı konum gizli
                        </span>
                      )}
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
                  {item.depth < MAX_REGION_DEPTH && index > 0 && (
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
                  {item.depth < MAX_REGION_DEPTH && (
                    <Link
                      href={`/yonetim/bolgeler/yeni?parent=${item.id}`}
                      title="Altına Yeni Konum Ekle"
                      className="flex h-7 px-2 items-center gap-1 rounded-lg border border-sand-200 bg-white text-xs font-semibold text-brand-700 hover:bg-sand-50"
                    >
                      <Plus className="h-3 w-3" />
                      <span className="hidden sm:inline">Alt Ekle</span>
                    </Link>
                  )}

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
