/**
 * Erzeugt die Seed-Bilder (Produktbilder + Editorial-Szenen) als WebP in public/seed.
 * Aufruf: npm run images
 * Hinweis: Das sind stilisierte Platzhalter – echte Fotos lädt man im Admin (/admin/products) hoch.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { products, type ShapeName } from "../prisma/catalog";
import { renderShape, shade, luminance } from "./shapes";
import { slugify } from "../src/lib/slug";

const OUT = path.resolve("public/seed");

const svg = (w: number, h: number, inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

const defs = `<defs>
  <filter id="ds" x="-30%" y="-30%" width="160%" height="170%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="16"/><feOffset dy="22" result="b"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.38"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="soft" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="5000" height="4000"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="soft2" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="5000" height="4000"><feGaussianBlur stdDeviation="90"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix in="n" type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer>
  </filter>
</defs>`;

const grain = (w: number, h: number) => `<rect width="${w}" height="${h}" filter="url(#grain)"/>`;

let uid = 0;
/** Silhouette platzieren: Mittelpunkt, Größe (Breite in px), Rotation, mit Schlagschatten */
function place(shape: ShapeName, base: string, cx: number, cy: number, size: number, rot = 0, accent?: string, shadow = true) {
  const id = `s${uid++}`;
  const s = size / 400;
  return `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${s}) translate(-200 -200)" ${shadow ? 'filter="url(#ds)"' : ""}>${renderShape(shape, id, { base, accent })}</g>`;
}

const floor = (cx: number, y: number, rx: number, o = 0.28) =>
  `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${rx * 0.07}" fill="#000" fill-opacity="${o}" filter="url(#soft)"/>`;

