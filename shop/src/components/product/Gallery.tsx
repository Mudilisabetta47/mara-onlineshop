"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon, ArrowLeft, ArrowRight } from "@/components/ui/Icons";

type Img = { url: string; alt: string };

/**
 * Galerie: Desktop – Thumbnails + Hover-Zoom (Lupe folgt der Maus) + Lightbox; Mobile – Swipe (Scroll-Snap) mit Punkten.
 */
export function Gallery({ images, name, activeIndex, onIndex }: { images: Img[]; name: string; activeIndex: number; onIndex: (i: number) => void }) {
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const cur = Math.min(activeIndex, images.length - 1);

  // Mobile: Swipe-Position ↔ activeIndex synchron halten
  useEffect(() => {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    if (Math.round(el.scrollLeft / el.clientWidth) !== cur) el.scrollTo({ left: cur * el.clientWidth, behavior: "smooth" });
  }, [cur]);

  useEffect(() => {
    if (!lightbox) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") onIndex((cur + 1) % images.length);
      if (e.key === "ArrowLeft") onIndex((cur - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightbox, cur, images.length, onIndex]);

  if (images.length === 0) return <div className="aspect-[4/5] rounded-3xl bg-plum-900" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[84px_1fr]">
      {/* Thumbnails (Desktop) */}
      <div className="order-2 hidden gap-3 lg:order-1 lg:flex lg:flex-col" role="tablist" aria-label="Produktbilder">
        {images.map((im, i) => (
          <button key={im.url} role="tab" aria-selected={i === cur} aria-label={`Bild ${i + 1}`} onClick={() => onIndex(i)}
            className={`relative aspect-[4/5] w-full overflow-hidden rounded-xl border transition-all duration-500 ease-premium ${i === cur ? "border-cream opacity-100" : "border-transparent opacity-50 hover:opacity-90"}`}>
            <Image src={im.url} alt="" fill sizes="84px" className="object-cover" />
          </button>
        ))}
      </div>

      <div className="order-1 lg:order-2">
        {/* Desktop-Hauptbild mit Zoom */}
        <div
          className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden rounded-[28px] bg-plum-900 lg:block"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={images[cur].url} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0">
              <Image src={images[cur].url} alt={images[cur].alt || name} fill priority sizes="(min-width:1024px) 46vw, 100vw"
                className="object-cover transition-transform duration-300 ease-out"
                style={zoom ? { transform: "scale(1.9)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
            </motion.div>
          </AnimatePresence>
          <span className="glass pointer-events-none absolute bottom-4 right-4 rounded-full px-3.5 py-1.5 text-[11.5px] tracking-wide text-cream/80">Zum Vergrößern klicken</span>
        </div>

        {/* Mobile: Swipe */}
        <div className="lg:hidden">
          <div ref={strip} onScroll={(e) => { const el = e.currentTarget; const i = Math.round(el.scrollLeft / el.clientWidth); if (i !== cur) onIndex(i); }}
            className="-mx-5 flex snap-x snap-mandatory overflow-x-auto scrollbar-none md:mx-0" data-lenis-prevent>
            {images.map((im, i) => (
              <button key={im.url} onClick={() => setLightbox(true)} className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-plum-900 md:rounded-[28px]" aria-label="Bild vergrößern">
                <Image src={im.url} alt={im.alt || name} fill priority={i === 0} sizes="100vw" className="object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2" aria-hidden>
            {images.map((im, i) => <span key={im.url} className={`h-1.5 rounded-full transition-all duration-500 ${i === cur ? "w-6 bg-cream" : "w-1.5 bg-white/25"}`} />)}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div role="dialog" aria-modal="true" aria-label="Bildansicht" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-950/95 backdrop-blur-xl" onClick={() => setLightbox(false)}>
            <button aria-label="Schließen" onClick={() => setLightbox(false)} className="absolute right-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 hover:bg-white/10"><CloseIcon /></button>
            {images.length > 1 && <>
              <button aria-label="Vorheriges Bild" onClick={(e) => { e.stopPropagation(); onIndex((cur - 1 + images.length) % images.length); }} className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 hover:bg-white/10 md:left-8"><ArrowLeft /></button>
              <button aria-label="Nächstes Bild" onClick={(e) => { e.stopPropagation(); onIndex((cur + 1) % images.length); }} className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 hover:bg-white/10 md:right-8"><ArrowRight /></button>
            </>}
            <motion.div key={cur} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative h-[86svh] w-[min(92vw,calc(86svh*0.8))]" onClick={(e) => e.stopPropagation()}>
              <Image src={images[cur].url} alt={images[cur].alt || name} fill sizes="100vw" className="rounded-2xl object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
