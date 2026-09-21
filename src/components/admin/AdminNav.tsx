"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/layout/Logo";
import { MenuIcon, CloseIcon } from "@/components/ui/Icons";

const ITEMS = [
  ["Dashboard", "/admin"], ["Produkte", "/admin/products"], ["Kategorien", "/admin/categories"], ["Bestellungen", "/admin/orders"],
  ["Kunden", "/admin/customers"], ["Inventar", "/admin/inventory"], ["Gutscheine", "/admin/coupons"], ["Bewertungen", "/admin/reviews"],
  ["Verträge", "/admin/contracts"], ["Dokumente", "/admin/documents"], ["Einstellungen", "/admin/settings"], ["Audit Log", "/admin/audit"],
] as const;

export function AdminNav({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  const list = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5 p-3">
      {ITEMS.map(([l, h]) => (
        <Link key={h} href={h} onClick={() => setOpen(false)} aria-current={on(h) ? "page" : undefined}
          className={`rounded-xl px-4 py-2.5 text-[14px] transition-colors ${on(h) ? "bg-white/[0.08] text-cream" : "text-cream/60 hover:bg-white/[0.04] hover:text-cream"}`}>
          {on(h) && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-rose-300 align-middle" />}{l}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <header className="sticky top-0 z-30 flex h-[58px] items-center justify-between border-b border-white/[0.07] bg-ink-950/90 px-4 backdrop-blur-xl lg:hidden">
        <Logo /><button aria-label="Menü" onClick={() => setOpen(!open)} className="flex h-11 w-11 items-center justify-center">{open ? <CloseIcon /> : <MenuIcon />}</button>
      </header>
      {open && <div className="fixed inset-x-0 top-[58px] z-20 max-h-[calc(100svh-58px)] overflow-y-auto border-b border-white/10 bg-ink-950 lg:hidden">{list}</div>}
      <aside className="sticky top-0 hidden h-[100svh] flex-col border-r border-white/[0.07] bg-ink-900/60 lg:flex">
        <div className="flex h-[60px] items-center border-b border-white/[0.07] px-6"><Logo /></div>
        <div className="flex-1 overflow-y-auto" data-lenis-prevent>{list}</div>
        <div className="border-t border-white/[0.07] p-4 text-[12px] text-cream/40">{name}</div>
      </aside>
    </>
  );
}
