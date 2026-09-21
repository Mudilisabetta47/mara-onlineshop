/**
 * Erzeugt das Logo „Lilli und Lou“ als Vektor (Buchstaben → Pfade, keine Schrift zur Laufzeit nötig):
 *   src/components/brand/logo-data.ts   (für die React-Komponente)
 *   public/brand/logo.svg · logo-on-light.svg · logo-mark.svg
 *   src/app/icon.svg · src/app/apple-icon.png
 * Aufruf: node scripts/generate-logo.mjs   (Schrift: Fraunces aus @fontsource/fraunces, SIL OFL)
 */
import fs from "node:fs";
import opentype from "opentype.js";
import sharp from "sharp";

const F = "node_modules/@fontsource/fraunces/files/";
const load = (f) => { const b = fs.readFileSync(F + f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const bold = load("fraunces-latin-600-normal.woff");
const light = load("fraunces-latin-300-italic.woff");

const SIZE = 100;
const t1 = "Lilli", t2 = "und", t3 = "Lou";
const s2 = SIZE * 0.66;                       // „und“ kleiner, kursiv, leicht
const gap = SIZE * 0.2;

/** Glyph für Glyph setzen (mit Kerning, ohne Ligaturen/Substitutionen → exakt vorhersehbares Schriftbild). */
function layout(font, text, size, x0) {
  const path = new opentype.Path();
  const scale = size / font.unitsPerEm;
  let x = x0;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    path.extend(g.getPath(x, 0, size));
    x += g.advanceWidth * scale;
    if (glyphs[i + 1]) x += font.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { path, width: x - x0 };
}
const a = layout(bold, t1, SIZE, 0);
const w1 = a.width;
const x2 = w1 + gap;
const b = layout(light, t2, s2, x2);
const x3 = x2 + b.width + gap;
const c = layout(bold, t3, SIZE, x3);
const p1 = a.path, p2 = b.path, p3 = c.path;
/** Eigener Pfad-Serialisierer (der von opentype.js erzeugt bei manchen Glyphen „NaN“). Wirft bei ungültigen Zahlen. */
const n = (v) => { if (!Number.isFinite(v)) throw new Error("ungültige Koordinate im Glyph-Pfad"); return +v.toFixed(2); };
const d = (p) => p.commands.map((c) => {
  switch (c.type) {
    case "M": case "L": return `${c.type}${n(c.x)} ${n(c.y)}`;
    case "Q": return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    case "C": return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    case "Z": return "Z";
    default: throw new Error("unbekanntes Pfad-Kommando " + c.type);
  }
}).join("");
const boxes = [p1, p2, p3].map((p) => p.getBoundingBox());
const minX = Math.min(...boxes.map((b) => b.x1)), maxX = Math.max(...boxes.map((b) => b.x2));
const minY = Math.min(...boxes.map((b) => b.y1)), maxY = Math.max(...boxes.map((b) => b.y2));
const wm = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

const C = { cream: "#F6EEF2", rose300: "#DCAFC0", rose500: "#A95D7C", plum700: "#743B57", plum900: "#241620", ink: "#0B090B" };

// Zeichen: zwei Kreise = Lilli & Lou – die Schnittmenge (Linse) ist das „Zusammen“
const mark = (id = "m", right = C.cream, lens = C.plum700) => `<defs>
  <linearGradient id="${id}g" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#EBC9D6"/><stop offset="1" stop-color="${C.rose500}"/></linearGradient>
  <clipPath id="${id}c"><circle cx="22" cy="32" r="18"/></clipPath>
</defs>
<circle cx="22" cy="32" r="18" fill="url(#${id}g)"/>
<circle cx="42" cy="32" r="18" fill="${right}"/>
<circle cx="42" cy="32" r="18" fill="${lens}" clip-path="url(#${id}c)"/>`;

// Lockup: Zeichen links, Wortmarke rechts, vertikal zentriert
const MARK = 64;                                  // Zeichen-Koordinatenraum 0..64 (belegt x 4..60, y 13..51)
const markScale = (wm.h * 1.3) / 36;             // Zeichen-Höhe ≈ 1,28 × Wortmarken-Höhe
const markW = 56 * markScale, markH = 36 * markScale;
const pad = wm.h * 0.28;
const totalW = markW + pad + wm.w, totalH = Math.max(markH, wm.h);
const mx = 0, my = (totalH - markH) / 2;
const wx = markW + pad - wm.x, wy = (totalH - wm.h) / 2 - wm.y;
const lockup = (text, und, right = C.cream, lens = C.plum700) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(1)} ${totalH.toFixed(1)}" role="img" aria-label="Lilli und Lou">
  <g transform="translate(${(mx - 4 * markScale).toFixed(2)} ${(my - 14 * markScale).toFixed(2)}) scale(${markScale.toFixed(4)})">${mark("l", right, lens)}</g>
  <g transform="translate(${wx.toFixed(2)} ${wy.toFixed(2)})"><path d="${d(p1)}" fill="${text}"/><path d="${d(p2)}" fill="${und}"/><path d="${d(p3)}" fill="${text}"/></g>
</svg>`;

fs.writeFileSync("public/brand/logo.svg", lockup(C.cream, C.rose300));
fs.writeFileSync("public/brand/logo-on-light.svg", lockup(C.plum900, C.rose500, C.plum900, "#4B2237"));
fs.writeFileSync("public/brand/logo-mark.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Lilli und Lou">${mark("k")}</svg>`);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${C.ink}"/><g transform="translate(6.4 6.4) scale(0.8)">${mark("i")}</g></svg>`;
fs.writeFileSync("src/app/icon.svg", icon);
await sharp(Buffer.from(icon.replace('rx="15"', 'rx="0"')), { density: 300 }).resize(180, 180).png().toFile("src/app/apple-icon.png");

