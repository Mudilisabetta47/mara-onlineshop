"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";

const ITEMS = [
  ["Übersicht", "/account"], ["Bestellungen", "/account/orders"], ["Wunschliste", "/account/wishlist"],
  ["Deine Verträge", "/account/contracts"], ["Adressen", "/account/addresses"], ["Zahlungsmethoden", "/account/payment-methods"],
  ["Profil", "/account/profile"], ["Passwort", "/account/password"], ["Einstellungen", "/account/settings"],
] as const;

export function AccountNav({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const path = usePathname();
  const on = (h: string) => (h === "/account" ? path === h : path.startsWith(h));
  return (
    <aside className="lg:sticky lg:top-[100px] lg:self-start">
      <div className="mb-6 hidden lg:block"><p className="text-[17px] font-medium tracking-tight">{name}</p><p className="text-[13px] text-cream/45">{email}</p></div>
      <nav aria-label="Konto" className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 scrollbar-none lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {ITEMS.map(([label, href]) => (
          <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2.5 text-[14px] transition-colors lg:rounded-xl lg:py-3 ${on(href) ? "bg-cream text-ink-950 lg:bg-white/[0.07] lg:text-cream" : "text-cream/65 hover:bg-white/[0.05] hover:text-cream"}`}>
            {label}
          </Link>
        ))}
        {isAdmin && <Link href="/admin" className="shrink-0 rounded-full px-4 py-2.5 text-[14px] text-rose-300 hover:bg-white/[0.05] lg:rounded-xl lg:py-3">Admin-Bereich</Link>}
        <form action={logoutAction} className="shrink-0 lg:mt-4 lg:border-t lg:border-white/10 lg:pt-4"><button className="rounded-full px-4 py-2.5 text-[14px] text-cream/50 hover:text-cream lg:rounded-xl lg:py-3">Abmelden</button></form>
      </nav>
    </aside>
  );
}
