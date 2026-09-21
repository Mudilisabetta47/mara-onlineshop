"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

/**
 * Vertikal scrollen → Inhalte bewegen sich horizontal (sticky Bühne, Fortschritt 0→1).
 * Distanz und Höhe werden einmal gemessen (ResizeObserver) und gecacht – nicht pro Frame.
 * < md und bei „reduced motion“: normaler horizontaler Scroll-Snap (touch-freundlich).
 */
export function HorizontalScroll({ header, children }: { header?: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    const measure = () => {
      const on = mq.matches;
      setEnabled(on);
      if (on && strip.current) setDist(Math.max(0, strip.current.scrollWidth - window.innerWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (strip.current) ro.observe(strip.current);
    mq.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); mq.removeEventListener("change", measure); window.removeEventListener("resize", measure); };
  }, []);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -dist]);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={track} className="scroll-track relative" style={enabled ? { height: `calc(${dist}px + 100svh)` } : undefined}>
      <div className={enabled ? "sticky-stage sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden" : "sticky-stage py-16"}>
        {header}
        <div className={enabled ? "" : "rm-scroll-x overflow-x-auto scrollbar-none"}>
          <motion.div
            ref={strip}
            style={enabled ? { x } : undefined}
            className={`flex gap-5 px-5 md:px-12 ${enabled ? "w-max will-change-transform" : "snap-x snap-mandatory"}`}
          >
            {children}
          </motion.div>
        </div>
        {enabled && (
          <div className="container-x mt-10">
            <div className="h-px w-full bg-white/10">
              <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-rose-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
