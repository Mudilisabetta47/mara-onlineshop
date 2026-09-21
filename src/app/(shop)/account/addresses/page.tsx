import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { PageTitle } from "@/components/account/bits";
import { AddressManager } from "@/components/account/AddressManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adressen" };

export default async function Page() {
  const u = await requireUser();
  const addresses = await db.address.findMany({ where: { userId: u.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return <><PageTitle eyebrow="Mein Konto" sub="Gespeicherte Adressen beschleunigen deinen Checkout.">Adressen.</PageTitle><AddressManager addresses={addresses} /></>;
}
