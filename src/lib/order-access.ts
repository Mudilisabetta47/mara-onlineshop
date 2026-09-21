import { timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { getCurrentUser } from "./auth/session";

const eq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Zugriff auf eine Bestellung: Besitzer (Session) oder Gast mit gültigem Token. Admins sehen alles. */
export async function getOrderForViewer(orderId: string, token?: string | null) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true, payments: true, shipments: true,
      shippingAddress: true, billingAddress: true,
    },
  });
  if (!order) return null;
  const user = await getCurrentUser();
  if (user && (user.role === "ADMIN" || order.userId === user.id)) return order;
  if (token && eq(token, order.guestToken)) return order;
  return null;
}
