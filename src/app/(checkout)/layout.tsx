import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-white/[0.07]">
        <div className="container-x flex h-[76px] items-center justify-between">
          <Logo />
          <p className="hidden items-center gap-2 text-[13px] text-cream/50 sm:flex">🔒 Sicherer Checkout</p>
          <Link href="/shop" className="text-[13.5px] text-cream/60 underline-offset-4 hover:text-cream hover:underline">Weiter shoppen</Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-white/[0.07] py-8"><div className="container-x flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px] text-cream/40">
        <Link href="/agb" className="hover:text-cream">AGB</Link><Link href="/widerruf" className="hover:text-cream">Widerruf</Link><Link href="/datenschutz" className="hover:text-cream">Datenschutz</Link><Link href="/versand" className="hover:text-cream">Versand</Link><Link href="/impressum" className="hover:text-cream">Impressum</Link>
      </div></footer>
    </>
  );
}
