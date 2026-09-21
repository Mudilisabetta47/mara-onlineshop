"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/components/shop/ShopProvider";
import { Gallery } from "./Gallery";
import { WishlistButton } from "./WishlistButton";
import { AnimatedPrice } from "@/components/ui/Price";
import { Stars } from "@/components/ui/Stars";
import { CheckIcon, TruckIcon, ReturnIcon, ShieldIcon } from "@/components/ui/Icons";
import { percentOff } from "@/lib/money";
import { sizeRank } from "@/lib/catalog-client";

export type PVariant = { id: string; size: string | null; color: string | null; colorHex: string | null; qty: number; lowStock: number };
type Props = {
  productId: string; name: string; brand: string | null; shortDescription: string; sku: string;
  priceCents: number; compareAtCents: number | null; rating: number; ratingCount: number;
  variants: PVariant[]; images: { url: string; alt: string; color: string | null }[];
  freeShippingFrom: string; returnDays: number;
};

export function ProductPurchase(p: Props) {
  const { addToCart, cart } = useShop();
  const colors = useMemo(() => {
    const m = new Map<string, string | null>();
    p.variants.forEach((v) => v.color && !m.has(v.color) && m.set(v.color, v.colorHex));
    return [...m].map(([name, hex]) => ({ name, hex }));
  }, [p.variants]);
  const [color, setColor] = useState<string | null>(colors[0]?.name ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [hint, setHint] = useState<string | null>(null);

  const forColor = p.variants.filter((v) => v.color === color).sort((a, b) => sizeRank(a.size ?? "") - sizeRank(b.size ?? ""));
  const oneSize = forColor.length > 0 && forColor.every((v) => !v.size);
  const selected = oneSize ? forColor[0] : forColor.find((v) => v.size === size);
  const totalStock = forColor.reduce((s, v) => s + v.qty, 0);

  const gallery = useMemo(() => {
    const c = p.images.filter((i) => !color || !i.color || i.color === color);
    return (c.length ? c : p.images).map((i) => ({ url: i.url, alt: i.alt }));
  }, [p.images, color]);

  const pickColor = (c: string) => {
    setColor(c); setImgIdx(0); setHint(null);
    // Größe beibehalten, falls in der neuen Farbe verfügbar
    const still = p.variants.find((v) => v.color === c && v.size === size && v.qty > 0);
    if (!still) setSize(null);
  };

  const add = async () => {
    if (!selected) { setHint(oneSize ? null : "Bitte wähle eine Größe."); return; }
    if (selected.qty === 0) return;
    setState("loading");
    const ok = await addToCart(selected.id, 1);
    setState(ok ? "done" : "idle");
    if (ok) setTimeout(() => setState("idle"), 2200);
  };

  const inCart = selected ? cart.lines.find((l) => l.variantId === selected.id)?.quantity ?? 0 : 0;
  const stockMsg = !selected ? null : selected.qty === 0 ? "Ausverkauft" : selected.qty <= selected.lowStock ? `Nur noch ${selected.qty} verfügbar` : "Auf Lager – Versand in 1–2 Werktagen";
  const soldOutAll = p.variants.every((v) => v.qty === 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16 xl:grid-cols-[1.25fr_1fr]">
      <Gallery images={gallery} name={p.name} activeIndex={imgIdx} onIndex={setImgIdx} />

      <div className="lg:sticky lg:top-[100px] lg:self-start">
        {p.brand && <p className="eyebrow mb-3">{p.brand}</p>}
        <h1 className="display text-[clamp(2rem,4.2vw,3.6rem)]">{p.name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Stars value={p.rating} count={p.ratingCount} />
          <a href="#bewertungen" className="text-[12.5px] text-cream/50 underline-offset-4 hover:text-cream hover:underline">Bewertungen lesen</a>
        </div>

        <div className="mt-7 flex flex-wrap items-baseline gap-3">
          <AnimatedPrice cents={p.priceCents} className={`text-[30px] font-semibold tracking-tight ${p.compareAtCents ? "text-rose-300" : ""}`} />
          {p.compareAtCents && <>
            <s className="text-lg text-cream/40">{(p.compareAtCents / 100).toFixed(2).replace(".", ",")} €</s>
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11.5px] font-medium">−{percentOff(p.compareAtCents, p.priceCents)} %</span>
          </>}
        </div>
        <p className="mt-1 text-[12.5px] text-cream/40">inkl. MwSt., zzgl. <Link href="/versand" className="underline underline-offset-2">Versand</Link></p>
        <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-cream/70">{p.shortDescription}</p>

        {/* Farbe */}
        {colors.length > 0 && (
          <div className="mt-8">
            <p className="label !mb-3 flex justify-between"><span>Farbe: <b className="font-medium text-cream">{color}</b></span></p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Farbe">
              {colors.map((c) => (
                <button key={c.name} role="radio" aria-checked={color === c.name} aria-label={c.name} title={c.name} onClick={() => pickColor(c.name)}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-500 ease-premium ${color === c.name ? "scale-105 border-cream" : "border-white/15 hover:border-white/50"}`}>
                  <span className="h-8 w-8 rounded-full border border-white/25" style={{ background: c.hex ?? "#888" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Größe */}
        {!oneSize && (
          <div className="mt-7">
            <p className="label !mb-3 flex items-center justify-between"><span>Größe{size ? <>: <b className="font-medium text-cream">{size}</b></> : ""}</span><a href="#groessentabelle" className="text-cream/50 underline underline-offset-4 hover:text-cream">Größentabelle</a></p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Größe">
              {forColor.map((v) => (
                <button key={v.id} role="radio" aria-checked={size === v.size} aria-disabled={v.qty === 0} data-disabled={v.qty === 0} data-active={size === v.size} className="chip min-w-[56px]"
                  onClick={() => { setSize(v.size); setHint(null); }} title={v.qty === 0 ? "Ausverkauft" : v.qty <= v.lowStock ? `Nur noch ${v.qty}` : undefined}>
                  {v.size}
                </button>
              ))}
            </div>
            <AnimatePresence>{hint && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="field-error" role="alert">{hint}</motion.p>}</AnimatePresence>
          </div>
        )}

        <div className="mt-3 h-5 text-[13.5px]" aria-live="polite">
          {stockMsg && <span className={`inline-flex items-center gap-2 ${selected?.qty === 0 ? "text-[#f0a3b9]" : selected && selected.qty <= selected.lowStock ? "text-rose-300" : "text-cream/55"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${selected?.qty === 0 ? "bg-[#f0a3b9]" : selected && selected.qty <= selected.lowStock ? "bg-rose-300" : "bg-emerald-300/70"}`} />{stockMsg}
          </span>}
          {!selected && !oneSize && totalStock === 0 && <span className="text-[#f0a3b9]">In dieser Farbe ausverkauft</span>}
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={add} disabled={soldOutAll || state === "loading" || (selected?.qty === 0)}
            className={`btn relative h-[58px] w-full overflow-hidden text-[15px] ${state === "done" ? "bg-rose-300 text-ink-950" : "bg-cream text-ink-950 hover:bg-white hover:shadow-glow"}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={state} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2">
                {soldOutAll ? "Ausverkauft" : state === "done" ? <><CheckIcon width={18} height={18} /> Hinzugefügt</> : state === "loading" ? "…" : selected?.qty === 0 ? "Nicht verfügbar" : "In den Warenkorb"}
              </motion.span>
            </AnimatePresence>
          </button>
          <WishlistButton productId={p.productId} label className="btn-ghost h-[52px] w-full" />
          {inCart > 0 && <p className="text-center text-[12.5px] text-cream/45">{inCart}× bereits in deinem Warenkorb</p>}
        </div>

        <ul className="mt-8 grid gap-3 border-t border-white/10 pt-6 text-[13.5px] text-cream/65">
          <li className="flex items-center gap-3"><TruckIcon width={20} height={20} className="text-rose-300" /> Kostenloser Versand ab {p.freeShippingFrom}</li>
          <li className="flex items-center gap-3"><ReturnIcon width={20} height={20} className="text-rose-300" /> {p.returnDays} Tage Rückgaberecht</li>
          <li className="flex items-center gap-3"><ShieldIcon width={20} height={20} className="text-rose-300" /> Sichere Zahlung per Karte, PayPal, Apple Pay &amp; Google Pay</li>
        </ul>
        <p className="mt-6 text-[11.5px] text-cream/30">Art.-Nr. {p.sku}{selected ? ` · ${selected.id.slice(-6).toUpperCase()}` : ""}</p>
      </div>

      {/* Sticky Kaufleiste (Mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] text-cream/60">{p.name}</p><AnimatedPrice cents={p.priceCents} className="text-[17px] font-semibold" /></div>
          <button onClick={add} disabled={soldOutAll || state === "loading"} className={`btn min-w-[170px] ${state === "done" ? "bg-rose-300 text-ink-950" : "bg-cream text-ink-950"}`}>
            {soldOutAll ? "Ausverkauft" : state === "done" ? "✓ Hinzugefügt" : !selected && !oneSize ? "Größe wählen" : "In den Warenkorb"}
          </button>
        </div>
      </div>
    </div>
  );
}
