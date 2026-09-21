/** Client-sichere Helfer (kein Prisma-Import). */
const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
export const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s);
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

export const SORT_LABELS_CLIENT: Record<string, string> = {
  featured: "Empfohlen",
  new: "Neuheiten",
  bestseller: "Bestseller",
  "price-asc": "Preis aufsteigend",
  "price-desc": "Preis absteigend",
};
