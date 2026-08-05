"use client";

import { useId, useRef, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Erişilebilir sekme grubu: `role="tablist"/"tab"/"tabpanel"`, `aria-selected`,
 * `aria-controls` ve ok tuşlarıyla gezinme (WAI-ARIA sekme deseni).
 * Önceki sürüm süslü butonlardan ibaretti; ekran okuyucu sekme olduğunu
 * anlamıyor, klavyeyle gezinilemiyordu.
 */
export default function Tabs({ tabs }: { tabs: TabItem[] }) {
  const base = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const listRef = useRef<HTMLDivElement>(null);

  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => `${base}-panel-${id}`;

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (dir === null) return;
    e.preventDefault();

    const current = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (current + dir + tabs.length) % tabs.length;

    setActive(tabs[next].id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${CSS.escape(tabId(tabs[next].id))}`)
      ?.focus();
  };

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="mb-4 flex gap-1 overflow-x-auto border-b border-sand-200"
      >
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              id={tabId(t.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                selected
                  ? "border-brand-600 text-brand-800"
                  : "border-transparent text-brand-900/70 hover:text-brand-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          id={panelId(t.id)}
          role="tabpanel"
          aria-labelledby={tabId(t.id)}
          hidden={active !== t.id}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
