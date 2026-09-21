"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Sanftes Scrollen (Lenis) – nur mit Maus/Trackpad und ohne „reduced motion“.
 * Lenis läuft in einer einzigen requestAnimationFrame-Schleife; die scrollgebundenen Animationen
 * (framer-motion `useScroll`) lesen daraus den Fortschritt, ohne Layout zu messen.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (reduce || !fine) return;
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return null;
}
