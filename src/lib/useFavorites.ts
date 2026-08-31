"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Favori villalar — tarayıcıda saklanır, üyelik gerekmez.
 *
 * Eskiden kalp `VillaCard` içinde `useState(false)` idi: tıklayınca doluyordu,
 * kullanıcı bir villaya girip geri döndüğünde boşalıyordu. Yani çalışıyormuş
 * gibi görünen ama hiçbir şey saklamayan bir düğmeydi — üstelik header'daki
 * kalbin `onClick`'i bile yoktu.
 *
 * `localStorage` bilinçli tercih: favori listesi kişisel ama kritik değil,
 * üyelik istemek bu aşamada dönüşümü düşürür. Üyelik geldiğinde buradaki
 * liste sunucuya taşınabilir.
 *
 * `useSyncExternalStore` kullanılıyor çünkü `localStorage` tam olarak bunun
 * tarif ettiği şey: React'in dışında yaşayan, değiştiğinde haber veren bir
 * depo. `useEffect` + `useState` ile okumak hem sunucu/istemci render'ı
 * arasında uyuşmazlık riski taşır hem de her montajda fazladan bir render
 * turu üretir.
 */
const KEY = "kb:favoriler";

/**
 * Aynı sekmedeki diğer bileşenleri haberdar etmek için — tarayıcının `storage`
 * olayı yalnızca DİĞER sekmelerde tetiklenir, yazan sekmede tetiklenmez.
 * Bu olay olmadan kart kalbi dolar ama header'daki sayaç güncellenmezdi.
 */
const EVENT = "kb:favoriler-degisti";

/** Boş liste sabiti: her okumada yeni dizi döndürmek sonsuz render'a yol açar. */
const EMPTY: string[] = [];

// `getSnapshot` referans olarak KARARLI bir değer döndürmek zorunda; ham metin
// değişmediyse aynı dizi nesnesi geri verilir.
let sonHam: string | null = null;
let sonListe: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const list = parsed.filter((x): x is string => typeof x === "string");
    return list.length ? list : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  let raw: string | null = null;
  // Gizli sekme, site verisi engellenmiş tarayıcı veya önizleme bağlamında
  // erişimin kendisi hata fırlatabilir; favori listesi uğruna sayfa çökmez.
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== sonHam) {
    sonHam = raw;
    sonListe = parse(raw);
  }
  return sonListe;
}

/** Sunucuda `localStorage` yok — hidrasyon uyuşmazlığı olmasın diye boş liste. */
function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  // Diğer sekmede eklenen favori burada da görünsün.
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const noopSubscribe = () => () => {};

export function useFavorites() {
  const slugs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  /**
   * Hidrasyon bitti mi. Sunucuda ve ilk istemci render'ında `false`, sonrasında
   * `true`. Buna ihtiyaç var çünkü liste boşken "henüz okumadık" ile "gerçekten
   * favori yok" farklı şeyler — ilkinde boş ekran göstermek yanlış olur.
   */
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const toggle = useCallback((slug: string) => {
    const next = [...getSnapshot()];
    const i = next.indexOf(slug);
    if (i === -1) next.push(slug);
    else next.splice(i, 1);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Kota dolu veya yazma engelli — sessizce geç.
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  }, []);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  return { slugs, count: slugs.length, has, toggle, ready };
}
