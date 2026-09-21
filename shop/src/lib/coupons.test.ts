import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCoupon, type CouponScope } from "./coupons";

const base = (o: Partial<CouponScope> = {}): CouponScope => ({
  id: "c1", code: "TEST", description: null, type: "PERCENT", value: 10, validFrom: null, validUntil: null,
  minOrderCents: 0, maxUses: null, usedCount: 0, oncePerCustomer: false, isActive: true, createdAt: new Date(),
  products: [], categories: [], ...o,
});
const lines = [
  { productId: "p1", categoryId: "k1", totalCents: 5000 },
  { productId: "p2", categoryId: "k2", totalCents: 3000 },
];

test("percent applies to all lines", () => {
  assert.deepEqual(evaluateCoupon(base(), { lines, subtotalCents: 8000, customerRedemptions: 0 }), { ok: true, discountCents: 800 });
});
test("fixed discount is capped by base", () => {
  const r = evaluateCoupon(base({ type: "FIXED", value: 99999 }), { lines, subtotalCents: 8000, customerRedemptions: 0 });
  assert.deepEqual(r, { ok: true, discountCents: 8000 });
});
test("category restriction only discounts eligible lines", () => {
  const r = evaluateCoupon(base({ categories: [{ id: "k2" }] }), { lines, subtotalCents: 8000, customerRedemptions: 0 });
  assert.deepEqual(r, { ok: true, discountCents: 300 });
});
test("rejects expired / min order / max uses / once per customer", () => {
  const ctx = { lines, subtotalCents: 8000, customerRedemptions: 0 };
  assert.equal(evaluateCoupon(base({ validUntil: new Date(Date.now() - 1000) }), ctx).ok, false);
  assert.equal(evaluateCoupon(base({ minOrderCents: 10000 }), ctx).ok, false);
  assert.equal(evaluateCoupon(base({ maxUses: 5, usedCount: 5 }), ctx).ok, false);
  assert.equal(evaluateCoupon(base({ oncePerCustomer: true }), { ...ctx, customerRedemptions: 1 }).ok, false);
  assert.equal(evaluateCoupon(base({ isActive: false }), ctx).ok, false);
});
test("restricted coupon without matching lines is rejected", () => {
  assert.equal(evaluateCoupon(base({ products: [{ id: "zzz" }] }), { lines, subtotalCents: 8000, customerRedemptions: 0 }).ok, false);
});
