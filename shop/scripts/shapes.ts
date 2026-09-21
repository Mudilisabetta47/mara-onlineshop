/**
 * Stilisierte Produkt-Silhouetten (400×400-Koordinatenraum) für die generierten Seed-Bilder.
 * Es sind Platzhalter-Illustrationen – echte Produktfotos werden im Admin hochgeladen.
 */
import type { ShapeName } from "../prisma/catalog";

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
export const rgbToHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
/** amt > 0 → Richtung Weiß, amt < 0 → Richtung Schwarz */
export const shade = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255, a = Math.abs(amt);
  return rgbToHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
};
export const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

type P = { base: string; light: string; dark: string; darker: string; accent: string; sole: string };
type Def = { behind?: string; outline: string; inside?: string; details?: string };

const fold = (d: string, p: P, o = 0.16, w = 3) =>
  `<path d="${d}" fill="none" stroke="${p.darker}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
const hi = (d: string, o = 0.16, w = 3) =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;

const shapes: Record<ShapeName, (p: P) => Def> = {
  tee: (p) => ({
    outline: "M128 64 C150 84 176 94 200 94 C224 94 250 84 272 64 L352 104 L322 174 L284 154 L284 344 L116 344 L116 154 L78 174 L48 104 Z",
    inside: `${fold("M116 154 C124 120 128 90 128 64", p)}${fold("M284 154 C276 120 272 90 272 64", p)}${fold("M150 250 C180 262 220 262 250 250", p, 0.1, 6)}${hi("M132 190 C140 240 140 290 134 330", 0.12, 5)}<rect x="116" y="326" width="168" height="18" fill="${p.darker}" fill-opacity=".12"/>`,
    details: `<path d="M150 66 C166 102 234 102 250 66" fill="none" stroke="${p.dark}" stroke-width="9" stroke-linecap="round"/>`,
  }),
  hoodie: (p) => ({
    behind: `<path d="M134 100 C126 34 274 34 266 100 C248 126 152 126 134 100 Z" fill="${p.dark}"/><path d="M158 92 C168 112 232 112 242 92 C238 66 162 66 158 92 Z" fill="${p.darker}"/>`,
    outline: "M122 98 L58 140 L36 314 L88 322 L112 216 L112 352 L288 352 L288 216 L312 322 L364 314 L342 140 L278 98 C262 114 238 124 200 124 C162 124 138 114 122 98 Z",
    inside: `${fold("M112 216 C106 170 110 140 122 98", p)}${fold("M288 216 C294 170 290 140 278 98", p)}<path d="M132 262 H268 L288 330 H112 Z" fill="${p.darker}" fill-opacity=".14" stroke="${p.darker}" stroke-opacity=".28" stroke-width="2.5"/>${hi("M130 200 C136 230 136 250 132 262", 0.12, 5)}<rect x="36" y="300" width="52" height="22" fill="${p.darker}" fill-opacity=".16" transform="rotate(5 60 310)"/><rect x="312" y="300" width="52" height="22" fill="${p.darker}" fill-opacity=".16" transform="rotate(-5 340 310)"/><rect x="112" y="336" width="176" height="16" fill="${p.darker}" fill-opacity=".16"/>`,
    details: `<path d="M187 126 V184 M213 126 V178" stroke="${p.light}" stroke-width="4" stroke-linecap="round"/><circle cx="187" cy="188" r="4" fill="${p.light}"/><circle cx="213" cy="182" r="4" fill="${p.light}"/>`,
  }),
  jacket: (p) => ({
    outline: "M124 88 L58 134 L36 314 L88 322 L112 216 L112 352 L288 352 L288 216 L312 322 L364 314 L342 134 L276 88 C258 100 232 106 200 106 C168 106 142 100 124 88 Z",
    inside: `${fold("M112 216 C106 170 110 130 124 88", p)}${fold("M288 216 C294 170 290 130 276 88", p)}<path d="M200 108 V352" stroke="${p.darker}" stroke-opacity=".35" stroke-width="3"/><rect x="36" y="300" width="52" height="22" fill="${p.darker}" fill-opacity=".2" transform="rotate(5 60 310)"/><rect x="312" y="300" width="52" height="22" fill="${p.darker}" fill-opacity=".2" transform="rotate(-5 340 310)"/><rect x="112" y="332" width="176" height="20" fill="${p.darker}" fill-opacity=".2"/><path d="M130 250 H168 M232 250 H270" stroke="${p.darker}" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"/>${hi("M132 190 C138 230 138 260 134 300", 0.12, 5)}`,
    details: `<path d="M148 66 C160 92 240 92 252 66 L268 92 C244 118 156 118 132 92 Z" fill="${p.dark}"/><circle cx="200" cy="130" r="4" fill="${p.light}"/><circle cx="200" cy="170" r="4" fill="${p.light}"/><circle cx="200" cy="210" r="4" fill="${p.light}"/><circle cx="200" cy="250" r="4" fill="${p.light}"/>`,
  }),
  trousers: (p) => ({
    outline: "M116 52 L284 52 L298 352 L214 352 L200 150 L186 352 L102 352 Z",
    inside: `<rect x="116" y="52" width="168" height="30" fill="${p.darker}" fill-opacity=".2"/>${fold("M200 82 V150", p, 0.3, 2.5)}${fold("M124 100 C130 200 118 280 112 340", p)}${fold("M276 100 C270 200 282 280 288 340", p)}${hi("M150 90 C156 190 146 260 140 330", 0.1, 6)}<rect x="102" y="332" width="84" height="20" fill="${p.darker}" fill-opacity=".18"/><rect x="214" y="332" width="84" height="20" fill="${p.darker}" fill-opacity=".18"/><path d="M140 110 H180 V170 H140 Z" fill="none" stroke="${p.darker}" stroke-opacity=".3" stroke-width="2.5"/><path d="M220 110 H260 V170 H220 Z" fill="none" stroke="${p.darker}" stroke-opacity=".3" stroke-width="2.5"/>`,
    details: `<path d="M186 60 C194 76 206 76 214 60" fill="none" stroke="${p.light}" stroke-width="3.5" stroke-linecap="round"/>`,
  }),
  shorts: (p) => ({
    outline: "M112 96 L288 96 L310 256 L212 256 L200 174 L188 256 L90 256 Z",
    inside: `<rect x="112" y="96" width="176" height="28" fill="${p.darker}" fill-opacity=".2"/>${fold("M200 124 V174", p, 0.3, 2.5)}${fold("M124 140 C128 190 112 230 102 250", p)}${fold("M276 140 C272 190 288 230 298 250", p)}${hi("M148 130 C152 180 140 220 132 246", 0.1, 6)}`,
    details: `<path d="M188 106 C196 122 204 122 212 106" fill="none" stroke="${p.light}" stroke-width="3.5" stroke-linecap="round"/>`,
  }),
  skirt: (p) => ({
    outline: "M132 88 L268 88 L338 318 C300 332 100 332 62 318 Z",
    inside: `<rect x="132" y="88" width="136" height="24" fill="${p.darker}" fill-opacity=".22"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => fold(`M${140 + i * 17} 112 L${76 + i * 35.5} 322`, p, 0.2, 2.5)).join("")}${[0, 1, 2, 3, 4, 5, 6].map((i) => hi(`M${148 + i * 17} 112 L${86 + i * 35.5} 322`, 0.07, 2)).join("")}`,
  }),
  dress: (p) => ({
    outline: "M152 46 L176 46 C182 86 218 86 224 46 L248 46 L262 154 L340 340 C298 354 102 354 60 340 L138 154 Z",
    inside: `<path d="M138 154 L262 154 L267 176 L133 176 Z" fill="${p.darker}" fill-opacity=".22"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => fold(`M${146 + i * 18} 178 C${140 + i * 20} 250 ${120 + i * 26} 300 ${74 + i * 42} 346`, p, 0.16, 2.5)).join("")}${hi("M190 190 C180 250 160 300 134 346", 0.1, 6)}${fold("M176 46 C176 100 150 130 138 154", p, 0.2, 2.5)}${fold("M224 46 C224 100 250 130 262 154", p, 0.2, 2.5)}`,
    details: `<path d="M176 46 C182 86 218 86 224 46" fill="none" stroke="${p.dark}" stroke-width="6" stroke-linecap="round"/><circle cx="200" cy="165" r="6" fill="${p.accent}"/>`,
  }),
  sneaker: (p) => ({
    behind: `<path d="M50 280 L366 280 L370 292 C372 306 358 314 330 314 L100 314 C72 314 50 308 50 296 Z" fill="${p.sole}"/><path d="M50 296 C50 308 72 314 100 314 L330 314 C358 314 372 306 370 292" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`,
    outline: "M54 288 C48 250 46 210 56 176 C60 160 78 152 96 158 C112 164 122 178 138 178 C150 178 156 160 170 154 C184 150 198 162 208 178 C240 212 300 208 340 236 C360 250 366 270 364 288 Z",
    inside: `<path d="M300 222 C336 230 358 250 364 288 L296 288 C300 266 302 244 300 222 Z" fill="${p.light}" fill-opacity=".38"/><path d="M74 256 C130 236 194 240 252 268" fill="none" stroke="${p.accent}" stroke-width="9" stroke-linecap="round"/><rect x="40" y="272" width="330" height="16" fill="${p.darker}" fill-opacity=".16"/>${hi("M66 200 C70 180 84 170 96 174", 0.25, 3)}${fold("M50 230 C56 250 60 270 62 286", p, 0.14, 3)}`,
    details: `<path d="M138 178 C136 148 156 132 176 138 C192 144 188 164 172 178 Z" fill="${p.light}"/><path d="M138 178 C136 148 156 132 176 138" fill="none" stroke="${p.darker}" stroke-opacity=".22" stroke-width="2"/>${[0, 1, 2, 3].map((i) => `<path d="M${176 + i * 24} ${170 + i * 10} l24 -10" stroke="${p.darker}" stroke-opacity=".35" stroke-width="5.5" stroke-linecap="round"/><path d="M${176 + i * 24} ${170 + i * 10} l24 -10" stroke="${p.light}" stroke-width="3.5" stroke-linecap="round"/>`).join("")}`,
  }),
  boot: (p) => ({
    behind: `<path d="M50 280 L366 280 L370 292 C372 306 358 314 330 314 L100 314 C72 314 50 308 50 296 Z" fill="${p.sole}"/><path d="M50 296 C50 308 72 314 100 314 L330 314 C358 314 372 306 370 292" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="2"/>`,
    outline: "M60 288 L54 78 C54 60 62 50 80 50 L138 50 C154 50 160 60 160 76 L164 172 C202 198 296 202 340 236 C360 252 366 270 364 288 Z",
    inside: `<rect x="54" y="50" width="108" height="30" fill="${p.darker}" fill-opacity=".3"/><path d="M300 224 C336 232 358 252 364 288 L296 288 C300 266 302 246 300 224 Z" fill="${p.light}" fill-opacity=".34"/><rect x="40" y="272" width="330" height="16" fill="${p.darker}" fill-opacity=".16"/>${hi("M66 100 C62 160 64 220 66 260", 0.16, 5)}<path d="M96 88 C130 96 130 190 164 180" fill="none" stroke="${p.accent}" stroke-width="7" stroke-linecap="round"/>`,
    details: `${[0, 1, 2, 3, 4].map((i) => `<path d="M${130 - i * 0} ${96 + i * 22} l26 ${i * 1}" stroke="${p.darker}" stroke-opacity=".35" stroke-width="5.5" stroke-linecap="round"/><path d="M130 ${96 + i * 22} l26 ${i * 1}" stroke="${p.light}" stroke-width="3.5" stroke-linecap="round"/>`).join("")}`,
  }),
  ballerina: (p) => ({
    behind: `<path d="M54 276 L358 276 C358 292 342 300 322 300 L92 300 C68 300 54 292 54 276 Z" fill="${p.sole}"/>`,
    outline: "M58 282 C56 250 74 230 98 232 C118 234 130 250 152 250 C190 250 240 212 300 220 C346 228 366 258 356 282 Z",
    inside: `<path d="M98 232 C118 234 130 250 152 250 C190 250 240 212 300 220" fill="none" stroke="${p.darker}" stroke-opacity=".3" stroke-width="5"/>${hi("M76 256 C96 240 116 244 132 256", 0.22, 3)}<rect x="54" y="268" width="306" height="14" fill="${p.darker}" fill-opacity=".14"/>${hi("M230 236 C270 224 320 232 344 258", 0.16, 4)}`,
    details: `<path d="M252 222 C226 198 214 236 252 236 C290 236 278 198 252 222 Z" fill="${p.accent}"/><circle cx="252" cy="228" r="7" fill="${p.dark}"/>`,
  }),
  cap: (p) => ({
    outline: "M92 226 C92 106 308 106 308 226 Z",
    inside: `${fold("M200 112 C200 160 196 200 194 226", p, 0.22, 2.5)}${fold("M150 122 C160 160 166 200 168 226", p, 0.22, 2.5)}${fold("M250 122 C240 160 234 200 232 226", p, 0.22, 2.5)}${hi("M124 150 C136 128 160 118 186 114", 0.22, 5)}`,
    details: `<path d="M92 222 C170 246 300 244 356 262 C340 278 200 282 96 246 Z" fill="${p.dark}"/><circle cx="200" cy="112" r="9" fill="${p.dark}"/><rect x="96" y="220" width="212" height="8" fill="${p.darker}" fill-opacity=".25"/>`,
  }),
  beanie: (p) => ({
    outline: "M96 252 C96 132 304 132 304 252 Z",
    inside: `${[0, 1, 2, 3, 4, 5].map((i) => fold(`M${150 + i * 20} 138 L${118 + i * 32} 252`, p, 0.16, 2.5)).join("")}${hi("M124 190 C130 160 146 146 170 140", 0.2, 5)}`,
    details: `<rect x="88" y="248" width="224" height="54" rx="14" fill="${p.dark}"/>${Array.from({ length: 14 }, (_, i) => `<path d="M${104 + i * 15} 254 V298" stroke="${p.darker}" stroke-opacity=".32" stroke-width="3"/>`).join("")}<circle cx="200" cy="122" r="30" fill="${p.light}"/><circle cx="192" cy="114" r="10" fill="#fff" fill-opacity=".18"/>`,
  }),
  scarf: (p) => ({
    behind: `<path d="M172 168 L232 168 L256 342 L188 348 Z" fill="${p.dark}"/>${Array.from({ length: 8 }, (_, i) => `<path d="M${190 + i * 8.4} 348 v20" stroke="${p.dark}" stroke-width="3.5" stroke-linecap="round"/>`).join("")}`,
    outline: "M104 118 C104 62 296 62 296 118 C296 162 232 178 200 178 C168 178 104 162 104 118 Z",
    inside: `${[0, 1, 2, 3].map((i) => `<path d="M${112 + i * 50} 70 C${132 + i * 50} 130 ${120 + i * 50} 170 ${140 + i * 50} 180" fill="none" stroke="${p.accent}" stroke-width="9" stroke-opacity=".55"/>`).join("")}${hi("M122 100 C150 78 250 78 278 100", 0.18, 4)}`,
    details: `<path d="M180 168 L240 168 L262 340 L194 346 Z" fill="${p.base}"/><path d="M182 200 H246 M186 244 H252 M190 288 H258" stroke="${p.accent}" stroke-width="10" stroke-opacity=".55"/>${fold("M204 176 C210 230 222 290 230 340", p, 0.16, 2.5)}`,
  }),
  backpack: (p) => ({
    behind: `<path d="M178 64 C178 32 222 32 222 64" fill="none" stroke="${p.dark}" stroke-width="12" stroke-linecap="round"/>`,
    outline: "M122 132 C122 82 156 60 200 60 C244 60 278 82 278 132 L294 322 C294 344 278 354 256 354 L144 354 C122 354 106 344 106 322 Z",
    inside: `<path d="M126 176 C160 150 240 150 274 176" fill="none" stroke="${p.darker}" stroke-opacity=".38" stroke-width="3"/><path d="M136 244 H264 L270 338 H130 Z" fill="${p.darker}" fill-opacity=".18" stroke="${p.darker}" stroke-opacity=".3" stroke-width="2.5"/>${hi("M132 120 C126 200 122 260 128 330", 0.14, 6)}`,
    details: `<rect x="190" y="150" width="20" height="14" rx="4" fill="${p.accent}"/><circle cx="200" cy="270" r="9" fill="${p.accent}"/><path d="M116 190 C86 200 84 300 108 330" fill="none" stroke="${p.dark}" stroke-width="14" stroke-linecap="round"/><path d="M284 190 C314 200 316 300 292 330" fill="none" stroke="${p.dark}" stroke-width="14" stroke-linecap="round"/>`,
  }),
  bottle: (p) => ({
    outline: "M158 118 H242 V332 C242 346 232 354 218 354 H182 C168 354 158 346 158 332 Z",
    inside: `<rect x="158" y="214" width="84" height="56" fill="${p.accent}" fill-opacity=".85"/>${hi("M174 130 V340", 0.28, 7)}<path d="M228 130 V340" stroke="${p.darker}" stroke-opacity=".2" stroke-width="8"/><rect x="158" y="336" width="84" height="18" fill="${p.darker}" fill-opacity=".2"/>`,
    details: `<path d="M172 64 H228 V118 H172 Z" fill="${p.dark}" rx="8"/><path d="M186 46 H214 V64 H186 Z" fill="${p.darker}"/><path d="M176 84 H224" stroke="#fff" stroke-opacity=".18" stroke-width="3"/><circle cx="200" cy="242" r="9" fill="#fff" fill-opacity=".85"/>`,
  }),
  teddy: (p) => ({
    behind: `<circle cx="144" cy="96" r="30" fill="${p.base}"/><circle cx="256" cy="96" r="30" fill="${p.base}"/><circle cx="144" cy="96" r="16" fill="${p.light}" fill-opacity=".6"/><circle cx="256" cy="96" r="16" fill="${p.light}" fill-opacity=".6"/><ellipse cx="112" cy="252" rx="30" ry="56" fill="${p.base}" transform="rotate(24 112 252)"/><ellipse cx="288" cy="252" rx="30" ry="56" fill="${p.base}" transform="rotate(-24 288 252)"/><ellipse cx="152" cy="336" rx="42" ry="34" fill="${p.base}"/><ellipse cx="248" cy="336" rx="42" ry="34" fill="${p.base}"/>`,
    outline: "M200 82 C250 82 274 118 274 156 C274 176 268 190 258 200 C290 216 296 260 284 296 C270 336 130 336 116 296 C104 260 110 216 142 200 C132 190 126 176 126 156 C126 118 150 82 200 82 Z",
    inside: `<ellipse cx="200" cy="268" rx="52" ry="58" fill="${p.light}" fill-opacity=".45"/><ellipse cx="200" cy="178" rx="34" ry="26" fill="${p.light}" fill-opacity=".7"/>${hi("M150 130 C160 110 176 100 194 98", 0.28, 6)}`,
    details: `<circle cx="172" cy="148" r="7" fill="#1a1416"/><circle cx="228" cy="148" r="7" fill="#1a1416"/><ellipse cx="200" cy="172" rx="12" ry="8" fill="#1a1416"/><path d="M200 180 V190 M188 194 C196 200 204 200 212 194" fill="none" stroke="#1a1416" stroke-width="3" stroke-linecap="round"/><circle cx="170" cy="146" r="2.4" fill="#fff"/><circle cx="226" cy="146" r="2.4" fill="#fff"/><path d="M180 218 C196 230 204 230 220 218 L212 240 L200 232 L188 240 Z" fill="${p.accent}"/>`,
  }),
  lunchbox: (p) => ({
    outline: "M88 176 H312 V304 C312 320 302 328 286 328 H114 C98 328 88 320 88 304 Z",
    inside: `<rect x="88" y="176" width="224" height="16" fill="${p.darker}" fill-opacity=".14"/><path d="M200 196 V326" stroke="${p.darker}" stroke-opacity=".18" stroke-width="3"/><path d="M200 262 H312" stroke="${p.darker}" stroke-opacity=".18" stroke-width="3"/>${hi("M104 208 V306", 0.22, 6)}`,
    details: `<path d="M88 176 V156 C88 140 100 130 116 130 H284 C300 130 312 140 312 156 V176 Z" fill="${p.dark}"/><rect x="176" y="164" width="48" height="24" rx="10" fill="${p.accent}"/><path d="M150 130 C150 106 250 106 250 130" fill="none" stroke="${p.darker}" stroke-width="8" stroke-linecap="round"/>${hi("M104 142 H290", 0.2, 3)}`,
  }),
};