fs.writeFileSync("src/components/brand/logo-data.ts", `/* Automatisch erzeugt von scripts/generate-logo.mjs – nicht von Hand ändern. */
export const LOGO = {
  wordmark: { lilli: ${JSON.stringify(d(p1))}, und: ${JSON.stringify(d(p2))}, lou: ${JSON.stringify(d(p3))}, box: ${JSON.stringify({ x: +wm.x.toFixed(2), y: +wm.y.toFixed(2), w: +wm.w.toFixed(2), h: +wm.h.toFixed(2) })} },
  lockup: { w: ${totalW.toFixed(1)}, h: ${totalH.toFixed(1)}, markScale: ${markScale.toFixed(4)}, markX: ${(mx - 4 * markScale).toFixed(2)}, markY: ${(my - 14 * markScale).toFixed(2)}, wordX: ${wx.toFixed(2)}, wordY: ${wy.toFixed(2)} },
} as const;
`);
// Vorschau (dunkel + hell) zur Sichtprüfung
const dark = await sharp(Buffer.from(lockup(C.cream, C.rose300)), { density: 600 }).resize({ width: 1100 }).png().toBuffer();
const lightImg = await sharp(Buffer.from(lockup(C.plum900, C.rose500, C.plum900, "#4B2237")), { density: 600 }).resize({ width: 1100 }).png().toBuffer();
const markPng = await sharp(Buffer.from(icon), { density: 600 }).resize(300, 300).png().toBuffer();
await sharp({ create: { width: 1500, height: 560, channels: 4, background: C.ink } })
  .composite([{ input: dark, top: 70, left: 60 }, { input: await sharp({ create: { width: 1100, height: 190, channels: 4, background: "#F6EEF2" } }).png().toBuffer(), top: 330, left: 60 }, { input: lightImg, top: 350, left: 60 }, { input: markPng, top: 130, left: 1180 }])
  .png().toFile(process.argv[2] || "logo-preview.png");
console.log("✓ Logo erzeugt", { totalW: +totalW.toFixed(1), totalH: +totalH.toFixed(1) });
