"use client";

import { useEffect } from "react";

/**
 * Eine einzige IntersectionObserver-Instanz für alle `[data-reveal]`-Elemente
 * (Typen: fade | up | blur | clip | mask | scale | slide | slide-right).
 * Die Animation selbst ist reines CSS (transform / opacity / filter / clip-path).
 * `data-reveal-stagger="0.08"` am Elternelement versetzt die Kinder automatisch.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            const el = e.target as HTMLElement;
            el.classList.add("is-in");
            // Nach Ende der Einblend-Animation „is-done“ setzen: gibt Wort-Masken frei (.reveal-mask, siehe globals.css),
            // damit spätere scrollgesteuerte Bewegungen nicht mehr an deren Rändern beschnitten werden.
            const delay = parseFloat(el.style.getPropertyValue("--d")) || 0;
            window.setTimeout(() => el.classList.add("is-done"), (delay + 1.3) * 1000);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      document.querySelectorAll("[data-reveal-stagger]").forEach((p) => {
        const step = parseFloat((p as HTMLElement).dataset.revealStagger || "0.08");
        let i = 0;
        p.querySelectorAll(":scope > [data-reveal]").forEach((c) => {
          if (!(c as HTMLElement).style.getPropertyValue("--d")) (c as HTMLElement).style.setProperty("--d", `${(i * step).toFixed(2)}s`);
          i++;
        });
      });
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        if (!seen.has(el)) { seen.add(el); io.observe(el); }
      });
    };
    scan();
    root.dataset.ready = "1";
    let pending = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); cancelAnimationFrame(pending); };
  }, []);
  return null;
}
