import { cache } from "react";
import { db } from "./db";
import { shopName } from "./env";

export const SETTINGS_DEFAULTS = {
  shopName: "Lilli und Lou",
  tagline: "Ausgewählte Mode, Schuhe und Lieblingsstücke für Kinder.",
  // Anbieterkennzeichnung – MUSS vor dem Livegang im Admin gepflegt werden
  legalName: "[Firmenname – bitte im Admin pflegen]",
  legalForm: "",
  street: "[Straße Hausnummer]",
  postalCode: "[PLZ]",
  city: "[Ort]",
  country: "Deutschland",
  email: "service@example.com",
  phone: "",
  managingDirector: "",
  registerCourt: "",
  registerNumber: "",
  vatId: "",
  // Zahlung per Vorkasse
  bankHolder: "",
  bankIban: "",
  bankBic: "",
  bankName: "",
  // Versand & Steuern
  taxRatePercent: 19,
  shippingStandardCents: 490,
  shippingExpressCents: 990,
  freeShippingThresholdCents: 7500,
  returnDays: 30,
  announcement: "Kostenloser Versand ab 75 € · 30 Tage Rückgabe",
  reservationMinutes: 30,
};

export type Settings = typeof SETTINGS_DEFAULTS;

export const getSettings = cache(async (): Promise<Settings> => {
  const row = await db.setting.findUnique({ where: { key: "shop" } });
  const stored = (row?.value ?? {}) as Partial<Settings>;
  return { ...SETTINGS_DEFAULTS, shopName: shopName(), ...stored };
});

export async function saveSettings(patch: Partial<Settings>) {
  const row = await db.setting.findUnique({ where: { key: "shop" } });
  const merged = { ...((row?.value ?? {}) as object), ...patch };
  await db.setting.upsert({ where: { key: "shop" }, update: { value: merged }, create: { key: "shop", value: merged } });
}
