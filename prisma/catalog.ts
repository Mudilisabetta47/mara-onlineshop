/**
 * Seed-Katalog. Wird von `prisma/seed.ts` (Datenbank) und `scripts/generate-images.ts` (Bilder) gemeinsam genutzt.
 * Preise in Cent (Brutto).
 */
export type ShapeName =
  | "tee" | "hoodie" | "jacket" | "trousers" | "shorts" | "skirt" | "dress"
  | "sneaker" | "boot" | "ballerina" | "cap" | "beanie" | "scarf" | "backpack" | "bottle" | "teddy" | "lunchbox";

export type CatalogColor = { name: string; hex: string };
export type CatalogProduct = {
  slug: string;
  name: string;
  short: string;
  description: string;
  material: string;
  category: "junge" | "maedchen" | "schuhe" | "dies-und-das";
  brand: "lilli-und-lou" | "nordkind" | "atelier-petit" | "sole-co";
  shape: ShapeName;
  price: number;
  sale?: number;
  sku: string;
  weight: number;
  featured?: boolean;
  ageDays: number; // Alter des Produkts (für „Neu“)
  sold: number;
  colors: CatalogColor[];
  sizes: string[];
  /** Bestandsvorgaben je Größe (sonst deterministisch abgeleitet) */
  stock?: Record<string, number>;
  /** Wenn true: keine Größen (One Size) */
  oneSize?: boolean;
};

const C = {
  anthrazit: { name: "Anthrazit", hex: "#332e31" },
  graphit: { name: "Graphit", hex: "#57505a" },
  schwarz: { name: "Schwarz", hex: "#1a1618" },
  sand: { name: "Sand", hex: "#cdbca8" },
  creme: { name: "Creme", hex: "#eadfd3" },
  weiss: { name: "Weiß", hex: "#f2edeb" },
  bordeaux: { name: "Bordeaux", hex: "#6e2b45" },
  rose: { name: "Altrosa", hex: "#c98aa3" },
  puder: { name: "Puder", hex: "#e3bccb" },
  salbei: { name: "Salbei", hex: "#8a9b8b" },
  nacht: { name: "Nachtblau", hex: "#28324d" },
  rauch: { name: "Rauchblau", hex: "#71829c" },
  terra: { name: "Terracotta", hex: "#b26b56" },
  flieder: { name: "Flieder", hex: "#8d6f9c" },
} satisfies Record<string, CatalogColor>;

const KIDS = ["92", "98", "104", "110", "116", "122", "128"];
const KIDS_BIG = ["104", "110", "116", "122", "128", "134", "140"];
const SHOES = ["24", "26", "28", "30", "32", "34"];

export { brands, categories } from "./seed/base-data";

