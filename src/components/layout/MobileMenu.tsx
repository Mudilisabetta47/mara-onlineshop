"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useShop } from "@/components/shop/ShopProvider";
import { CloseIcon } from "@/components/ui/Icons";
import { Logo } from "./Logo";
import { MAIN_NAV, SECONDARY_NAV } from "./nav-links";

export function MobileMenu() {
  const { menuOpen, setMenuOpen, user } = useShop();
  const pathname = usePathname();
  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setMenuOpen]);

  return (
    <AnimatePresence>
      {menuOpen && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Menü"
          initial={{ clipPath: "inset(0 0 100% 0)" }} animate={{ clipPath: "inset(0 0 0% 0)" }} exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-[90] flex flex-col overflow-y-auto bg-ink-950"
        >
          <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-rose-500/25 blur-[100px]" />
          <div className="container-x flex h-[72px] shrink-0 items-center justify-between"><Logo />
            <button aria-label="Menü schließen" onClick={() => setMenuOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"><CloseIcon /></button>
          </div>
          <nav className="container-x relative flex flex-1 flex-col justify-center gap-1 py-6" aria-label="Mobile Navigation">
            {MAIN_NAV.map((l, i) => (
              <motion.div key={l.href} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                <Link href={l.href} className="display block py-2 text-[clamp(2.6rem,12vw,4.5rem)]">{l.label}</Link>
              </motion.div>
            ))}
            <div className="mt-6 flex flex-wrap gap-2">
              {SECONDARY_NAV.map((l) => <Link key={l.href} href={l.href} className="chip">{l.label}</Link>)}
            </div>
          </nav>
          <div className="container-x relative grid grid-cols-2 gap-3 border-t border-white/10 py-6 text-[15px]">
            <Link href={user ? "/account" : "/login"} className="btn-ghost">{user ? `Hallo, ${user.firstName}` : "Anmelden"}</Link>
            <Link href="/wishlist" className="btn-ghost">Wunschliste</Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
