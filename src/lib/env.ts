import { appEnv, effectiveAppUrl } from "./config";

/** Serverseitige Konfiguration. Secrets verlassen niemals den Server. */

export const appUrl = () => effectiveAppUrl();
export const shopName = () => process.env.NEXT_PUBLIC_SHOP_NAME || "Lilli und Lou";
export const isProd = () => process.env.NODE_ENV === "production";

export const stripeEnabled = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
export const paypalEnabled = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
/** Testzahlung existiert ausschließlich in APP_ENV=local (nie in staging/production) und nur ohne echten PSP. */
export const testPaymentEnabled = () => appEnv() === "local" && !isProd() && !stripeEnabled();
/** Vorkasse ist live nur mit hinterlegter IBAN wählbar (sonst erhielten Kunden keine Zahlungsdaten). */
export const bankTransferAllowed = (iban?: string | null) => Boolean(iban) || appEnv() === "local";
/** `__Host-`-Präfix erzwingt Secure + Path=/ + keine Domain-Attribute (Schutz vor Cookie-Injection über Subdomains). */
export const cookieName = (base: string) => (isProd() ? `__Host-${base}` : base);

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Umgebungsvariable ${name} fehlt`);
  return v;
}
