"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Facets } from "@/lib/catalog";

type Props = { facets: Facets; categories?: { slug: string; name: string }[]; activeCategory?: string };

/** Filter-UI (Desktop-Sidebar und Inhalt des Mobile-Bottom-Sheets). Der Zustand lebt komplett in der URL. */
export function FilterPanel({ facets, categories, activeCategory }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  useEffect(() => { setMin(sp.get("min") ?? ""); setMax(sp.get("max") ?? ""); }, [sp]);
  useEffect(() => { document.body.toggleAttribute("data-filtering", pending); }, [pending]);

  const push = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    const qs = p.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const list = (k: string) => (sp.get(k)?.split(",").filter(Boolean) ?? []);
  const toggle = (k: string, v: string) => push((p) => {
    const cur = new Set(list(k)); cur.has(v) ? cur.delete(v) : cur.add(v);
    cur.size ? p.set(k, [...cur].join(",")) : p.delete(k);
  });
  const flag = (k: string) => sp.get(k) === "1";
  const setFlag = (k: string) => push((p) => (flag(k) ? p.delete(k) : p.set(k, "1")));
  const applyPrice = () => push((p) => { min ? p.set("min", min.replace(",", ".")) : p.delete("min"); max ? p.set("max", max.replace(",", ".")) : p.delete("max"); });

  return (
    <div className="space-y-9">
      {categories && (
        <Group title="Kategorie">
          <ul className="space-y-1">
            <li><a href={`/shop${sp.get("q") ? `?q=${encodeURIComponent(sp.get("q")!)}` : ""}`} className={`block rounded-lg px-1 py-2 text-[14.5px] ${!activeCategory ? "text-cream" : "text-cream/60 hover:text-cream"}`}>Alle Produkte</a></li>
            {categories.map((c) => <li key={c.slug}><a href={`/shop/${c.slug}`} className={`block rounded-lg px-1 py-2 text-[14.5px] ${activeCategory === c.slug ? "text-rose-300" : "text-cream/60 hover:text-cream"}`}>{c.name}</a></li>)}
          </ul>
        </Group>
      )}

      <Group title="Verfügbarkeit">
        <Check label="Nur verfügbare Artikel" checked={flag("stock")} onChange={() => setFlag("stock")} />
        <Check label="Nur Angebote" checked={flag("sale")} onChange={() => setFlag("sale")} />
        <Check label="Nur Neuheiten" checked={flag("new")} onChange={() => setFlag("new")} />
      </Group>

      {facets.sizes.length > 0 && (
        <Group title="Größe">
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => <button key={s.value} type="button" className="chip" aria-pressed={list("size").includes(s.value)} onClick={() => toggle("size", s.value)}>{s.value}</button>)}
          </div>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group title="Farbe">
          <div className="flex flex-wrap gap-2.5">
            {facets.colors.map((c) => {
              const on = list("color").includes(c.value);
              return (
                <button key={c.value} type="button" aria-pressed={on} aria-label={c.value} title={c.value} onClick={() => toggle("color", c.value)}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${on ? "border-cream" : "border-white/15 hover:border-white/50"}`}>
                  <span className="h-7 w-7 rounded-full border border-white/20" style={{ background: c.hex ?? "#888" }} />
                </button>
              );
            })}
          </div>
        </Group>
      )}

      {facets.brands.length > 0 && (
        <Group title="Marke">
          {facets.brands.map((b) => <Check key={b.slug} label={b.name} count={b.count} checked={list("brand").includes(b.slug)} onChange={() => toggle("brand", b.slug)} />)}
        </Group>
      )}

      <Group title="Preis">
        <form onSubmit={(e) => { e.preventDefault(); applyPrice(); }} className="flex items-center gap-2">
          <input inputMode="decimal" aria-label="Mindestpreis in Euro" placeholder={`ab ${Math.floor(facets.price.min / 100)}`} value={min} onChange={(e) => setMin(e.target.value)} onBlur={applyPrice} className="field !min-h-[44px] text-center" />
          <span className="text-cream/40">–</span>
          <input inputMode="decimal" aria-label="Höchstpreis in Euro" placeholder={`bis ${Math.ceil(facets.price.max / 100)}`} value={max} onChange={(e) => setMax(e.target.value)} onBlur={applyPrice} className="field !min-h-[44px] text-center" />
          <span className="text-cream/50">€</span>
          <button className="sr-only">Anwenden</button>
        </form>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="eyebrow mb-4 !text-cream/50">{title}</legend>{children}</fieldset>;
}

function Check({ label, checked, onChange, count }: { label: string; checked: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="group flex min-h-[44px] cursor-pointer items-center gap-3 text-[14.5px] text-cream/80 hover:text-cream">
      <span className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${checked ? "border-rose-300 bg-rose-300" : "border-white/25 group-hover:border-white/60"}`}>
        {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B090B" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500" /></svg>}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-[12px] text-cream/35">{count}</span>}
    </label>
  );
}
