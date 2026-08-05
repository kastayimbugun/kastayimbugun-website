/**
 * Sayfa geçişlerinde iskelet. Panel sayfaları `force-dynamic` olduğu için
 * sunucu sorgusu bitene kadar ekran donmuş görünüyordu.
 */
export default function PanelLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      <span className="sr-only">Yükleniyor…</span>
      <div className="h-6 w-40 rounded bg-sand-200" />
      <div className="mt-2 h-4 w-64 rounded bg-sand-100" />
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl border border-sand-200 bg-white"
          />
        ))}
      </div>
    </div>
  );
}
