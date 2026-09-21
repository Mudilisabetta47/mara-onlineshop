"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { FilterIcon, CloseIcon, CheckIcon } from "@/components/ui/Icons";
import { FilterPanel } from "./FilterPanel";
import type { Facets, SortKey } from "@/lib/catalog";
import { SORT_LABELS_CLIENT } from "@/lib/catalog-client";

type Props = { total: number; sort: SortKey; facets: Facets; categories?: { slug: string; name: string }[]; activeCategory?: string; chips: { label: string; param: string; value?: string }[] };

export function CatalogToolbar({ total, sort, facets, categories, activeCategory, chips }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, start] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const setParam = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p); p.delete("page");
    const qs = p.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const setSort = (s: string) => setParam((p) => (s === "featured" ? p.delete("sort") : p.set("sort", s)));
  const removeChip = (c: { param: string; value?: string }) => setParam((p) => {
    if (c.value) {
      const rest = (p.get(c.param) ?? "").split(",").filter((x) => x && x !== c.value);
      rest.length ? p.set(c.param, rest.join(",")) : p.delete(c.param);
    } else if (c.param === "price") { p.delete("min"); p.delete("max"); } else p.delete(c.param);
  });
  const reset = () => setParam((p) => { ["size", "color", "brand", "min", "max", "stock", "sale", "new", "q"].forEach((k) => p.delete(k)); });
  const filterCount = chips.length;

  return (
    <div className="sticky top-[60px] z-30 -mx-5 border-b border-white/[0.07] bg-ink-950/80 px-5 py-3 backdrop-blur-xl md:-mx-8 md:px-8 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] text-cream/60" aria-live="polite">{total} {total === 1 ? "Produkt" : "Produkte"}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setFilterOpen(true)} className="btn-ghost btn-sm lg:hidden"><FilterIcon width={18} height={18} /> Filter{filterCount ? ` (${filterCount})` : ""}</button>
          <button onClick={() => setSortOpen(true)} className="btn-ghost btn-sm lg:hidden">Sortieren</button>
          <label className="hidden items-center gap-3 lg:flex">
            <span className="text-[13px] text-cream/50">Sortieren nach</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="field !min-h-[44px] !w-auto min-w-[200px]">
              {Object.entries(SORT_LABELS_CLIENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.param + c.label} onClick={() => removeChip(c)} className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] pl-3.5 pr-2.5 text-[12.5px] transition-colors hover:border-rose-300/60">
              {c.label}<CloseIcon width={14} height={14} className="text-cream/50 group-hover:text-cream" />
            </button>
          ))}
          <button onClick={reset} className="px-2 text-[12.5px] text-cream/50 underline-offset-4 hover:text-cream hover:underline">Alle zurücksetzen</button>
        </div>
      )}

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter"
        footer={<div className="flex gap-3"><button onClick={reset} className="btn-ghost flex-1">Zurücksetzen</button><button onClick={() => setFilterOpen(false)} className="btn-primary flex-[2]">{total} Produkte anzeigen</button></div>}>
        <FilterPanel facets={facets} categories={categories} activeCategory={activeCategory} />
      </BottomSheet>

      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sortieren">
        <ul className="pb-4">
          {Object.entries(SORT_LABELS_CLIENT).map(([k, v]) => (
            <li key={k}><button onClick={() => { setSort(k); setSortOpen(false); }} className="flex min-h-[52px] w-full items-center justify-between border-b border-white/[0.06] text-[16px]">
              <span className={sort === k ? "text-rose-300" : ""}>{v}</span>{sort === k && <CheckIcon width={20} height={20} className="text-rose-300" />}
            </button></li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
