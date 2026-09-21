import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatEUR } from "@/lib/money";
import { Empty, PageTitle, StatusPill } from "@/components/account/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bestellungen" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, include: { items: { select: { name: true, quantity: true, imageUrl: true } } } });
  return (
    <>
      <PageTitle eyebrow="Mein Konto">Deine Bestellungen.</PageTitle>
      {orders.length === 0 ? <Empty title="Noch keine Bestellungen." text="Sobald du etwas bestellst, findest du es hier – mit Status, Tracking und Rechnung." href="/shop" cta="Jetzt entdecken" /> : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.number}`} className="panel block p-6 transition-all duration-500 ease-premium hover:border-rose-300/40 hover:bg-white/[0.03]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="text-[18px] font-semibold tracking-tight">#{o.number}</p><p className="text-[13.5px] text-cream/50">{o.placedAt.toLocaleDateString("de-DE")}</p></div>
                  <div className="flex items-center gap-5"><StatusPill status={o.status} /><span className="text-[17px] font-medium tabular-nums">{formatEUR(o.totalCents)}</span></div>
                </div>
                <p className="mt-4 truncate text-[13.5px] text-cream/55">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
