import Link from "next/link";
import { Logo } from "./Logo";
import { NewsletterForm } from "./Newsletter";
import { MAIN_NAV } from "./nav-links";

const PAYMENTS = ["Visa", "Mastercard", "Apple Pay", "Google Pay", "PayPal", "Vorkasse"];

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-ink-900">
      <div className="pointer-events-none absolute -bottom-48 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-plum-800/40 blur-[120px]" />
      <div className="container-x relative pb-10 pt-16 md:pt-24">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-[380px] text-[15px] leading-relaxed text-cream/60">Ausgewählte Mode, Schuhe und Lieblingsstücke für kleine Persönlichkeiten.</p>
            <div className="mt-8 max-w-[420px]"><p className="eyebrow mb-3">Newsletter</p><NewsletterForm compact /></div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <Col title="Shop" links={[...MAIN_NAV.map((l) => [l.label, l.href] as const), ["Angebote", "/shop?sale=1"], ["Bestseller", "/shop?sort=bestseller"]]} />
            <Col title="Service" links={[["Mein Konto", "/account"], ["Bestellungen", "/account/orders"], ["Wunschliste", "/wishlist"], ["Versand", "/versand"], ["Zahlungsarten", "/zahlungsarten"], ["Widerruf & Rückgabe", "/widerruf"]]} />
            <Col title="Rechtliches" links={[["Impressum", "/impressum"], ["Datenschutz", "/datenschutz"], ["AGB", "/agb"], ["Widerrufsbelehrung", "/widerruf"]]} />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <ul className="flex flex-wrap gap-2" aria-label="Zahlungsarten">
            {PAYMENTS.map((p) => <li key={p} className="rounded-full border border-white/10 px-3.5 py-1.5 text-[12px] text-cream/60">{p}</li>)}
          </ul>
          <p className="text-[12.5px] text-cream/40">Alle Preise inkl. gesetzlicher MwSt., zzgl. ggf. Versandkosten. © {new Date().getFullYear()} LUMI</p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none select-none overflow-hidden whitespace-nowrap text-center text-[22vw] font-semibold leading-[0.78] tracking-[-0.06em] text-white/[0.035]">LUMI</div>
    </footer>
  );
}

function Col({ title, links }: { title: string; links: (readonly [string, string])[] }) {
  return (
    <nav aria-label={title}>
      <p className="eyebrow mb-5">{title}</p>
      <ul className="space-y-3">
        {links.map(([label, href]) => (
          <li key={label}><Link href={href} className="link-u text-[15px] text-cream/75 transition-colors hover:text-cream">{label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
