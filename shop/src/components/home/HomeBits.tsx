"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Parallax } from "@/components/motion/Parallax";

/** Große Editorial-Fläche mit Clip-Path-Reveal per Scroll-Fortschritt und Parallax auf Bild/Text/Deko. */
export function CampaignBand() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const clip = useTransform(p, [0, 1], ["inset(18% 12% 18% 12% round 48px)", "inset(0% 0% 0% 0% round 0px)"]);
  const scale = useTransform(p, [0, 1], [1.12, 1]);
  const blur = useTransform(p, [0, 0.7], ["blur(12px)", "blur(0px)"]);
  return (
    <section ref={ref} className="relative h-[92svh] min-h-[560px] overflow-hidden" aria-label="Kampagne">
      <motion.div style={{ clipPath: clip, filter: blur }} className="rm-none absolute inset-0 will-change-[clip-path]">
        <motion.div style={{ scale }} className="rm-none absolute inset-0 origin-center will-change-transform">
          <Image src="/seed/e/campaign.webp" alt="Kleiderstange mit ausgewählten Kollektionsteilen" fill sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-ink-950/30" />
      </motion.div>
      <div className="container-x relative flex h-full flex-col justify-end pb-[9svh]">
        <Parallax speed={1.12} range={320}>
          <p data-reveal="fade" className="eyebrow mb-5">Die Kampagne</p>
          <h2 data-reveal="up" className="h-xl max-w-[1100px] !text-[clamp(3rem,9vw,8.5rem)]">Für kleine<br />Persönlichkeiten.</h2>
        </Parallax>
        <div data-reveal="up" style={{ "--d": "0.2s" } as React.CSSProperties} className="mt-8"><Link href="/shop" className="btn-primary">Kollektion entdecken</Link></div>
      </div>
    </section>
  );
}

/** Split-Layout: Bild links (Mask-Reveal, Parallax 0.85×), Text rechts (1×), Deko (1.15×). */
export function SplitFeature() {
  return (
    <section className="container-x py-24 md:py-36" aria-label="Über LUMI">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-20">
        <div className="relative">
          <Parallax speed={0.85} range={260}>
            <div data-reveal="mask" className="relative aspect-[4/5] overflow-hidden rounded-[32px]">
              <Image src="/seed/e/split.webp" alt="Rucksack, Sneaker und Cap in Sand und Rosé" fill sizes="(min-width:768px) 45vw, 100vw" className="object-cover" />
            </div>
          </Parallax>
          <Parallax speed={1.18} range={300} className="pointer-events-none absolute -bottom-8 -right-4 hidden md:block">
            <div className="glass rounded-2xl px-5 py-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.2em] text-cream/50">Passform</p>
              <p className="mt-1 text-[15px] font-medium">Ehrliche Größenberatung</p>
            </div>
          </Parallax>
        </div>
        <div>
          <p data-reveal="up" className="eyebrow mb-5">Unsere Idee</p>
          <h2 data-reveal="up" style={{ "--d": "0.08s" } as React.CSSProperties} className="h-lg mb-7">Gemacht, um<br />mitzuwachsen.</h2>
          <p data-reveal="up" style={{ "--d": "0.16s" } as React.CSSProperties} className="max-w-[480px] text-[17px] leading-relaxed text-cream/65">
            Wir wählen Stücke aus, die gut sitzen, lange halten und sich gut anfühlen – in ruhigen Farben, die sich untereinander kombinieren lassen. Weniger, dafür besser.
          </p>
          <ul data-reveal-stagger="0.1" className="mt-9 grid gap-4 sm:grid-cols-2">
            {[["30 Tage", "Rückgaberecht"], ["ab 75 €", "kostenloser Versand"], ["Sicher", "Zahlung per Karte, PayPal & mehr"], ["Größentabellen", "bei jedem Produkt"]].map(([a, b]) => (
              <li data-reveal="up" key={a} className="border-t border-white/10 pt-4"><span className="block text-[20px] font-semibold tracking-tight">{a}</span><span className="text-[13.5px] text-cream/55">{b}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function UspStrip() {
  const items = ["Kostenloser Versand ab 75 €", "30 Tage Rückgaberecht", "Sichere Zahlung", "Ausgewählte Marken", "Schneller Versand"];
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/[0.07] py-4" aria-label="Vorteile">
      <div className="marquee flex w-max gap-12 whitespace-nowrap text-[13px] uppercase tracking-[0.22em] text-cream/55">
        {[...row, ...row].map((t, i) => <span key={i} className="flex items-center gap-12">{t}<span className="h-1 w-1 rounded-full bg-rose-300" /></span>)}
      </div>
    </div>
  );
}