export type Colorway = { base: string; accent?: string };

/** Liefert ein SVG-Fragment (0..400 Raum) für die Silhouette in der gewünschten Farbe. */
export function renderShape(shape: ShapeName, id: string, c: Colorway): string {
  const base = c.base;
  const p: P = {
    base, light: shade(base, 0.24), dark: shade(base, -0.22), darker: shade(base, -0.5),
    accent: c.accent ?? (luminance(base) > 0.55 ? shade(base, -0.4) : shade("#DCAFC0", -0.05)),
    sole: luminance(base) > 0.8 ? "#d8cfd1" : "#f1ebe9",
  };
  const d = shapes[shape](p);
  return `<defs>
  <linearGradient id="${id}-g" x1="0.1" y1="0" x2="0.9" y2="1">
    <stop offset="0" stop-color="${shade(base, 0.16)}"/><stop offset="0.5" stop-color="${base}"/><stop offset="1" stop-color="${shade(base, -0.26)}"/>
  </linearGradient>
  <clipPath id="${id}-c"><path d="${d.outline}"/></clipPath>
</defs>
${d.behind ?? ""}
<path d="${d.outline}" fill="url(#${id}-g)"/>
<g clip-path="url(#${id}-c)">${d.inside ?? ""}</g>
<path d="${d.outline}" fill="none" stroke="#fff" stroke-opacity="0.16" stroke-width="1.6"/>
${d.details ?? ""}`;
}
