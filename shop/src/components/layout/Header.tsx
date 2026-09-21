"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useShop } from "@/components/shop/ShopProvider";
import { Logo } from "./Logo";
import { MAIN_NAV, SECONDARY_NAV } from "./nav-links";
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/ui/Icons";

/** Zustände: 0 = transparent, 1 = Glass, 2 = Glass + kompakt. Es wird nur bei Schwellenübergang neu gerendert. */
export function Header() {
  const { cartCount, bump, wishlist, user, setCartOpen, setSearchOpen, setMenuOpen } = useShop();
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  useMotionValueEvent(scrollY, "change", (y) => {
    const s = y < 24 ? 0 : y < 420 ? 1 : 2;
    setStage((prev) => (prev === s ? prev : s));
  });

  const active = (href: string) => pathname === href.split("?")[0] && !href.includes("?");

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background,backdrop-filter,border-color,height] duration-500 ease-premium ${
        stage === 0 ? "h-[84px] border-transparent bg-transparent" : stage === 1 ? "h-[72px] border-white/10 bg-ink-950/55 backdrop-blur-xl backdrop-saturate-150" : "h-[60px] border-white/10 bg-ink-950/75 backdrop-blur-2xl backdrop-saturate-150"
      }`}
    >
      <div className="container-x grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center"><Logo /></div>

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 lg:flex">
          {MAIN_NAV.map((l) => (
            <Link key={l.href} href={l.href} className={`relative px-4 py-2 text-[14px] font-medium tracking-tight transition-colors ${pathname.startsWith(l.href) ? "text-cream" : "text-cream/75 hover:text-cream"}`}>
              {l.label}
              {pathname.startsWith(l.href) && <motion.span layoutId="nav-dot" className="absolute inset-x-4 -bottom-0.5 h-px bg-rose-300" />}
            </Link>
          ))}
          <span className="mx-3 hidden h-4 w-px bg-white/15 xl:block" />
          {SECONDARY_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="hidden px-2.5 py-2 text-[13px] text-cream/55 transition-colors hover:text-rose-300 xl:block">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <IconBtn label="Suche öffnen" onClick={() => setSearchOpen(true)}><SearchIcon /></IconBtn>
          <Link href={user ? "/account" : "/login"} aria-label={user ? `Konto von ${user.firstName}` : "Anmelden"} className="hidden h-11 w-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-white/[0.07] hover:text-cream lg:flex">
            <UserIcon />
          </Link>
          <Link href="/wishlist" aria-label="Wunschliste" className="relative hidden h-11 w-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-white/[0.07] hover:text-cream lg:flex">
            <HeartIcon filled={wishlist.size > 0} className={wishlist.size > 0 ? "text-rose-300" : ""} />
          </Link>
          <IconBtn label={`Warenkorb öffnen${cartCount ? `, ${cartCount} Artikel` : ""}`} onClick={() => setCartOpen(true)}>
            <span key={bump} className="relative inline-flex" style={bump ? { animation: "cart-bump .6s var(--ease)" } : undefined}>
              <BagIcon />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10.5px] font-semibold text-cream">
                  {cartCount}
                </span>
              )}
            </span>
          </IconBtn>
          <IconBtn label="Menü öffnen" onClick={() => setMenuOpen(true)} className="lg:hidden"><MenuIcon /></IconBtn>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-white/[0.07] hover:text-cream ${className}`}>
      {children}
    </button>
  );
}
