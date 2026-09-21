import { z } from "zod";
import { db } from "@/lib/db";
import { ok, route, ApiError } from "@/lib/http";
import { resolveWishlist } from "@/lib/cart";

export const dynamic = "force-dynamic";

/** Toggle: legt das Produkt auf die Wunschliste bzw. entfernt es. */
export const POST = route(
  async (req) => {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(await req.json());
    const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!product) throw new ApiError(404, "Produkt nicht gefunden.");
    const wish = (await resolveWishlist(true))!;
    const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wish.id, productId } } });
    if (existing) await db.wishlistItem.delete({ where: { id: existing.id } });
    else await db.wishlistItem.create({ data: { wishlistId: wish.id, productId } });
    const items = await db.wishlistItem.findMany({ where: { wishlistId: wish.id }, select: { productId: true } });
    return ok({ saved: !existing, wishlist: items.map((i) => i.productId) });
  },
  { limit: { key: "wish", max: 120, windowMs: 60_000 } },
);
