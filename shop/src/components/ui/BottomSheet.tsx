"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "./Icons";

/** Bottom Sheet für Mobile (Filter, Sortierung). Schließt per Backdrop, ESC, Wischen nach unten. */
export function BottomSheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", h); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[88]" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-[28px] border-t border-white/10 bg-ink-900"
          >
            <div className="flex justify-center pt-3"><span className="h-1 w-10 rounded-full bg-white/20" /></div>
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
              <button aria-label="Schließen" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><CloseIcon /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4" data-lenis-prevent>{children}</div>
            {footer && <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
