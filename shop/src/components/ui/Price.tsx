"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatEUR } from "@/lib/money";

/** Preis, der sich beim Ändern weich austauscht (z. B. Menge / Gutschein). */
export function AnimatedPrice({ cents, className }: { cents: number; className?: string }) {
  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={cents}
          initial={{ y: "70%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-70%", opacity: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        >
          {formatEUR(cents)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function PriceTag({ cents, compareAt, size = "md" }: { cents: number; compareAt?: number | null; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-baseline gap-2 tabular-nums">
      <span className={`${size === "lg" ? "text-2xl md:text-[28px]" : "text-[15px]"} font-medium ${compareAt ? "text-rose-300" : ""}`}>{formatEUR(cents)}</span>
      {compareAt ? <s className={`${size === "lg" ? "text-base" : "text-[13px]"} text-cream/40`}>{formatEUR(compareAt)}</s> : null}
    </span>
  );
}
