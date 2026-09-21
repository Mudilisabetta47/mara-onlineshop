/**
 * Prüft die Stripe-Anbindung (Konto, Modus, Webhook, Zahlarten). Aufruf mit den Keys der Zielumgebung:
 *   STRIPE_SECRET_KEY=sk_live_… NEXT_PUBLIC_APP_URL=https://shop.de npm run check:stripe
 * Gibt keine Schlüssel aus.
 */
import Stripe from "stripe";
const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("✖ STRIPE_SECRET_KEY nicht gesetzt."); process.exit(1); }
const stripe = new Stripe(key);
const app = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const REQUIRED = ["payment_intent.succeeded", "payment_intent.payment_failed", "charge.refunded"];
let failed = 0;
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✖"} ${m}`); if (!c) failed++; };

(async () => {
  const acc = await stripe.accounts.retrieve();
  const live = key.startsWith("sk_live_") || key.startsWith("rk_live_");
  console.log(`Stripe-Konto: ${acc.business_profile?.name || acc.id} (${acc.country}) · Modus: ${live ? "LIVE" : "TEST"}`);
  ok(!live || acc.charges_enabled === true, "Zahlungen annehmen (charges_enabled)");
  ok(!live || acc.payouts_enabled === true, "Auszahlungen aktiv (payouts_enabled)");
  ok(!live || acc.details_submitted === true, "Kontodetails/Verifizierung vollständig");

  const hooks = await stripe.webhookEndpoints.list({ limit: 100 });
  const url = `${app}/api/webhooks/stripe`;
  const h = hooks.data.find((x) => x.url === url);
  ok(!!h, `Webhook-Endpoint registriert: ${url}`);
  if (h) {
    ok(h.status === "enabled", "Webhook aktiviert");
    const ev = new Set(h.enabled_events);
    for (const e of REQUIRED) ok(ev.has(e) || ev.has("*"), `Event abonniert: ${e}`);
  }
  try {
    const pmc = await stripe.paymentMethodConfigurations.list({ limit: 5 });
    const def = pmc.data.find((c) => c.is_default) ?? pmc.data[0];
    if (def) {
      const on = (k: string) => (def as unknown as Record<string, { display_preference?: { value?: string } }>)[k]?.display_preference?.value === "on";
      for (const k of ["card", "apple_pay", "google_pay", "paypal"]) console.log(`  ${on(k) ? "✓" : "•"} Zahlart ${k}: ${on(k) ? "aktiv" : "nicht aktiv (Dashboard → Einstellungen → Zahlungsmethoden)"}`);
    }
  } catch { console.log("  • Zahlarten-Konfiguration nicht abrufbar (Restricted Key ohne Berechtigung)"); }
  try {
    const ap = await stripe.applePayDomains.list({ limit: 20 });
    const host = app ? new URL(app).hostname : "";
    console.log(`  ${ap.data.some((d) => d.domain_name === host) ? "✓" : "•"} Apple-Pay-Domain ${host || "(APP_URL fehlt)"} ${ap.data.some((d) => d.domain_name === host) ? "verifiziert" : "nicht registriert (nur nötig für Apple Pay)"}`);
  } catch { /* optional */ }
  console.log(failed ? `\n${failed} Problem(e).` : "\n✓ Stripe bereit.");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("✖", e.message); process.exit(1); });
