const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export const formatEUR = (cents: number) => eur.format(cents / 100);

/** Preise sind Bruttopreise: enthaltener Steueranteil bei `ratePercent` %. */
export function includedTax(grossCents: number, ratePercent = 19): number {
  return Math.round(grossCents - grossCents / (1 + ratePercent / 100));
}

export const toCents = (value: string | number): number => {
  const n = typeof value === "number" ? value : Number(String(value).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Ungültiger Betrag");
  return Math.round(n * 100);
};

export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");

export const effectivePrice = (base: number, sale?: number | null) =>
  sale != null && sale > 0 && sale < base ? sale : base;

export const percentOff = (base: number, sale: number) => Math.round((1 - sale / base) * 100);
