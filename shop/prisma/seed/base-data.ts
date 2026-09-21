/**
 * Stammdaten des Shops (Struktur, keine Testdaten): Kategorien und Marken.
 * Kategorien sind produktionssicher; die Marken sind FIKTIVE Demo-Marken und werden nur vom Demo-Seed angelegt.
 */
export const demoBrands = [
  { slug: "lumi", name: "LUMI", description: "Unsere Hausmarke: zeitlose Basics aus weichen, langlebigen Materialien." },
  { slug: "nordkind", name: "Nordkind", description: "Skandinavisch inspirierte Outdoor- und Alltagsmode für kleine Entdecker." },
  { slug: "atelier-petit", name: "Atelier Petit", description: "Feine Schnitte und verspielte Details – kleine Kollektionen mit Charakter." },
  { slug: "sole-co", name: "Sole & Co.", description: "Bequeme Schuhe mit Passform-Anspruch, gemacht für tägliches Rennen." },
] as const;

export const categories = [
  {
    slug: "junge", name: "Junge", sortOrder: 1,
    description: "Kleidung für Jungs, die klettern, rennen und alles ausprobieren.",
    seoTitle: "Jungenmode online kaufen – Hoodies, Jacken & mehr",
    seoDescription: "Hochwertige Jungenmode: robuste Hoodies, Jacken, Hosen und Shirts in Größe 92–140. Schneller Versand, 30 Tage Rückgabe.",
    introText:
      "Jungs brauchen Kleidung, die mitmacht: weich genug für den ganzen Tag, robust genug für Spielplatz und Schulhof. In unserer Auswahl findest du ausgesuchte Hoodies, Jacken, Hosen und Shirts in klaren Farben und guten Schnitten – zum Kombinieren, Vererben und Liebhaben. Alle Größen von 92 bis 140 sind mit Größentabelle und ehrlicher Passform-Beschreibung versehen.",
  },
  {
    slug: "maedchen", name: "Mädchen", sortOrder: 2,
    description: "Kleider, Röcke und Lieblingsteile für Mädchen mit eigenem Stil.",
    seoTitle: "Mädchenmode online kaufen – Kleider, Röcke & Shirts",
    seoDescription: "Mädchenmode mit Charakter: Kleider, Röcke, Strick und Shirts in Größe 92–140. Nachhaltige Materialien, schneller Versand.",
    introText:
      "Ob verspieltes Kleid, plissierter Rock oder kuschelige Strickjacke: Unsere Mädchenmode verbindet feine Details mit Alltagstauglichkeit. Wir wählen Stücke aus, die sich gut anfühlen, gut sitzen und lange schön bleiben – in gedeckten, modernen Farben statt Zuckerwatte.",
  },
  {
    slug: "schuhe", name: "Schuhe", sortOrder: 3,
    description: "Sneaker, Boots und Ballerinas mit Passform-Garantie.",
    seoTitle: "Kinderschuhe online kaufen – Sneaker, Boots & Ballerinas",
    seoDescription: "Bequeme Kinderschuhe in Größe 24–34: Sneaker, Winterboots und Ballerinas. Passform-Tipps und 30 Tage Rückgaberecht.",
    introText:
      "Gute Kinderschuhe entscheiden über den Tag: Sie müssen flexibel, leicht und stabil sein. Unsere Schuhe haben weiche Sohlen, atmungsaktive Materialien und eine klare Größenempfehlung. Miss den Fuß deines Kindes am besten abends und wähle 8–12 mm Wachstumsreserve.",
  },
  {
    slug: "dies-und-das", name: "Dies & Das", sortOrder: 4,
    description: "Rucksäcke, Mützen, Kuscheltiere und kleine Lieblingsstücke.",
    seoTitle: "Accessoires & Geschenke für Kinder – Dies & Das",
    seoDescription: "Rucksäcke, Mützen, Schals, Kuscheltiere und Brotdosen: kleine Lieblingsstücke und Geschenkideen für Kinder.",
    introText:
      "Manchmal sind es die kleinen Dinge: der Rucksack für den ersten Schultag, die Mütze für kalte Morgen, das Kuscheltier für gute Nächte. Hier sammeln wir Accessoires und Geschenkideen, die den Alltag schöner machen.",
  },
] as const;


export const brands = demoBrands;
