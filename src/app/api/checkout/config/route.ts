import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { bankTransferAllowed, paypalEnabled, stripeEnabled, testPaymentEnabled } from "@/lib/env";
import { COUNTRIES, SHIPPING_METHODS } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/** Welche Zahlarten/Versandarten aktuell verfügbar sind (nur öffentliche Werte). */
export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    payments: {
      STRIPE: stripeEnabled(),
      PAYPAL: paypalEnabled(),
      BANK_TRANSFER: bankTransferAllowed(s.bankIban),
      TEST: testPaymentEnabled(),
    },
    stripePublishableKey: stripeEnabled() ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY : null,
    shipping: {
      methods: SHIPPING_METHODS.map((m) => ({
        ...m, priceCents: m.id === "express" ? s.shippingExpressCents : s.shippingStandardCents,
      })),
      freeThresholdCents: s.freeShippingThresholdCents,
    },
    taxRatePercent: s.taxRatePercent,
    countries: COUNTRIES,
  });
}