export const products: CatalogProduct[] = [
  // ───────── Junge ─────────
  {
    slug: "hoodie-nordlicht", name: "Oversize Hoodie „Nordlicht“", category: "junge", brand: "lilli-und-lou", shape: "hoodie",
    short: "Weicher Sweat-Hoodie mit lockerer Passform und Kängurutasche.",
    description: "Der Hoodie, den man nicht mehr ausziehen will: innen aufgeraut und kuschelig, außen glatt und formstabil. Die lockere Oversize-Passform lässt Platz zum Wachsen, die Kordel im Kapuzensaum ist flach vernäht und damit spieltauglich.",
    material: "80 % Bio-Baumwolle, 20 % recyceltes Polyester · 320 g/m²", price: 4990, sku: "LU-HOOD-001", weight: 480,
    featured: true, ageDays: 12, sold: 84, colors: [C.anthrazit, C.sand, C.bordeaux], sizes: KIDS,
  },
  {
    slug: "basic-tee-everyday", name: "Basic Tee „Everyday“", category: "junge", brand: "lilli-und-lou", shape: "tee",
    short: "Das perfekte T-Shirt in gedeckten Farben – aus Bio-Baumwolle.",
    description: "Ein ehrliches Basic: dichter Single Jersey, sauber verarbeiteter Rundhals und ein Schnitt, der auch nach vielen Wäschen sitzt. Lässt sich mit allem kombinieren.",
    material: "100 % Bio-Baumwolle", price: 1990, sku: "LU-TEE-001", weight: 140,
    ageDays: 90, sold: 212, colors: [C.weiss, C.graphit, C.salbei], sizes: KIDS,
  },
  {
    slug: "cargo-jogger-trail", name: "Cargo Jogger „Trail“", category: "junge", brand: "nordkind", shape: "trousers",
    short: "Bequeme Jogger mit Seitentaschen und Bündchen – robust im Alltag.",
    description: "Elastischer Bund, Beinabschluss mit Bündchen und aufgesetzte Cargotaschen mit Druckknopf. Aus widerstandsfähigem Twill, der Sandkasten und Klettergerüst nichts übel nimmt.",
    material: "97 % Baumwolle, 3 % Elasthan · Twill", price: 4490, sku: "NK-JOG-002", weight: 360,
    ageDays: 30, sold: 96, colors: [C.schwarz, C.sand], sizes: KIDS_BIG,
  },
  {
    slug: "bomber-jacke-storm", name: "Bomberjacke „Storm“", category: "junge", brand: "nordkind", shape: "jacket",
    short: "Leichte, wasserabweisende Übergangsjacke mit Rippbündchen.",
    description: "Wasserabweisende Oberfläche, weiches Futter und Reißverschluss mit Kinnschutz. Perfekt für Frühling und Herbst – und schnell in den Rucksack gestopft.",
    material: "Außen: 100 % Polyamid, wasserabweisend · Futter: 100 % Polyester", price: 7990, sale: 5590, sku: "NK-BOM-003", weight: 520,
    ageDays: 150, sold: 61, colors: [C.nacht, C.terra], sizes: KIDS_BIG,
    stock: { "104": 0, "110": 2 },
  },
  {
    slug: "leinen-shorts-sommer", name: "Leinen-Shorts „Sommer“", category: "junge", brand: "atelier-petit", shape: "shorts",
    short: "Luftige Shorts aus Leinenmix mit Gummizug.",
    description: "Leicht, atmungsaktiv und angenehm auf der Haut: Der Leinenmix knittert sympathisch und wird mit jeder Wäsche weicher. Verstellbarer Gummizug mit Kordel.",
    material: "55 % Leinen, 45 % Baumwolle", price: 2990, sale: 2090, sku: "AP-SHO-004", weight: 170,
    ageDays: 200, sold: 44, colors: [C.creme, C.rauch], sizes: KIDS,
  },
  {
    slug: "strick-pullover-fjord", name: "Strickpullover „Fjord“", category: "junge", brand: "nordkind", shape: "jacket",
    short: "Grobstrick-Pullover aus Merino-Mix – warm, weich, kratzfrei.",
    description: "Der Pullover für kalte Tage: dicht gestrickt, angenehm warm und ohne Kratzen dank Merino-Baumwoll-Mix. Maschinenwaschbar im Wollprogramm.",
    material: "50 % Baumwolle, 30 % Merinowolle, 20 % Polyamid", price: 5490, sku: "NK-PUL-005", weight: 340,
    ageDays: 6, sold: 18, colors: [C.creme, C.graphit], sizes: KIDS_BIG,
  },

  // ───────── Mädchen ─────────
  {
    slug: "sommerkleid-lina", name: "Sommerkleid „Lina“", category: "maedchen", brand: "atelier-petit", shape: "dress",
    short: "Leichtes Kleid mit weitem Rock und Taillenband.",
    description: "Ein Kleid für Sonntage, Feste und ganz normale Dienstage. Der weite, luftige Rock schwingt beim Drehen, das Taillenband sitzt bequem. Rückenreißverschluss mit Haken-Verschluss.",
    material: "100 % Bio-Baumwolle, Voile · Futter: 100 % Baumwolle", price: 5990, sku: "AP-DRE-001", weight: 230,
    featured: true, ageDays: 9, sold: 101, colors: [C.puder, C.bordeaux, C.salbei], sizes: KIDS,
  },
  {
    slug: "plisseerock-aurora", name: "Plisseerock „Aurora“", category: "maedchen", brand: "atelier-petit", shape: "skirt",
    short: "Fließender Plisseerock mit elastischem Bund.",
    description: "Feine, dauerhafte Plissees, ein bequemer Gummibund und ein Innenfutter, das nicht rutscht. Wunderbar zu Sneakern und zu Ballerinas.",
    material: "100 % recyceltes Polyester, Plissee", price: 3990, sku: "AP-SKI-002", weight: 190,
    ageDays: 40, sold: 58, colors: [C.rose, C.schwarz], sizes: KIDS,
  },
  {
    slug: "cropped-hoodie-luna", name: "Cropped Hoodie „Luna“", category: "maedchen", brand: "lilli-und-lou", shape: "hoodie",
    short: "Kurzer Hoodie mit weichem Innenfleece.",
    description: "Kastiger Schnitt, kurze Länge und ein besonders weicher Innenfleece – der Hoodie für Mädchen, die es lässig mögen. Mit verdeckter Tasche.",
    material: "80 % Bio-Baumwolle, 20 % recyceltes Polyester", price: 4690, sku: "LU-HOOD-002", weight: 400,
    ageDays: 20, sold: 73, colors: [C.puder, C.graphit], sizes: KIDS_BIG,
  },
  {
    slug: "strickjacke-marie", name: "Strickjacke „Marie“", category: "maedchen", brand: "atelier-petit", shape: "jacket",
    short: "Feine Strickjacke mit Perlmuttknöpfen.",
    description: "Ein Klassiker mit modernem Twist: feiner Rippstrick, Perlmuttknöpfe und ein leicht kastiger Schnitt. Passt zum Kleid genauso wie zur Jeans.",
    material: "60 % Baumwolle, 40 % Viskose", price: 5290, sale: 3990, sku: "AP-CAR-003", weight: 260,
    ageDays: 120, sold: 39, colors: [C.creme, C.flieder], sizes: KIDS,
  },
  {
    slug: "leggings-soft-touch", name: "Leggings „Soft Touch“", category: "maedchen", brand: "lilli-und-lou", shape: "trousers",
    short: "Elastische Leggings mit hohem Bund – Doppelpack-Qualität.",
    description: "Dehnbar, formstabil und blickdicht. Der hohe, flache Bund rutscht nicht und drückt nicht. Flache Nähte vermeiden Scheuerstellen.",
    material: "95 % Bio-Baumwolle, 5 % Elasthan", price: 2490, sku: "LU-LEG-003", weight: 150,
    ageDays: 75, sold: 133, colors: [C.schwarz, C.bordeaux, C.nacht], sizes: KIDS,
  },
  {
    slug: "ruschen-shirt-mila", name: "Rüschen-Shirt „Mila“", category: "maedchen", brand: "atelier-petit", shape: "tee",
    short: "Shirt mit feinen Rüschenärmeln aus Bio-Jersey.",
    description: "Weich fallender Jersey und kleine, saubere Rüschen an den Ärmeln: ein Shirt, das dressy aussieht und sich anfühlt wie ein Pyjama.",
    material: "95 % Bio-Baumwolle, 5 % Elasthan", price: 2290, sku: "AP-TEE-004", weight: 130,
    ageDays: 5, sold: 12, colors: [C.weiss, C.rose], sizes: KIDS,
  },

  // ───────── Schuhe ─────────
  {
    slug: "sneaker-cloud-low", name: "Sneaker „Cloud Low“", category: "schuhe", brand: "sole-co", shape: "sneaker",
    short: "Federleichte Low-Top-Sneaker mit flexibler Sohle.",
    description: "Ein Schuh, der sich anfühlt wie Barfußlaufen mit Halt: flexible EVA-Sohle, atmungsaktives Mesh und eine herausnehmbare Einlage. Mit Klettverschluss für schnelle Morgen.",
    material: "Obermaterial: Textil · Futter: Textil · Sohle: EVA", price: 5490, sku: "SC-SNK-001", weight: 240,
    featured: true, ageDays: 14, sold: 156, colors: [C.weiss, C.puder, C.graphit], sizes: SHOES,
  },
  {
    slug: "high-top-city", name: "High-Top „City“", category: "schuhe", brand: "sole-co", shape: "boot",
    short: "Knöchelhoher Sneaker aus weichem Leder.",
    description: "Weiches, pflegeleichtes Leder, gepolsterter Schaft und Reißverschluss an der Seite: Anziehen geht ohne Schnüren, der Look bleibt klassisch.",
    material: "Obermaterial: Rindleder · Futter: Textil · Sohle: Gummi", price: 6990, sku: "SC-HIT-002", weight: 300,
    ageDays: 60, sold: 88, colors: [C.schwarz, C.sand], sizes: SHOES, stock: { "24": 4, "26": 2, "28": 8, "30": 0 },
  },
  {
    slug: "winterboot-snow", name: "Winterboot „Snow“", category: "schuhe", brand: "nordkind", shape: "boot",
    short: "Warm gefütterter, wasserdichter Boot für kalte Wintertage.",
    description: "Wasserdichte Membran, warmes Teddyfutter und eine griffige Profilsohle: Der Winterboot hält Füße auch bei Schnee und Pfützen trocken und warm.",
    material: "Obermaterial: Textil/Synthetik, wasserdicht · Futter: Teddyfleece · Sohle: Gummi", price: 7990, sale: 5990, sku: "NK-BOO-003", weight: 420,
    ageDays: 170, sold: 47, colors: [C.nacht, C.bordeaux], sizes: SHOES, stock: { "32": 1, "34": 0 },
  },
  {
    slug: "ballerina-satin", name: "Ballerina „Satin“", category: "schuhe", brand: "atelier-petit", shape: "ballerina",
    short: "Weiche Ballerinas mit Gummizug und Schleife.",
    description: "Feiner Satin-Look, weiche Innensohle und ein rutschfester Boden. Der Gummizug am Fersenrand sorgt für sicheren Halt.",
    material: "Obermaterial: Textil · Futter: Leder · Sohle: Gummi", price: 3990, sku: "AP-BAL-004", weight: 130,
    ageDays: 25, sold: 41, colors: [C.puder, C.schwarz], sizes: SHOES,
  },
  {
    slug: "sneaker-street-mid", name: "Sneaker „Street Mid“", category: "schuhe", brand: "sole-co", shape: "sneaker",
    short: "Robuster Alltags-Sneaker mit verstärkter Zehenkappe.",
    description: "Verstärkte Zehenkappe, Schnürung mit Gummiband und ein Profil, das auch auf nassem Pflaster hält. Der Schuh für Schulweg und Pausenhof.",
    material: "Obermaterial: Canvas · Futter: Textil · Sohle: Gummi", price: 4990, sale: 3990, sku: "SC-STR-005", weight: 270,
    ageDays: 100, sold: 69, colors: [C.nacht, C.terra], sizes: SHOES,
  },

  // ───────── Dies & Das ─────────
  {
    slug: "rucksack-explorer", name: "Rucksack „Explorer“", category: "dies-und-das", brand: "nordkind", shape: "backpack",
    short: "Leichter Kinderrucksack mit Brustgurt und Reflektoren.",
    description: "12 Liter Volumen, gepolsterter Rücken, verstellbarer Brustgurt und reflektierende Elemente. Genau richtig für Kita, Ausflug und den ersten Schultag.",
    material: "100 % recyceltes Polyester, imprägniert", price: 3990, sku: "NK-BAG-001", weight: 380,
    oneSize: true, featured: true, ageDays: 18, sold: 92, colors: [C.nacht, C.terra, C.salbei], sizes: [],
  },
  {
    slug: "trinkflasche-edelstahl", name: "Trinkflasche „Aqua“ 400 ml", category: "dies-und-das", brand: "lilli-und-lou", shape: "bottle",
    short: "Doppelwandige Edelstahl-Flasche – hält Getränke lange kühl.",
    description: "Auslaufsicherer Deckel, spülmaschinenfest. Die Flasche passt in die meisten Rucksack-Seitenfächer.",
    material: "Edelstahl 18/8, BPA-frei", price: 2290, sku: "LU-BOT-002", weight: 260,
    oneSize: true, ageDays: 110, sold: 145, colors: [C.rose, C.schwarz, C.salbei], sizes: [],
  },
  {
    slug: "kuschelbaer-momo", name: "Kuschelbär „Momo“", category: "dies-und-das", brand: "atelier-petit", shape: "teddy",
    short: "Superweicher Teddy aus recyceltem Plüsch, 28 cm.",
    description: "Momo ist waschbar (30 °C), kindgerecht verarbeitet und macht jede Nacht ein bisschen leichter. Mit gestickten Augen – ohne Kleinteile.",
    material: "100 % recyceltes Polyester · Füllung: Polyestervlies", price: 2490, sku: "AP-TED-003", weight: 180,
    oneSize: true, ageDays: 8, sold: 77, colors: [C.sand, C.puder], sizes: [],
  },
  {
    slug: "beanie-nordic", name: "Beanie „Nordic“ mit Bommel", category: "dies-und-das", brand: "nordkind", shape: "beanie",
    short: "Warme Strickmütze mit Fleecefutter.",
    description: "Doppelt gestrickt, mit weichem Fleecefutter und Bommel. Hält Ohren warm und bleibt auch nach vielen Wäschen in Form.",
    material: "70 % Baumwolle, 30 % Polyacryl · Futter: Fleece", price: 1990, sale: 1490, sku: "NK-BEA-004", weight: 90,
    oneSize: true, ageDays: 140, sold: 51, colors: [C.bordeaux, C.creme, C.graphit], sizes: [],
  },
  {
    slug: "schal-woll-streifen", name: "Schal „Streifen“", category: "dies-und-das", brand: "atelier-petit", shape: "scarf",
    short: "Weicher Kinder-Schal mit Fransen.",
    description: "Weicher Strick, sanfte Streifen und Fransen an den Enden. Lang genug zum Wickeln, kurz genug, um nicht im Weg zu sein.",
    material: "60 % Baumwolle, 40 % Acryl", price: 2190, sku: "AP-SCH-005", weight: 110,
    oneSize: true, ageDays: 55, sold: 28, colors: [C.rose, C.rauch], sizes: [],
  },
  {
    slug: "cap-canvas-sun", name: "Canvas Cap „Sun“", category: "dies-und-das", brand: "lilli-und-lou", shape: "cap",
    short: "Verstellbare Cap aus leichtem Canvas.",
    description: "Leichter Canvas, weiches Schweißband und verstellbarer Klettverschluss – wächst ein paar Größen mit.",
    material: "100 % Bio-Baumwolle", price: 1890, sku: "LU-CAP-006", weight: 70,
    oneSize: true, ageDays: 300, sold: 33, colors: [C.sand, C.nacht], sizes: [],
    stock: { "": 0 },
  },
  {
    slug: "brotdose-bento", name: "Brotdose „Bento“", category: "dies-und-das", brand: "lilli-und-lou", shape: "lunchbox",
    short: "Auslaufsichere Brotdose mit Trennfächern.",
    description: "Drei Fächer, spülmaschinenfest, BPA-frei. Der Klickverschluss lässt sich von kleinen Händen öffnen – und bleibt trotzdem dicht.",
    material: "Polypropylen, BPA-frei", price: 1790, sku: "LU-LUN-007", weight: 210,
    oneSize: true, ageDays: 3, sold: 9, colors: [C.puder, C.salbei], sizes: [],
  },
];

