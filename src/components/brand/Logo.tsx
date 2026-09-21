import { useId } from "react";
import { LOGO } from "./logo-data";

const { wordmark: W, lockup: L } = LOGO;

/** Zeichen: zwei Kreise = Lilli & Lou, die Schnittmenge ist das „Zusammen“. Koordinatenraum 0..64. */
function Mark({ id, hover }: { id: string; hover?: boolean }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}g`} x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stopColor="#EBC9D6" /><stop offset="1" stopColor="#A95D7C" /></linearGradient>
        <clipPath id={`${id}c`}><circle cx="22" cy="32" r="18" /></clipPath>
      </defs>
      <circle cx="22" cy="32" r="18" fill={`url(#${id}g)`} />
      <g className={hover ? "transition-transform duration-700 ease-premium group-hover:translate-x-[3px]" : undefined}>
        <circle cx="42" cy="32" r="18" fill="#F6EEF2" />
        <circle cx="42" cy="32" r="18" fill="#743B57" clipPath={`url(#${id}c)`} />
      </g>
    </>
  );
}

/** Nur das Zeichen (z. B. für kleine Flächen). */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg viewBox="4 14 56 36" className={className} role="img" aria-label="Lilli und Lou"><Mark id={id} /></svg>;
}

/** Nur die Wortmarke in einer Farbe (currentColor) – z. B. als Wasserzeichen. */
export function LogoWordmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={`${W.box.x} ${W.box.y} ${W.box.w} ${W.box.h}`} className={className} aria-hidden fill="currentColor">
      <path d={W.lilli} /><path d={W.und} /><path d={W.lou} />
    </svg>
  );
}

/** Vollständiges Logo: Zeichen + „Lilli und Lou“ (Fraunces, als Vektor – keine Schrift wird geladen). */
export function BrandLogo({ className = "h-[26px] w-auto" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} className={className} role="img" aria-label="Lilli und Lou">
      <g transform={`translate(${L.markX} ${L.markY}) scale(${L.markScale})`}><Mark id={id} hover /></g>
      <g transform={`translate(${L.wordX} ${L.wordY})`}>
        <path d={W.lilli} fill="#F6EEF2" /><path d={W.und} fill="#DCAFC0" /><path d={W.lou} fill="#F6EEF2" />
      </g>
    </svg>
  );
}
