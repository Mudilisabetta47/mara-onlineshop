import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { mergeGuestData, resolveCart, resolveWishlist } from "@/lib/cart";

export const dynamic = "force-dynamic";

/** Ein Request für den Header: Nutzer, Warenkorb-Menge, Wunschliste (Produkt-IDs). */
export async function GET() {
  const user = await getCurrentUser();
  // Gast-Daten (Cookies) nach dem Login ins Konto übernehmen – no-op, wenn keine Gast-Cookies vorhanden sind
  if (user) await mergeGuestData(user.id);
  const [cart, wish] = await Promise.all([resolveCart(false), resolveWishlist(false)]);
  const [cartAgg, wishItems, unread] = await Promise.all([
    cart ? db.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } }) : null,
    wish ? db.wishlistItem.findMany({ where: { wishlistId: wish.id }, select: { productId: true } }) : [],
    user ? db.notification.count({ where: { userId: user.id, readAt: null } }) : 0,
  ]);
  return NextResponse.json(
    {
      user: user ? { firstName: user.firstName, isAdmin: user.role === "ADMIN" } : null,
      cartCount: cartAgg?._sum.quantity ?? 0,
      wishlist: wishItems.map((w) => w.productId),
      unread,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
