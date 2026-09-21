"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

/**
 * Hero-Scroll-Story. Scrollposition → Fortschritt 0…1 → Transformationen (rückwärts identisch):
 *  - Hintergrund zoomt langsam heraus, Glow-Orbs wandern, Produkt-Layer bewegen sich mit unterschiedlicher Geschwindigkeit
 *  - Headline-Wörter versetzt, CTA leicht nach oben
 *  - Am Ende zieht sich die Bühne zurück (scale, Radius, Abdunklung) und der nächste Abschnitt schiebt sich darüber.
 * Nur transform / opacity / filter. Reduced Motion: statisches Hero (siehe globals.css).
 */
export function HeroScroll() {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });

  const bgScale = useTransform(p, [0, 1], [1.16, 1]);
  const bgY = useTransform(p, [0, 1], ["0%", "7%"]);
  const glowA = useTransform(p, [0, 1], ["0%", "-30%"]);
  const glowB = useTransform(p, [0, 1], ["0%", "40%"]);
  const glowO = useTransform(p, [0, 0.5, 1], [0.55, 1, 0.3]);

  const dressY = useTransform(p, [0, 1], ["0%", "-26%"]);
  const dressR = useTransform(p, [0, 1], [-4, -10]);
  const dressS = useTransform(p, [0, 1], [1, 1.09]);
  const hoodY = useTransform(p, [0, 1], ["0%", "-9%"]);
  const hoodX = useTransform(p, [0, 1], ["0%", "6%"]);
  const hoodR = useTransform(p, [0, 1], [6, 2]);
  const sneakY = useTransform(p, [0, 1], ["0%", "-42%"]);
  const sneakX = useTransform(p, [0, 1], ["0%", "-8%"]);

  const ctaY = useTransform(p, [0, 0.6], [0, -46]);
  const ctaO = useTransform(p, [0.42, 0.72], [1, 0]);
  const subY = useTransform(p, [0, 0.6], [0, -70]);
  const subO = useTransform(p, [0.35, 0.68], [1, 0]);
  const cueO = useTransform(p, [0, 0.12], [1, 0]);

  // Rückzug am Ende der Szene
  const stageScale = useTransform(p, [0.7, 1], [1, 0.92]);
  const stageRadius = useTransform(p, [0.7, 1], [0, 44]);
  const dim = useTransform(p, [0.66, 1], [0, 0.62]);

  return (
    <section ref={track} className="scroll-track relative h-[190svh]" aria-label="Kampagne">
      <div className="sticky-stage sticky top-0 h-[100svh] overflow-hidden">
        <motion.div style={{ scale: stageScale, borderRadius: stageRadius }} className="rm-none relative h-full w-full origin-center overflow-hidden bg-ink-950">
          {/* Hintergrund */}
          <motion.div style={{ scale: bgScale, y: bgY }} className="rm-none absolute inset-0 origin-center will-change-transform">
            <Image src="/seed/e/hero-bg.webp" alt="" fill priority sizes="100vw" className="object-cover object-[70%_center]" />
          </motion.div>

          {/* Licht */}
          <motion.div style={{ x: glowA, opacity: glowO }} className="rm-none pointer-events-none absolute -left-[10%] top-[8%] h-[46vw] w-[46vw] rounded-full bg-rose-500/25 blur-[110px]" />
          <motion.div style={{ x: glowB }} className="rm-none pointer-events-none absolute -right-[8%] bottom-[-10%] h-[40vw] w-[40vw] rounded-full bg-plum-700/50 blur-[120px]" />

          {/* Produkt-Layer */}
          <div className="pointer-events-none absolute inset-0">
            <Layer y={dressY} r={dressR} s={dressS} className="right-[6%] top-[14%] w-[62vw] md:right-[6%] md:top-[8%] md:w-[min(38vw,72svh)]" src="/seed/e/hero-dress.webp" delay={0.5} priority />
            <Layer y={hoodY} x={hoodX} r={hoodR} className="-right-[12%] bottom-[10%] hidden w-[24vw] md:block md:right-[3%] md:w-[min(22vw,42svh)]" src="/seed/e/hero-hoodie.webp" delay={0.75} />
            <Layer y={sneakY} x={sneakX} className="bottom-[9%] right-[40%] hidden w-[20vw] md:block md:w-[min(17vw,32svh)]" src="/seed/e/hero-sneaker.webp" delay={0.95} />
          </div>

          {/* Vignette für Lesbarkeit */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/25 to-transparent max-md:bg-gradient-to-t max-md:from-ink-950 max-md:via-ink-950/40 max-md:to-transparent" />

          {/* Text */}
          <div className="container-x relative flex h-full flex-col justify-end pb-[13svh] md:justify-center md:pb-0">
            <div className="max-w-[900px]">
              <p data-reveal="fade" style={{ "--d": "0.15s" } as React.CSSProperties} className="eyebrow mb-6">Neue Kollektion · Herbst / Winter</p>
              <h1 className="display text-[clamp(3.3rem,10.5vw,10.5rem)]">
                <HeadLine words={["Dein", "Style."]} p={p} start={0} delay={0.2} />
                <br />
                <HeadLine words={["Deine", "Auswahl."]} p={p} start={2} delay={0.36} accent />
              </h1>
              <motion.p style={{ y: subY, opacity: subO }} className="rm-none mt-7 max-w-[470px] text-[clamp(1rem,1.5vw,1.2rem)] leading-relaxed text-cream/70">
                <span data-reveal="up" className="block" style={{ "--d": "0.75s" } as React.CSSProperties}>Entdecke ausgewählte Mode, Schuhe und Lieblingsstücke.</span>
              </motion.p>
              <motion.div style={{ y: ctaY, opacity: ctaO }} className="rm-none mt-9 flex flex-wrap gap-3">
                <span data-reveal="up" style={{ "--d": "0.9s" } as React.CSSProperties}><Link href="/shop" className="btn-primary">Jetzt entdecken</Link></span>
                <span data-reveal="up" style={{ "--d": "1s" } as React.CSSProperties}><Link href="/shop?sort=new&new=1" className="btn-ghost">Kollektion ansehen</Link></span>
              </motion.div>
            </div>
          </div>

          <motion.div style={{ opacity: cueO }} className="rm-hide absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex" aria-hidden>
            <span className="eyebrow !text-cream/45">Scrollen</span>
            <span className="relative h-10 w-px overflow-hidden bg-white/15"><span className="absolute inset-x-0 top-0 h-4 bg-rose-300" style={{ animation: "cue 2s var(--ease-cine) infinite" }} /></span>
          </motion.div>

          <motion.div style={{ opacity: dim }} className="rm-none pointer-events-none absolute inset-0 bg-ink-950" />
        </motion.div>
      </div>
      <style>{`@keyframes cue{0%{transform:translateY(-100%)}100%{transform:translateY(260%)}}`}</style>
    </section>
  );
}

