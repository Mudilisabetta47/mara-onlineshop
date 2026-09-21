import type { Coupon } from "@prisma/client";

export type CouponScope = Coupon & { products: { id: string }[]; categories: { id: string }[] };
export type PricedLine = { productId: string; categoryId: string; totalCents: number };

export type CouponResult =
  | { ok: true; discountCents: number }
  | { ok: false; reason: string };

/** Reine Auswertung – ohne DB-Zugriff, damit sie testbar ist. */
export function evaluateCoupon(
  coupon: CouponScope,
  ctx: { lines: PricedLine[]; subtotalCents: number; now?: Date; customerRedemptions: number },
): CouponResult {
  const now = ctx.now ?? new Date();
  if (!coupon.isActive) return { ok: false, reason: "Dieser Gutschein ist nicht mehr gültig." };
  if (coupon.validFrom && coupon.validFrom > now) return { ok: false, reason: "Dieser Gutschein ist noch nicht gültig." };
  if (coupon.validUntil && coupon.validUntil < now) return { ok: false, reason: "Dieser Gutschein ist abgelaufen." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, reason: "Dieser Gutschein wurde bereits zu oft eingelöst." };
  if (coupon.oncePerCustomer && ctx.customerRedemptions > 0)
    return { ok: false, reason: "Du hast diesen Gutschein bereits eingelöst." };
  if (ctx.subtotalCents < coupon.minOrderCents)
    return { ok: false, reason: `Mindestbestellwert für diesen Gutschein: ${(coupon.minOrderCents / 100).toFixed(2).replace(".", ",")} €.` };

  const restricted = coupon.products.length > 0 || coupon.categories.length > 0;
  const productIds = new Set(coupon.products.map((p) => p.id));
  const categoryIds = new Set(coupon.categories.map((c) => c.id));
  const eligible = restricted
    ? ctx.lines.filter((l) => productIds.has(l.productId) || categoryIds.has(l.categoryId))
    : ctx.lines;
  const base = eligible.reduce((s, l) => s + l.totalCents, 0);
  if (base <= 0) return { ok: false, reason: "Der Gutschein gilt nicht für die Artikel in deinem Warenkorb." };

  const raw = coupon.type === "PERCENT" ? Math.round((base * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.max(0, Math.min(raw, base)) };
}
