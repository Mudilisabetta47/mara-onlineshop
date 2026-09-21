"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlusIcon } from "@/components/ui/Icons";

export function Accordion({ items, defaultOpen = 0 }: { items: { id: string; title: string; content: ReactNode }[]; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<string | null>(defaultOpen != null ? items[defaultOpen]?.id ?? null : null);
  return (
    <div className="divide-y divide-white/10 border-y border-white/10">
      {items.map((it) => {
        const isOpen = open === it.id;
        return (
          <div key={it.id}>
            <h3>
              <button aria-expanded={isOpen} aria-controls={`acc-${it.id}`} onClick={() => setOpen(isOpen ? null : it.id)} className="flex min-h-[60px] w-full items-center justify-between gap-4 text-left text-[15.5px] font-medium tracking-tight">
                {it.title}
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15"><PlusIcon width={16} height={16} /></motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div id={`acc-${it.id}`} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                  <div className="pb-6 text-[14.5px] leading-[1.75] text-cream/65">{it.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
