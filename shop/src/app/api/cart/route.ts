import { z } from "zod";
import { ok, route } from "@/lib/http";
import { addToCart, buildCartView, resolveCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const cart = await resolveCart(false);
  return ok({ cart: await buildCartView(cart?.id ?? null) }, { headers: { "Cache-Control": "no-store" } });
});

const addSchema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(10).default(1) });

export const POST = route(
  async (req) => {
    const body = addSchema.parse(await req.json());
    const res = await addToCart(body.variantId, body.quantity);
    const notice = res.capped ? `Nur noch ${res.stock} verfügbar – Menge angepasst.` : null;
    return ok({ cart: await buildCartView(res.cartId), notice });
  },
  { limit: { key: "cart", max: 120, windowMs: 60_000 } },
);
