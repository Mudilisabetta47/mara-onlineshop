"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { formatEUR } from "@/lib/money";

type Props = {
  index: number;
  title: string;
  slug: string;
  text: string;
  image: string;
  cutout: string;
  count: number;
  fromCents: number | null;
  flip?: boolean;
};

/**
 * Kategorie-Dramaturgie (Scroll-Fortschritt 0…1 über eine sticky Bühne):
 *  0.00–0.30  Titel kommt von unten, Bild ist leicht unscharf + gerahmt (Clip) und wird scharf und bildfüllend
 *  0.30–0.72  Halten – Produkt bewegt sich leicht (schneller als das Bild), Text und CTA erscheinen versetzt
 *  0.72–1.00  Bild bewegt sich langsam aus dem Viewport
 */
export function CategoryStory({ index, title, slug, text, image, cutout, count, fromCents, flip }: Props) {
  const track = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: track, offset: ["start start", "end end"] });

  const clip = useTransform(p, [0, 0.3], ["inset(14% 10% 14% 10% round 44px)", "inset(0% 0% 0% 0% round 0px)"]);
  const blur = useTransform(p, [0, 0.3], ["blur(16px)", "blur(0px)"]);
  const imgScale = useTransform(p, [0, 0.4, 1], [1.12, 1, 1.04]);
  const imgY = useTransform(p, [0.72, 1], ["0%", "-16%"]);
  const cardO = useTransform(p, [0.86, 1], [1, 0.25]);

  const cutY = useTransform(p, [0, 1], ["16%", "-14%"]);
  const cutR = useTransform(p, [0, 1], [flip ? 6 : -6, flip ? -4 : 4]);
  const cutO = useTransform(p, [0.1, 0.32, 0.8, 0.98], [0, 1, 1, 0]);

  const numY = useTransform(p, [0, 0.3], [110, 0]);
  const titleY = useTransform(p, [0, 0.3], [160, 0]);
  const titleO = useTransform(p, [0, 0.16], [0, 1]);
  const textY = useTransform(p, [0.12, 0.4], [50, 0]);
  const textO = useTransform(p, [0.12, 0.4], [0, 1]);
  const ctaY = useTransform(p, [0.2, 0.48], [50, 0]);
  const ctaO = useTransform(p, [0.2, 0.48], [0, 1]);
  const exitY = useTransform(p, [0.72, 1], [0, -90]);
  const exitO = useTransform(p, [0.8, 1], [1, 0]);

  return (
    <section ref={track} className="scroll-track relative h-[210svh]" aria-label={title}>
      <div className="sticky-stage sticky top-0 h-[100svh] overflow-hidden">
        {/* Bild-Karte */}
        <motion.div style={{ clipPath: clip, filter: blur, opacity: cardO }} className="rm-none absolute inset-0 will-change-[clip-path,filter]">
          <motion.div style={{ scale: imgScale, y: imgY }} className="rm-none absolute inset-0 will-change-transform">
            <Image src={image} alt="" fill sizes="100vw" className={`object-cover ${flip ? "object-[50%_30%]" : "object-[50%_30%]"}`} />
          </motion.div>
          <div className={`absolute inset-0 ${flip ? "bg-gradient-to-l" : "bg-gradient-to-r"} from-ink-950/88 via-ink-950/40 to-transparent max-md:bg-gradient-to-t max-md:from-ink-950/90 max-md:via-ink-950/35`} />
        </motion.div>

        {/* Freisteller-Produkt: schneller als das Bild (Parallax 1.15×) */}
        <motion.div style={{ y: cutY, rotate: cutR, opacity: cutO }} className={`rm-none pointer-events-none absolute top-[10svh] aspect-square w-[min(88vw,64svh)] will-change-transform max-md:right-[-8%] max-md:top-[6svh] max-md:w-[80vw] ${flip ? "md:left-[8%]" : "md:right-[8%]"}`}>
          <Image src={cutout} alt="" fill sizes="(min-width:768px) 45vw, 80vw" className="object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.45)]" />
        </motion.div>

        {/* Text */}
        <motion.div style={{ y: exitY, opacity: exitO }} className="rm-none container-x relative flex h-full items-end pb-[11svh] md:items-center md:pb-0">
          <div className={`w-full max-w-[640px] ${flip ? "md:ml-auto" : ""}`}>
            <motion.p style={{ y: numY, opacity: titleO }} className="rm-none eyebrow mb-5">0{index + 1} · Kategorie</motion.p>
            <div className="overflow-hidden pb-[0.22em]">
              <motion.h2 style={{ y: titleY, opacity: titleO }} className="rm-none h-xl !text-[clamp(3.4rem,10vw,9rem)]">{title}</motion.h2>
            </div>
            <motion.p style={{ y: textY, opacity: textO }} className="rm-none mt-6 max-w-[430px] text-[clamp(1rem,1.3vw,1.15rem)] leading-relaxed text-cream/75">{text}</motion.p>
            <motion.div style={{ y: ctaY, opacity: ctaO }} className="rm-none mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={`/shop/${slug}`} className="btn-primary">Kollektion entdecken</Link>
              <span className="text-[13px] text-cream/55">{count} Artikel{fromCents != null ? ` · ab ${formatEUR(fromCents)}` : ""}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