function HeadLine({ words, p, start, delay, accent }: { words: string[]; p: MotionValue<number>; start: number; delay: number; accent?: boolean }) {
  return (
    <>
      {words.map((w, i) => <Word key={w} p={p} i={start + i} delay={delay + i * 0.09} accent={accent}>{w}</Word>)}
    </>
  );
}

/** Ein Wort: Einblenden per CSS-Reveal (äußeres Span), Scroll-Bewegung per Motion (inneres Span) – getrennt, damit sich die Transforms nicht überschreiben. */
function Word({ children, p, i, delay, accent }: { children: string; p: MotionValue<number>; i: number; delay: number; accent?: boolean }) {
  const y = useTransform(p, [0, 1], [0, -(50 + i * 44)]);
  const x = useTransform(p, [0, 1], [0, i % 2 ? 40 : -20]);
  const o = useTransform(p, [0.28 + i * 0.05, 0.62 + i * 0.05], [1, 0]);
  const blur = useTransform(p, [0.4 + i * 0.05, 0.7 + i * 0.05], ["blur(0px)", "blur(10px)"]);
  return (
    <span className="inline-block overflow-hidden pb-[0.2em] -mb-[0.1em] align-bottom">
      <span data-reveal="up" className="inline-block" style={{ "--d": `${delay}s` } as React.CSSProperties}>
        <motion.span style={{ y, x, opacity: o, filter: blur }} className={`rm-none inline-block will-change-transform ${accent ? "text-rose-300" : ""}`}>
          {children}&nbsp;
        </motion.span>
      </span>
    </span>
  );
}

function Layer({ src, className, y, x, r, s, delay, priority }: { src: string; className: string; y: MotionValue<string>; x?: MotionValue<string>; r?: MotionValue<number>; s?: MotionValue<number>; delay: number; priority?: boolean }) {
  return (
    <motion.div style={{ y, x, rotate: r, scale: s }} className={`rm-none absolute will-change-transform ${className}`}>
      <div data-reveal="blur" style={{ "--d": `${delay}s` } as React.CSSProperties} className="relative aspect-square w-full">
        <Image src={src} alt="" fill sizes="(min-width:768px) 40vw, 62vw" priority={priority} className="object-contain" />
      </div>
    </motion.div>
  );
}
