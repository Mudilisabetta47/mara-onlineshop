"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

const STEPS = [
  { title: "Neu entdeckt", text: "Frische Schnitte, ruhige Farben, weiche Materialien – jede Woche kommen neue Lieblingsstücke dazu.", img: "/seed/e/story-1.webp", bg: "#4B2237" },
  { title: "Für jeden Tag", text: "Basics, die mitmachen: waschfest, formstabil und so bequem, dass sie nicht mehr ausgezogen werden.", img: "/seed/e/story-2.webp", bg: "#241620" },
  { title: "Dein neuer Favorit", text: "Schuhe mit Passform, die vom ersten Schritt an sitzen – leicht, flexibel, für lange Tage.", img: "/seed/e/story-3.webp", bg: "#743B57" },
  { title: "Jetzt entdecken", text: "Kleider, Jacken und Accessoires – ausgewählt für kleine Persönlichkeiten.", img: "/seed/e/story-4.webp", bg: "#4B2237" },
] as const;

/**
 * Sticky-Storytelling: Die Bühne bleibt stehen, der Scroll-Fortschritt (0…1) blendet Texte ein/aus,
 * tauscht das Produktbild, verändert Skalierung, Rotation und die Bühnenfarbe. Reduced Motion: gestapelte Abschnitte.
 */
export function EditorialStory() {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });
  const n = STEPS.length;
  const barW = useTransform(p, [0, 1], ["0%", "100%"]);
  const ringRot = useTransform(p, [0, 1], [0, 200]);
  const ringScale = useTransform(p, [0, 0.5, 1], [0.9, 1.08, 0.96]);

  return (
    <section ref={track} className="scroll-track relative bg-ink-950" style={{ height: `${n * 90 + 30}svh` }} aria-label="Editorial">
      <div className="sticky-stage sticky top-0 h-[100svh] overflow-hidden">
        {/* Bühnenfarbe wechselt mit dem Fortschritt */}
        {STEPS.map((s, i) => <Bg key={s.title} p={p} i={i} n={n} color={s.bg} />)}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_50%,rgba(220,175,192,0.18),transparent)]" />

        <div className="container-x relative grid h-full items-center gap-6 md:grid-cols-[1.05fr_1fr]">
          {/* Text */}
          <div className="relative order-2 h-[46svh] md:order-1 md:h-[60svh]">
            <p className="eyebrow mb-5">Editorial</p>
            {STEPS.map((s, i) => <Step key={s.title} p={p} i={i} n={n} title={s.title} text={s.text} last={i === n - 1} />)}
            <div className="absolute bottom-0 left-0 hidden w-full max-w-[340px] md:block">
              <div className="h-px bg-white/15"><motion.div style={{ width: barW }} className="h-px bg-rose-300" /></div>
              <div className="mt-3 flex justify-between text-[11px] uppercase tracking-[0.2em] text-cream/40"><span>01</span><span>0{n}</span></div>
            </div>
          </div>

          {/* Bild */}
          <div className="relative order-1 h-[42svh] md:order-2 md:h-[80svh]">
            <motion.div style={{ rotate: ringRot, scale: ringScale }} className="rm-none absolute left-1/2 top-1/2 aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-300/25" aria-hidden>
              <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-rose-300 shadow-glow" />
            </motion.div>
            {STEPS.map((s, i) => <Pic key={s.img} p={p} i={i} n={n} src={s.img} first={i === 0} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

const win = (i: number, n: number) => {
  const a = i / n, b = (i + 1) / n, f = 0.06;
  return { a, b, f };
};

function Bg({ p, i, n, color }: { p: MotionValue<number>; i: number; n: number; color: string }) {
  const { a, b, f } = win(i, n);
  const o = useTransform(p, i === 0 ? [0, b - f, b + f] : i === n - 1 ? [a - f, a + f, 1] : [a - f, a + f, b - f, b + f], i === 0 ? [1, 1, 0] : i === n - 1 ? [0, 1, 1] : [0, 1, 1, 0]);
  return <motion.div style={{ opacity: o, background: `linear-gradient(135deg, ${color}, #0B090B 85%)` }} className="rm-none absolute inset-0" />;
}

function Step({ p, i, n, title, text, last }: { p: MotionValue<number>; i: number; n: number; title: string; text: string; last: boolean }) {
  const { a, b, f } = win(i, n);
  const inR = [a - f, a + f];
  const o = useTransform(p, i === 0 ? [0, b - f, b + f] : last ? [...inR, 1] : [...inR, b - f, b + f], i === 0 ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(p, i === 0 ? [0, b - f, b + f] : last ? [...inR, 1] : [...inR, b - f, b + f], i === 0 ? [0, 0, -50] : last ? [60, 0, 0] : [60, 0, 0, -50]);
  const blur = useTransform(p, i === 0 ? [0, b - f, b + f] : last ? [...inR, 1] : [...inR, b - f, b + f], i === 0 ? ["blur(0px)", "blur(0px)", "blur(12px)"] : last ? ["blur(12px)", "blur(0px)", "blur(0px)"] : ["blur(12px)", "blur(0px)", "blur(0px)", "blur(12px)"]);
  return (
    <motion.div style={{ opacity: o, y, filter: blur }} className="rm-none rm-flow absolute inset-x-0 top-[2.4rem] max-md:top-[2rem]">
      <h2 className="h-lg mb-6 max-md:!text-[clamp(2.3rem,11vw,3.4rem)]">{title}</h2>
      <p className="max-w-[440px] text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-cream/70">{text}</p>
      {last && <Link href="/shop" className="btn-primary mt-8">Jetzt entdecken</Link>}
    </motion.div>
  );
}

function Pic({ p, i, n, src, first }: { p: MotionValue<number>; i: number; n: number; src: string; first?: boolean }) {
  const { a, b, f } = win(i, n);
  const last = i === n - 1;
  const stops = i === 0 ? [0, b - f, b + f] : last ? [a - f, a + f, 1] : [a - f, a + f, b - f, b + f];
  const o = useTransform(p, stops, i === 0 ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]);
  const s = useTransform(p, stops, i === 0 ? [1, 1, 0.86] : last ? [0.86, 1, 1.04] : [0.86, 1, 1, 0.86]);
  const r = useTransform(p, stops, i === 0 ? [0, 0, -8] : last ? [8, 0, 0] : [8, 0, 0, -8]);
  return (
    <motion.div style={{ opacity: o, scale: s, rotate: r }} className={`rm-none ${first ? "" : "rm-hide"} absolute inset-0 will-change-transform`}>
      <Image src={src} alt="" fill sizes="(min-width:768px) 45vw, 90vw" className="object-contain" />
    </motion.div>
  );
}
