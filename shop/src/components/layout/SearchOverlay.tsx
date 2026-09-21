"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useShop } from "@/components/shop/ShopProvider";
import { CloseIcon, SearchIcon, ArrowRight } from "@/components/ui/Icons";
import { PriceTag } from "@/components/ui/Price";
import { MAIN_NAV } from "./nav-links";

type Hit = { slug: string; name: string; brand: string | null; category: string; image: string | null; priceCents: number; compareAtCents: number | null; soldOut: boolean };

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useShop();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [cats, setCats] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => input.current?.focus(), 250);
    else { setQ(""); setHits([]); setSearched(false); }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [searchOpen, setSearchOpen]);

  // Live-Suche: entprellt, mit Abbruch veralteter Requests
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setCats([]); setSearched(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) { const d = await res.json(); setHits(d.products); setCats(d.categories); setSearched(true); }
      } catch { /* abgebrochen */ }
      setLoading(false);
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { setSearchOpen(false); router.push(`/shop?q=${encodeURIComponent(q.trim())}`); }
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Suche"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[95] overflow-y-auto bg-ink-950/[0.97] backdrop-blur-2xl" data-lenis-prevent
        >
          <div className="pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full bg-plum-700/30 blur-[120px]" />
          <motion.div initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="container-x relative pb-20 pt-5 md:pt-8">
            <div className="flex justify-end">
              <button aria-label="Suche schließen" onClick={() => setSearchOpen(false)} className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 hover:bg-white/10"><CloseIcon /></button>
            </div>
            <form onSubmit={submit} className="mx-auto mt-4 max-w-[1000px] md:mt-10" role="search">
              <label htmlFor="search-input" className="eyebrow">Suche</label>
              <div className="mt-3 flex items-center gap-4 border-b border-white/20 pb-4 focus-within:border-rose-300/70">
                <SearchIcon width={30} height={30} className="shrink-0 text-cream/60" />
                <input id="search-input" ref={input} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" enterKeyHint="search"
                  placeholder="Wonach suchst du?" className="w-full bg-transparent text-[clamp(1.6rem,5vw,3.4rem)] font-semibold tracking-[-0.035em] placeholder:text-cream/25 focus:outline-none" />
                {loading && <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-rose-300" />}
              </div>
              <p className="mt-3 text-[13px] text-cream/45">Produktname, Kategorie, Marke oder Artikelnummer</p>
            </form>

            <div className="mx-auto mt-10 max-w-[1000px]">
              {q.trim().length < 2 ? (
                <div>
                  <p className="eyebrow mb-4">Beliebte Kategorien</p>
                  <div className="flex flex-wrap gap-2.5">
                    {MAIN_NAV.map((l) => <Link key={l.href} href={l.href} onClick={() => setSearchOpen(false)} className="chip !min-h-[52px] px-6 text-[15px]">{l.label}</Link>)}
                    <Link href="/shop?sale=1" onClick={() => setSearchOpen(false)} className="chip !min-h-[52px] px-6 text-[15px]">Angebote</Link>
                  </div>
                </div>
              ) : searched && hits.length === 0 && cats.length === 0 ? (
                <div className="py-10 text-center"><p className="text-xl font-medium">Keine Treffer für „{q}“.</p><p className="mt-2 text-cream/55">Prüfe die Schreibweise oder stöbere in den Kategorien.</p></div>
              ) : (
                <>
                  {cats.length > 0 && <div className="mb-6 flex flex-wrap gap-2">{cats.map((c) => <Link key={c.slug} href={`/shop/${c.slug}`} onClick={() => setSearchOpen(false)} className="chip">Kategorie: {c.name}</Link>)}</div>}
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {hits.map((h, i) => (
                      <motion.li key={h.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                        <Link href={`/product/${h.slug}`} onClick={() => setSearchOpen(false)} className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-rose-300/40 hover:bg-white/[0.05]">
                          <span className="relative h-[84px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-plum-900">{h.image && <Image src={h.image} alt="" fill sizes="68px" className="object-cover transition-transform duration-700 ease-premium group-hover:scale-105" />}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{h.name}</span>
                            <span className="mt-0.5 block truncate text-[12.5px] text-cream/50">{[h.brand, h.category].filter(Boolean).join(" · ")}</span>
                            <span className="mt-1.5 block">{h.soldOut ? <span className="text-[13px] text-cream/45">Ausverkauft</span> : <PriceTag cents={h.priceCents} compareAt={h.compareAtCents} />}</span>
                          </span>
                        </Link>
                      </motion.li>
                    ))}
                  </ul>
                  {hits.length > 0 && <button onClick={submit} className="btn-ghost mt-8">Alle Ergebnisse ansehen <ArrowRight width={18} height={18} /></button>}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