async function write(file: string, markup: string, opts: { w: number; h: number; q?: number; alpha?: boolean }) {
  const full = path.join(OUT, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await sharp(Buffer.from(markup), { density: 96 })
    .resize(opts.w, opts.h)
    .webp({ quality: opts.q ?? 82, alphaQuality: 90, effort: 4 })
    .toFile(full);
}

// ───────────────────────── Produktbilder ─────────────────────────

async function productImages() {
  const W = 960, H = 1200;
  for (const p of products) {
    for (const c of p.colors) {
      const cs = slugify(c.name);
      const lum = luminance(c.hex);
      const isAcc = ["bottle", "lunchbox", "cap", "beanie", "teddy", "scarf", "backpack"].includes(p.shape);
      const size = isAcc ? 700 : p.shape.match(/sneaker|boot|ballerina/) ? 780 : 800;
      const cy = p.shape.match(/sneaker|boot|ballerina/) ? 610 : 600;
      const accent = p.category === "junge" ? shade("#743B57", 0.05) : "#A95D7C";

      // Shot A – heller Studio-Hintergrund
      const a = svg(W, H, `${defs}
        <defs><linearGradient id="bgA" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#f3e9ee"/><stop offset="1" stop-color="#dcc7d1"/></linearGradient>
        <radialGradient id="glowA" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#bgA)"/><rect width="${W}" height="${H}" fill="url(#glowA)"/>
        ${floor(W / 2, cy + size * 0.42, size * 0.42)}
        ${place(p.shape, c.hex, W / 2, cy, size, 0, accent)}
        ${grain(W, H)}`);
      await write(`p/${p.slug}-${cs}-1.webp`, a, { w: W, h: H });

      // Shot B – Detail/Stimmung: dunkle Bühne (bei dunklen Produkten mittleres Rosé)
      const dark = lum < 0.3;
      const [b1, b2, glow] = dark ? ["#8d5872", "#4b2237", "#dcafc0"] : ["#33202c", "#151015", "#a95d7c"];
      const rot = (Math.round(Math.abs(uid) % 2) ? 1 : -1) * 7;
      const b = svg(W, H, `${defs}
        <defs><linearGradient id="bgB" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${b1}"/><stop offset="1" stop-color="${b2}"/></linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#bgB)"/>
        <circle cx="${W * 0.64}" cy="${H * 0.36}" r="${W * 0.42}" fill="${glow}" fill-opacity="${dark ? 0.28 : 0.32}" filter="url(#soft2)"/>
        <circle cx="${W * 0.5}" cy="${H * 0.5}" r="${W * 0.36}" fill="none" stroke="#fff" stroke-opacity="0.1" stroke-width="2"/>
        ${floor(W / 2, cy + size * 0.5, size * 0.5, 0.45)}
        ${place(p.shape, c.hex, W / 2 + 10, cy + 20, size * 1.18, rot, accent)}
        ${grain(W, H)}`);
      await write(`p/${p.slug}-${cs}-2.webp`, b, { w: W, h: H });
    }
    console.log("✓", p.slug);
  }
}

// ───────────────────────── Editorial ─────────────────────────

const arch = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h} Z`;

async function editorial() {
  // Hero
  {
    const W = 2400, H = 1600;
    const bg = svg(W, H, `${defs}
      <defs><linearGradient id="hb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B090B"/><stop offset="0.55" stop-color="#1b0f17"/><stop offset="1" stop-color="#2b1622"/></linearGradient>
      <linearGradient id="arc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#743B57"/><stop offset="1" stop-color="#241620"/></linearGradient>
      <linearGradient id="arc2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A95D7C" stop-opacity="0.55"/><stop offset="1" stop-color="#4B2237" stop-opacity="0.2"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#hb)"/>
      <circle cx="1650" cy="620" r="720" fill="#A95D7C" fill-opacity="0.34" filter="url(#soft2)"/>
      <path d="${arch(1180, 230, 780, 1400)}" fill="url(#arc)" fill-opacity="0.92"/>
      <path d="${arch(1290, 340, 560, 1300)}" fill="url(#arc2)"/>
      <circle cx="1570" cy="800" r="520" fill="none" stroke="#DCAFC0" stroke-opacity="0.18" stroke-width="2"/>
      <circle cx="1570" cy="800" r="640" fill="none" stroke="#DCAFC0" stroke-opacity="0.09" stroke-width="2"/>
      <circle cx="380" cy="1380" r="300" fill="#4B2237" fill-opacity="0.55" filter="url(#soft2)"/>
      ${grain(W, H)}`);
    await write("e/hero-bg.webp", bg, { w: W, h: H, q: 80 });
    const cut = async (name: string, shape: ShapeName, color: string, rot: number) =>
      write(`e/${name}.webp`, svg(1100, 1100, `${defs}${place(shape, color, 550, 540, 900, rot, "#A95D7C")}`), { w: 1100, h: 1100, q: 88 });
    await cut("hero-dress", "dress", "#e3bccb", -4);
    await cut("hero-hoodie", "hoodie", "#cdbca8", 6);
    await cut("hero-sneaker", "sneaker", "#f2edeb", -8);
    console.log("✓ hero");
  }

  // Kategorie-Szenen (Hintergrund + Cutout)
  const cats: { key: string; bg: [string, string]; glow: string; main: [ShapeName, string, number]; extra: [ShapeName, string, number, number, number, number][] }[] = [
    { key: "junge", bg: ["#1d1420", "#3a2030"], glow: "#743B57", main: ["hoodie", "#cdbca8", -5],
      extra: [["trousers", "#332e31", 300, 1130, 460, 8], ["cap", "#28324d", 1080, 1240, 330, -10]] },
    { key: "maedchen", bg: ["#a95d7c", "#4b2237"], glow: "#dcafc0", main: ["dress", "#f2e6ec", 4],
      extra: [["skirt", "#241620", 1090, 1180, 420, -8], ["jacket", "#eadfd3", 260, 1230, 380, 9]] },
    { key: "schuhe", bg: ["#241620", "#4b2237"], glow: "#a95d7c", main: ["sneaker", "#f2edeb", -12],
      extra: [["boot", "#57505a", 1030, 1200, 420, 9], ["ballerina", "#e3bccb", 330, 1250, 360, -6]] },
    { key: "dies", bg: ["#4b2237", "#151015"], glow: "#dcafc0", main: ["backpack", "#71829c", 5],
      extra: [["teddy", "#cdbca8", 1060, 1180, 380, -6], ["bottle", "#c98aa3", 330, 1220, 300, 8]] },
  ];
  for (const c of cats) {
    const W = 1400, H = 1750;
    const bg = svg(W, H, `${defs}
      <defs><linearGradient id="cb" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#cb)"/>
      <circle cx="${W * 0.62}" cy="${H * 0.36}" r="560" fill="${c.glow}" fill-opacity="0.32" filter="url(#soft2)"/>
      <path d="${arch(230, 250, 940, 1500)}" fill="#fff" fill-opacity="0.07"/>
      <path d="${arch(330, 350, 740, 1400)}" fill="#000" fill-opacity="0.16"/>
      <circle cx="${W / 2}" cy="${H * 0.46}" r="520" fill="none" stroke="#fff" stroke-opacity="0.12" stroke-width="2"/>
      ${c.extra.map(([s, col, x, y, sz, r]) => place(s, col, x, y, sz, r, "#A95D7C")).join("")}
      ${grain(W, H)}`);
    await write(`e/cat-${c.key}.webp`, bg, { w: W, h: H, q: 80 });
    const [s, col, r] = c.main;
    await write(`e/cat-${c.key}-cut.webp`, svg(1200, 1200, `${defs}${place(s, col, 600, 590, 1000, r, "#A95D7C")}`), { w: 1200, h: 1200, q: 88 });
    console.log("✓ cat", c.key);
  }

  // Story-Cutouts (Sticky-Editorial)
  const story: [string, ShapeName, string, number][] = [
    ["story-1", "hoodie", "#cdbca8", -4], ["story-2", "tee", "#f2edeb", 3], ["story-3", "sneaker", "#e3bccb", -10], ["story-4", "dress", "#c98aa3", 3],
  ];
  for (const [n, s, col, r] of story)
    await write(`e/${n}.webp`, svg(1300, 1300, `${defs}${place(s, col, 650, 640, 1080, r, "#DCAFC0")}`), { w: 1300, h: 1300, q: 88 });
  console.log("✓ story");

  // Kampagne – „Kleiderstange“
  {
    const W = 2400, H = 1400;
    const items: [ShapeName, string, number][] = [
      ["hoodie", "#cdbca8", 340], ["dress", "#e3bccb", 780], ["jacket", "#28324d", 1220], ["tee", "#f2edeb", 1660], ["skirt", "#6e2b45", 2080],
    ];
    const hang = items.map(([s, col, x], i) => {
      const y = 640 + (i % 2) * 16;
      return `<g><path d="M${x} 250 C${x} 226 ${x + 34} 224 ${x + 34} 244" fill="none" stroke="#dcafc0" stroke-opacity="0.8" stroke-width="5" stroke-linecap="round"/>
        <path d="M${x - 130} 405 L${x} 262 L${x + 130} 405" fill="none" stroke="#dcafc0" stroke-opacity="0.6" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
        ${place(s, col, x, y, 520, (i - 2) * 1.4, "#A95D7C")}</g>`;
    }).join("");
    const m = svg(W, H, `${defs}
      <defs><linearGradient id="kb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#743B57"/><stop offset="0.5" stop-color="#4B2237"/><stop offset="1" stop-color="#151015"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#kb)"/>
      <circle cx="1900" cy="300" r="620" fill="#dcafc0" fill-opacity="0.22" filter="url(#soft2)"/>
      <circle cx="400" cy="1200" r="500" fill="#0B090B" fill-opacity="0.4" filter="url(#soft2)"/>
      <rect x="120" y="236" width="2160" height="8" rx="4" fill="#dcafc0" fill-opacity="0.6"/>
      ${hang}${grain(W, H)}`);
    await write("e/campaign.webp", m, { w: W, h: H, q: 78 });
    console.log("✓ campaign");
  }

  // Split-Bild
  {
    const W = 1200, H = 1500;
    const m = svg(W, H, `${defs}
      <defs><linearGradient id="sb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0e3e9"/><stop offset="1" stop-color="#d4b8c5"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sb)"/>
      <path d="${arch(170, 180, 860, 1400)}" fill="#4B2237" fill-opacity="0.92"/>
      <path d="${arch(250, 260, 700, 1300)}" fill="#743B57" fill-opacity="0.55"/>
      <circle cx="820" cy="420" r="260" fill="#dcafc0" fill-opacity="0.35" filter="url(#soft2)"/>
      ${floor(600, 1210, 360, 0.4)}
      ${place("backpack", "#71829c", 480, 760, 620, -6, "#DCAFC0")}
      ${place("sneaker", "#f2edeb", 700, 1130, 620, -8, "#A95D7C")}
      ${place("cap", "#cdbca8", 880, 560, 300, 12, "#A95D7C")}
      ${grain(W, H)}`);
    await write("e/split.webp", m, { w: W, h: H, q: 80 });
    console.log("✓ split");
  }

  // Open-Graph (ohne Text, damit keine Systemschrift nötig ist)
  {
    const W = 1200, H = 630;
    const m = svg(W, H, `${defs}
      <rect width="${W}" height="${H}" fill="#0B090B"/>
      <circle cx="820" cy="260" r="360" fill="#A95D7C" fill-opacity="0.4" filter="url(#soft2)"/>
      <path d="${arch(640, 60, 420, 700)}" fill="#4B2237"/>
      ${place("hoodie", "#cdbca8", 760, 340, 460, 5, "#A95D7C")}
      ${place("sneaker", "#f2edeb", 990, 470, 300, -8, "#A95D7C")}
      <text x="80" y="330" font-family="Helvetica, Arial, sans-serif" font-size="120" font-weight="700" letter-spacing="14" fill="#F6EEF2">LUMI</text>
      ${grain(W, H)}`);
    await sharp(Buffer.from(m), { density: 96 }).resize(W, H).jpeg({ quality: 84 }).toFile(path.join(OUT, "og.jpg"));
  }
}

async function main() {
  const only = process.argv[2];
  await fs.mkdir(OUT, { recursive: true });
  if (only !== "products") await editorial();
  if (only !== "editorial") await productImages();
  console.log("Fertig →", OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
