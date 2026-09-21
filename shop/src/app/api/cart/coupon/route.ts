import { z } from "zod";
import { ok, route, ApiError } from "@/lib/http";
import { buildCartView, loadCoupon, setCoupon } from "@/lib/cart";

export const dynamic = "force-dynamic";

export const POST = route(
  async (req) => {
    const { code } = z.object({ code: z.string().trim().min(2).max(40) }).parse(await req.json());
    if (!(await loadCoupon(code))) throw new ApiError(404, "Diesen Gutschein kennen wir nicht.", "coupon");
    const cartId = await setCoupon(code);
    const cart = await buildCartView(cartId);
    if (cart.couponError) {
      await setCoupon(null);
      throw new ApiError(409, cart.couponError, "coupon");
    }
    return ok({ cart });
  },
  { limit: { key: "coupon", max: 15, windowMs: 60_000 } },
);

export const DELETE = route(async () => {
  const cartId = await setCoupon(null);
  return ok({ cart: await buildCartView(cartId) });
});