export const sizeGuides = {
  clothes:
    "Größe|Körpergröße|Brustumfang|Taille\n92|86–92 cm|52 cm|50 cm\n98|93–98 cm|53 cm|51 cm\n104|99–104 cm|55 cm|52 cm\n110|105–110 cm|57 cm|53 cm\n116|111–116 cm|59 cm|54 cm\n122|117–122 cm|61 cm|55 cm\n128|123–128 cm|63 cm|56 cm\n134|129–134 cm|66 cm|58 cm\n140|135–140 cm|69 cm|60 cm",
  shoes:
    "EU-Größe|Fußlänge|Innenlänge (empf.)\n24|14,5 cm|15,3 cm\n26|15,8 cm|16,6 cm\n28|17,0 cm|17,8 cm\n30|18,4 cm|19,2 cm\n32|19,7 cm|20,5 cm\n34|21,0 cm|21,8 cm",
} as const;

export const coupons = [
  { code: "WELCOME10", description: "10 % Willkommensrabatt", type: "PERCENT" as const, value: 10, minOrderCents: 3000, oncePerCustomer: true },
  { code: "SOMMER20", description: "20 € Rabatt ab 100 € Bestellwert", type: "FIXED" as const, value: 2000, minOrderCents: 10000, oncePerCustomer: false },
];

/** Stabile Pseudo-Zufallszahl (0–1) für reproduzierbare Bestände */
export const rnd = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};
