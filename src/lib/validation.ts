import { z } from "zod";

const trim = (max: number, min = 1, msg = "Pflichtfeld") =>
  z.string().trim().min(min, msg).max(max, "Eingabe zu lang");

export const emailSchema = z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(200);

export const addressSchema = z
  .object({
    firstName: trim(60, 1, "Vorname fehlt"),
    lastName: trim(60, 1, "Nachname fehlt"),
    company: z.string().trim().max(100).optional().or(z.literal("")),
    line1: trim(120, 3, "Straße und Hausnummer fehlen"),
    line2: z.string().trim().max(120).optional().or(z.literal("")),
    postalCode: z.string().trim().regex(/^\d{4,5}$/, "Ungültige Postleitzahl"),
    city: trim(80, 2, "Ort fehlt"),
    country: z.enum(["DE", "AT"]),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
  })
  .superRefine((a, ctx) => {
    const len = a.country === "DE" ? 5 : 4;
    if (a.postalCode.length !== len)
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: `PLZ für ${a.country === "DE" ? "Deutschland" : "Österreich"}: ${len} Ziffern` });
  });
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  email: emailSchema,
  shipping: addressSchema,
  billing: addressSchema.optional(),
  shippingMethod: z.enum(["standard", "express"]),
  provider: z.enum(["STRIPE", "PAYPAL", "BANK_TRANSFER", "TEST"]),
  note: z.string().trim().max(500).optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Bitte bestätige AGB und Widerrufsbelehrung." }) }),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const registerSchema = z.object({
  firstName: trim(60, 1, "Vorname fehlt"),
  lastName: trim(60, 1, "Nachname fehlt"),
  email: emailSchema,
  password: z.string().max(200),
  newsletter: z.boolean().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Bitte Sterne wählen").max(5),
  title: z.string().trim().max(100).optional(),
  body: trim(2000, 10, "Bitte schreibe mindestens 10 Zeichen."),
});

/** Formular-Helfer für Server Actions */
export const fd = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};
