import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ShopProvider } from "@/components/shop/ShopProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { EnvBadge } from "@/components/layout/EnvBadge";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "LUMI – Mode, Schuhe & Lieblingsstücke für Kinder", template: "%s | LUMI" },
  description: "Ausgewählte Kindermode, Schuhe und Lieblingsstücke. Schneller Versand, 30 Tage Rückgabe, sichere Zahlung.",
  openGraph: { type: "website", siteName: "LUMI", locale: "de_DE", images: [{ url: "/seed/og.jpg", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#0B090B", colorScheme: "dark", width: "device-width", initialScale: 1 };

// JS-Klasse: Reveal-Ausgangszustände greifen nur, wenn JS läuft. Fallback nach 5 s, falls Hydration ausbleibt.
const bootScript = `document.documentElement.classList.add('js');setTimeout(function(){if(!document.documentElement.dataset.ready)document.documentElement.classList.remove('js')},5000)`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: bootScript }} /></head>
      <body>
        <ShopProvider>
          <SmoothScroll />
          <RevealObserver />
          {children}
          <EnvBadge />
        </ShopProvider>
      </body>
    </html>
  );
}
