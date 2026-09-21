import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok, route, ApiError } from "@/lib/http";
import { reviewSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Nur Kunden, die das Produkt gekauft haben (bezahlte Bestellung), dürfen einmal bewerten. Moderation im Admin. */
export const POST = route(
  async (req) => {
    const user = await getCurrentUser();
    if (!user) throw new ApiError(401, "Bitte melde dich an, um zu bewerten.", "auth");
    const input = reviewSchema.parse(await req.json());
    const bought = await db.orderItem.findFirst({
      where: {
        productId: input.productId,
        order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
      select: { id: true },
    });
    if (!bought) throw new ApiError(403, "Du kannst nur Produkte bewerten, die du gekauft hast.", "not_purchased");
    const exists = await db.review.findUnique({ where: { productId_userId: { productId: input.productId, userId: user.id } } });
    if (exists) throw new ApiError(409, "Du hast dieses Produkt bereits bewertet.", "duplicate");
    await db.review.create({
      data: { productId: input.productId, userId: user.id, rating: input.rating, title: input.title || null, body: input.body },
    });
    const p = await db.product.findUnique({ where: { id: input.productId }, select: { slug: true } });
    if (p) revalidatePath(`/product/${p.slug}`);
    return ok({ ok: true, message: "Danke! Deine Bewertung erscheint nach der Prüfung." });
  },
  { limit: { key: "review", max: 10, windowMs: 10 * 60_000 } },
);

export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId") ?? "";
  const user = await getCurrentUser();
  if (!user) return ok({ canReview: false, loggedIn: false });
  const [bought, exists] = await Promise.all([
    db.orderItem.findFirst({ where: { productId, order: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } }, select: { id: true } }),
    db.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } }),
  ]);
  return ok({ canReview: Boolean(bought) && !exists, loggedIn: true });
}
