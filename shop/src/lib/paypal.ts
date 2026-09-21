import { appUrl } from "./env";

const base = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!, secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal-Auth fehlgeschlagen (${res.status})`);
  return (await res.json()).access_token;
}

async function api<T>(path: string, init: RequestInit & { requestId?: string } = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PayPal ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json as T;
}

const eur = (cents: number) => (cents / 100).toFixed(2);

export async function createPayPalOrder(o: { id: string; number: number; totalCents: number; guestToken: string }) {
  const res = await api<{ id: string; links: { rel: string; href: string }[] }>("/v2/checkout/orders", {
    method: "POST",
    requestId: `order-${o.id}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: o.id,
        custom_id: o.id,
        description: `Bestellung #${o.number}`,
        amount: { currency_code: "EUR", value: eur(o.totalCents) },
      }],
      payment_source: {
        paypal: {
          experience_context: {
            locale: "de-DE",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: `${appUrl()}/checkout/paypal/return?order=${o.id}&t=${o.guestToken}`,
            cancel_url: `${appUrl()}/checkout/paypal/cancel?order=${o.id}&t=${o.guestToken}`,
          },
        },
      },
    }),
  });
  const approve = res.links.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!approve) throw new Error("PayPal lieferte keine Freigabe-URL");
  return { paypalOrderId: res.id, approveUrl: approve };
}

export async function capturePayPalOrder(paypalOrderId: string) {
  const res = await api<{
    status: string;
    purchase_units: { payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] } }[];
  }>(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST", requestId: `capture-${paypalOrderId}`, body: "{}" });
  const cap = res.purchase_units[0]?.payments?.captures?.[0];
  return { completed: res.status === "COMPLETED" && cap?.status === "COMPLETED", captureId: cap?.id, amount: cap?.amount };
}

export async function refundPayPalCapture(captureId: string, cents: number, requestId: string) {
  return api(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST", requestId,
    body: JSON.stringify({ amount: { value: eur(cents), currency_code: "EUR" } }),
  });
}
