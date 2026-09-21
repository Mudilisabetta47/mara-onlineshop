"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { ProductCardData } from "@/lib/catalog";
import { sizeRank } from "@/lib/catalog-client";
import { percentOff } from "@/lib/money";
import { useShop } from "@/components/shop/ShopProvider";
import { WishlistButton } from "./WishlistButton";
import { PriceTag } from "@/components/ui/Price";
import { CheckIcon, PlusIcon } from "@/components/ui/Icons";

export function ProductCard({ p, priority = false, sizes = "(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw", className = "" }: {
  p: ProductCardData; priority?: boolean; sizes?: string; className?: string;
}) {
  const { addToCart } = useShop();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Sanftes Mitbewegen mit der Maus (nur Transform, gefedert)
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 160, damping: 20 }), sy = useSpring(my, { stiffness: 160, damping: 20 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-3, 3]);
  const rotX = useTransform(sy, [-0.5, 0.5], [3, -3]);
  const imgX = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const imgY = useTransform(sy, [-0.5, 0.5], [-6, 6]);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const firstColor = p.variants.find((v) => v.color)?.color ?? null;
  const quick = p.variants.filter((v) => v.color === firstColor).sort((a, b) => sizeRank(a.size ?? "") - sizeRank(b.size ?? ""));
  const oneSize = quick.length === 1 && !quick[0].size;

  const add = async (variantId: string) => {
    const ok = await addToCart(variantId, 1);
    if (ok) { setAdded(variantId); setTimeout(() => { setAdded(null); setOpen(false); }, 1700); }
  };

  return (
    <article className={`group relative ${className}`} onMouseLeave={() => setOpen(false)}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 900 }}
        className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-plum-900 transition-shadow duration-700 ease-premium group-hover:shadow-soft"
      >
        <Link href={`/product/${p.slug}`} className="absolute inset-0 z-0" aria-label={p.name} prefetch={false}>
          <motion.div style={{ x: imgX, y: imgY }} className="absolute -inset-3">
            {p.image && (
              <Image
                src={p.image} alt={p.imageAlt} fill sizes={sizes} priority={priority}
                className="object-cover transition-[transform,opacity] duration-[900ms] ease-premium group-hover:scale-[1.045]"
              />
            )}
            {p.image2 && (
              <Image
                src={p.image2} alt="" fill sizes={sizes}
                className="object-cover opacity-0 transition-[transform,opacity] duration-[900ms] ease-premium group-hover:scale-[1.045] group-hover:opacity-100"
              />
            )}
          </motion.div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {p.soldOut ? <Badge tone="muted">Ausverkauft</Badge>
            : p.compareAtCents ? <Badge tone="rose">−{percentOff(p.compareAtCents, p.priceCents)} %</Badge>
            : p.isNew ? <Badge tone="light">Neu</Badge> : null}
          {!p.soldOut && p.lowStock ? <Badge tone="muted">Nur noch {p.lowStock}</Badge> : null}
        </div>

        <WishlistButton productId={p.id} className="glass absolute right-2.5 top-2.5 z-10 h-11 w-11 rounded-full" />

        {/* Schnell hinzufügen */}
        {!p.soldOut && (
          <>
            <button
              type="button" aria-label="Schnell hinzufügen" onClick={() => setOpen((o) => !o)}
              className="glass absolute bottom-2.5 right-2.5 z-10 flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-500 ease-premium hover:scale-105 md:hidden"
            >
              <PlusIcon width={20} height={20} />
            </button>
            <div
              className={`absolute inset-x-2.5 bottom-2.5 z-10 translate-y-3 opacity-0 transition-all duration-500 ease-premium md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100 ${open ? "!translate-y-0 !opacity-100" : "max-md:pointer-events-none"}`}
            >
              <div className="glass rounded-2xl p-2.5">
                {oneSize ? (
                  <QuickButton onClick={() => add(quick[0].id)} done={added === quick[0].id} disabled={quick[0].qty === 0}>
                    Schnell hinzufügen
                  </QuickButton>
                ) : (
                  <>
                    <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-cream/55">Größe wählen</div>
                    <div className="flex flex-wrap gap-1.5">
                      {quick.map((v) => (
                        <button
                          key={v.id} type="button" disabled={v.qty === 0} onClick={() => add(v.id)}
                          className={`relative min-h-[40px] min-w-[44px] rounded-full border px-3 text-[12.5px] font-medium transition-all duration-300 ${added === v.id ? "border-rose-300 bg-rose-300 text-ink-950" : v.qty === 0 ? "border-white/10 text-cream/30 line-through" : "border-white/20 hover:border-cream hover:bg-cream hover:text-ink-950"}`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            {added === v.id
                              ? <motion.span key="ok" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex"><CheckIcon width={16} height={16} /></motion.span>
                              : <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{v.size}</motion.span>}
                          </AnimatePresence>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>

      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <Link href={`/product/${p.slug}`} prefetch={false} className="block truncate text-[15px] font-medium tracking-tight transition-colors hover:text-rose-300">
            {p.name}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-cream/50">{p.shortDescription}</p>
        </div>
        <div className="shrink-0 text-right"><PriceTag cents={p.priceCents} compareAt={p.compareAtCents} /></div>
      </div>
      {p.colors.length > 1 && (
        <div className="mt-2.5 flex items-center gap-1.5 px-1" aria-label={`${p.colors.length} Farben`}>
          {p.colors.slice(0, 5).map((c) => (
            <span key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-white/25" style={{ background: c.hex ?? "#888" }} />
          ))}
        </div>
      )}
    </article>
  );
}

function Badge({ tone, children }: { tone: "rose" | "light" | "muted"; children: React.ReactNode }) {
  const cls = tone === "rose" ? "bg-rose-500 text-cream" : tone === "light" ? "bg-cream text-ink-950" : "bg-ink-950/70 text-cream/85 backdrop-blur";
  return <span className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ${cls}`}>{children}</span>;
}

function QuickButton({ children, onClick, done, disabled }: { children: React.ReactNode; onClick: () => void; done: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-[13px] font-medium transition-all duration-300 ${done ? "bg-rose-300 text-ink-950" : "bg-cream text-ink-950 hover:bg-white"} disabled:opacity-40`}>
      {done ? <><CheckIcon width={16} height={16} /> Hinzugefügt</> : children}
    </button>
  );
}
