import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export const metadata: Metadata = { title: "Kasse", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const saved = user ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }) : [];
  return (
    <Suspense>
      <CheckoutFlow
        user={user ? { email: user.email, firstName: user.firstName, lastName: user.lastName } : null}
        saved={saved.map((a) => ({ id: a.id, label: a.label, isDefault: a.isDefault, firstName: a.firstName, lastName: a.lastName, company: a.company ?? "", line1: a.line1, line2: a.line2 ?? "", postalCode: a.postalCode, city: a.city, country: a.country as "DE" | "AT", phone: a.phone ?? "" }))}
      />
    </Suspense>
  );
}
