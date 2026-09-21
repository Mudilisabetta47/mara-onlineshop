import { z } from "zod";
import { ok, route } from "@/lib/http";
import { buildCartView, setLineQuantity } from "@/lib/cart";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(
  async (req, { params }) => {
    const { id } = await params;
    const { quantity } = z.object({ quantity: z.number().int().min(0).max(10) }).parse(await req.json());
    const { cartId } = await setLineQuantity(id, quantity);
    return ok({ cart: await buildCartView(cartId) });
  },
  { limit: { key: "cart", max: 120, windowMs: 60_000 } },
);

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const { cartId } = await setLineQuantity(id, 0);
  return ok({ cart: await buildCartView(cartId) });
});
