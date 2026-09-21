import type { ReactNode } from "react";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export async function LegalPage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  const s = await getSettings();
  const incomplete = s.legalName.includes("[") || s.street.includes("[");
  return (
    <div className="container-x pb-8 pt-[112px] md:pt-[136px]">
      <Breadcrumbs items={[{ name: "Startseite", href: "/" }, { name: title }]} />
      <div className="mx-auto mt-10 max-w-[820px]">
        <h1 className="h-lg mb-6">{title}</h1>
        {intro && <p className="mb-10 text-[17px] leading-relaxed text-cream/60">{intro}</p>}
        {incomplete && <p className="mb-10 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-[13.5px] text-amber-200">Hinweis für den Shop-Betreiber: Die Anbieterdaten sind noch nicht vollständig. Bitte unter <b>Admin → Einstellungen</b> ergänzen und alle Rechtstexte vor dem Livegang juristisch prüfen lassen. Dieser Hinweis verschwindet automatisch, sobald die Daten gepflegt sind.</p>}
        <div className="legal space-y-10 text-[15.5px] leading-[1.8] text-cream/70 [&_h2]:mb-3 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-cream [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-cream [&_a]:underline [&_a]:underline-offset-4">{children}</div>
      </div>
    </div>
  );
}

export const Sec = ({ title, children }: { title: string; children: ReactNode }) => <section><h2>{title}</h2><div className="space-y-3">{children}</div></section>;
