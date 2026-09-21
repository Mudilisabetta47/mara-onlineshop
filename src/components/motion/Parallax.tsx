"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Parallax über Scroll-Fortschritt. speed < 1 → langsamer als der Scroll (Hintergrund, Bild),
 * speed = 1 → normal (Text), speed > 1 → schneller (dekorative Elemente).
 */
export function Parallax({
  speed = 0.85, className, children, range = 600,
}: { speed?: number; className?: string; children: ReactNode; range?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const amount = (1 - speed) * range;
  const y = useTransform(scrollYProgress, [0, 1], [-amount, amount]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="rm-none will-change-transform">{children}</motion.div>
    </div>
  );
}
