import type { Settings } from "./settings";

export const COUNTRIES = [
  { code: "DE", name: "Deutschland" },
  { code: "AT", name: "Österreich" },
] as const;

export const SHIPPING_METHODS = [
  { id: "standard", label: "Standardversand", carrier: "DHL", eta: "2–4 Werktage" },
  { id: "express", label: "Expressversand", carrier: "DHL Express", eta: "1–2 Werktage" },
] as const;
export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

export const isShippingMethod = (v: string): v is ShippingMethodId => SHIPPING_METHODS.some((m) => m.id === v);

/** Standardversand ist ab dem Schwellwert kostenlos (Warenwert nach Rabatt). */
export function shippingCost(method: ShippingMethodId, goodsAfterDiscountCents: number, s: Settings): number {
  if (goodsAfterDiscountCents <= 0) return 0;
  if (method === "express") return s.shippingExpressCents;
  return goodsAfterDiscountCents >= s.freeShippingThresholdCents ? 0 : s.shippingStandardCents;
}

export const methodLabel = (id: string) => SHIPPING_METHODS.find((m) => m.id === id)?.label ?? id;
