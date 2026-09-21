"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useShop } from "@/components/shop/ShopProvider";
import { AnimatedPrice } from "@/components/ui/Price";
import { CloseIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "@/components/ui/Icons";
import { formatEUR } from "@/lib/money";
import type { CartLine } from "@/lib/cart";

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, cartLoading, updateQty, removeLine, applyCoupon, removeCoupon } = useShop();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);

  useEffect(() => {
    if (!cartOpen) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setCartOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cartOpen, setCartOpen]);

  const remaining = Math.max(0, cart.freeShippingThresholdCents - (cart.subtotalCents - cart.discountCents));
  const progress = Math.min(1, (cart.subtotalCents - cart.discountCents) / cart.freeShippingThresholdCents);
  const empty = cart.lines.length === 0;

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            key="scrim" onClick={() => setCartOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[80] bg-ink-950/70 backdrop-blur-[3px]"
          />
          <motion.aside
            key="drawer" role="dialog" aria-modal="true" aria-label="Warenkorb"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-[85] flex w-full max-w-[480px] flex-col border-l border-white/10 bg-ink-900/95 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight">Warenkorb</h2>
                <p className="mt-0.5 text-[13px] text-cream/50">{empty ? "Noch nichts drin" : `${cart.count} ${cart.count === 1 ? "Artikel" : "Artikel"}`}</p>
              </div>
              <button aria-label="Warenkorb schließen" onClick={() => setCartOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10"><CloseIcon /></button>
            </div>

            {!empty && (
              <div className="mx-6 mb-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2.5 text-[13px]">
                  <TruckIcon width={18} height={18} className="text-rose-300" />
                  {remaining > 0 ? <span>Noch <b className="font-medium text-rose-300">{formatEUR(remaining)}</b> bis zum kostenlosen Versand</span> : <span className="text-rose-300">Kostenloser Versand ist freigeschaltet ✓</span>}
                </div>
                <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-rose-500 to-rose-300" animate={{ scaleX: progress }} initial={false} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} style={{ width: "100%" }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-2" data-lenis-prevent>
              {cartLoading && empty ? (
                <div className="space-y-4 py-4">{[0, 1].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
              ) : empty ? (
                <EmptyCart onClose={() => setCartOpen(false)} />
              ) : (
                <ul className="divide-y divide-white/[0.07]">
                  <AnimatePresence initial={false}>
                    {cart.lines.map((l) => (
                      <motion.li key={l.id} layout exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                        <Line l={l} onQty={(q) => updateQty(l.id, q)} onRemove={() => removeLine(l.id)} onNavigate={() => setCartOpen(false)} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {!empty && (
              <div className="border-t border-white/10 bg-ink-950/40 px-6 pb-6 pt-4">
                {cart.coupon ? (
                  <div className="mb-3 flex items-center justify-between rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-[13px]">
                    <span><b className="font-medium text-rose-300">{cart.coupon.code}</b> {cart.coupon.description && <span className="text-cream/55">· {cart.coupon.description}</span>}</span>
                    <button onClick={() => removeCoupon()} className="text-cream/60 underline-offset-2 hover:text-cream hover:underline">Entfernen</button>
                  </div>
                ) : showCoupon ? (
                  <form className="mb-3" onSubmit={async (e) => { e.preventDefault(); if (!code.trim()) return; const res = await applyCoupon(code); setErr(res); if (!res) setCode(""); }}>
                    <div className="flex gap-2">
                      <input value={code} onChange={(e) => { setCode(e.target.value); setErr(null); }} placeholder="Gutscheincode" className="field !min-h-[44px] uppercase" aria-label="Gutscheincode" />
                      <button className="btn-ghost btn-sm shrink-0">Einlösen</button>
                    </div>
                    {err && <p className="field-error">{err}</p>}
                  </form>
                ) : (
                  <button onClick={() => setShowCoupon(true)} className="mb-3 text-[13px] text-cream/60 underline-offset-4 hover:text-cream hover:underline">Gutscheincode eingeben</button>
                )}
                {cart.couponError && !cart.coupon && <p className="field-error mb-2">{cart.couponError}</p>}

                <dl className="space-y-1.5 text-[14px]">
                  <Row label="Zwischensumme" cents={cart.subtotalCents} />
                  {cart.discountCents > 0 && <Row label="Rabatt" cents={-cart.discountCents} accent />}
                  <div className="flex justify-between"><dt className="text-cream/65">Versand</dt><dd className="tabular-nums">{cart.shippingCents === 0 ? <span className="text-rose-300">Kostenlos</span> : formatEUR(cart.shippingCents)}</dd></div>
                  <div className="!mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
                    <dt className="text-[15px] font-medium">Gesamtsumme</dt>
                    <dd className="text-[22px] font-semibold"><AnimatedPrice cents={cart.totalCents} /></dd>
                  </div>
                  <p className="text-[12px] text-cream/40">inkl. {formatEUR(cart.taxCents)} MwSt.</p>
                </dl>

                {cart.hasProblems && <p className="mt-3 rounded-xl bg-[#f0a3b9]/10 px-3 py-2 text-[12.5px] text-[#f0a3b9]">Einige Artikel sind nicht (mehr) in dieser Menge verfügbar. Bitte prüfe deinen Warenkorb.</p>}

                <Link href="/checkout" onClick={() => setCartOpen(false)} aria-disabled={cart.hasProblems} className={`btn-primary mt-4 w-full ${cart.hasProblems ? "pointer-events-none opacity-40" : ""}`}>Zur Kasse</Link>
                <button onClick={() => setCartOpen(false)} className="btn-ghost mt-2 w-full">Weiter shoppen</button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, cents, accent }: { label: string; cents: number; accent?: boolean }) {
  return <div className="flex justify-between"><dt className="text-cream/65">{label}</dt><dd className={`tabular-nums ${accent ? "text-rose-300" : ""}`}>{cents < 0 ? "−" : ""}{formatEUR(Math.abs(cents))}</dd></div>;
}

function Line({ l, onQty, onRemove, onNavigate }: { l: CartLine; onQty: (q: number) => void; onRemove: () => void; onNavigate: () => void }) {
  const bad = l.problem === "sold_out" || l.problem === "unavailable";
  return (
    <div className="flex gap-4 py-5">
      <Link href={`/product/${l.slug}`} onClick={onNavigate} className="relative h-[112px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-plum-900">
        {l.imageUrl && <Image src={l.imageUrl} alt={l.name} fill sizes="88px" className={`object-cover ${bad ? "opacity-40 grayscale" : ""}`} />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/product/${l.slug}`} onClick={onNavigate} className="text-[14.5px] font-medium leading-snug tracking-tight hover:text-rose-300">{l.name}</Link>
          <span className="text-[14px] tabular-nums">{bad ? "–" : formatEUR(l.unitPriceCents * l.quantity)}</span>
        </div>
        <p className="mt-1 text-[12.5px] text-cream/50">{[l.color, l.size && `Größe ${l.size}`].filter(Boolean).join(" · ")}</p>
        {l.problem === "sold_out" && <p className="mt-1 text-[12.5px] text-[#f0a3b9]">Ausverkauft</p>}
        {l.problem === "unavailable" && <p className="mt-1 text-[12.5px] text-[#f0a3b9]">Nicht mehr verfügbar</p>}
        {l.problem === "reduced" && <p className="mt-1 text-[12.5px] text-[#f0a3b9]">Nur noch {l.stock} verfügbar</p>}
        <div className="mt-auto flex items-center justify-between pt-3">
          {bad ? <span /> : (
            <div className="inline-flex items-center rounded-full border border-white/12" role="group" aria-label="Menge">
              <button aria-label="Menge verringern" onClick={() => onQty(l.quantity - 1)} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10"><MinusIcon width={16} height={16} /></button>
              <span className="w-7 text-center text-[14px] tabular-nums" aria-live="polite">{l.quantity}</span>
              <button aria-label="Menge erhöhen" disabled={l.quantity >= Math.min(10, l.stock)} onClick={() => onQty(l.quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-30"><PlusIcon width={16} height={16} /></button>
            </div>
          )}
          <button onClick={onRemove} className="flex min-h-[44px] items-center gap-1.5 px-1 text-[12.5px] text-cream/50 transition-colors hover:text-cream"><TrashIcon width={16} height={16} /> Entfernen</button>
        </div>
      </div>
    </div>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10"><span className="h-3 w-3 rounded-full bg-rose-300 shadow-glow" /></div>
      <p className="text-[19px] font-medium tracking-tight">Dein Warenkorb ist leer.</p>
      <p className="mt-2 max-w-[260px] text-[14px] text-cream/55">Entdecke ausgewählte Mode, Schuhe und Lieblingsstücke.</p>
      <Link href="/shop" onClick={onClose} className="btn-primary mt-7">Jetzt entdecken</Link>
    </div>
  );
}
