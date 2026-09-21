import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { PageTitle } from "@/components/account/bits";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zahlungsmethoden" };

const LABEL = { STRIPE: "Karte / Apple Pay / Google Pay", PAYPAL: "PayPal", BANK_TRANSFER: "Vorkasse / Überweisung", TEST: "Testzahlung" } as const;

export default async function Page() {
  const u = await requireUser();
  const used = await db.payment.groupBy({ by: ["provider"], where: { status: "PAID", order: { userId: u.id } }, _count: true, _max: { paidAt: true } });
  return (
    <>
      <PageTitle eyebrow="Mein Konto" sub="Aus Sicherheitsgründen speichern wir keine Karten- oder Kontodaten. Die Zahlung läuft direkt über unsere Zahlungsdienstleister Stripe und PayPal.">Zahlungsmethoden.</PageTitle>
      <div className="panel mb-6 p-6">
        <p className="eyebrow mb-4 !text-cream/45">Verfügbar im Checkout</p>
        <ul className="flex flex-wrap gap-2">{["Kreditkarte", "Apple Pay", "Google Pay", "PayPal", "Vorkasse"].map((m) => <li key={m} className="rounded-full border border-white/15 px-4 py-2 text-[13.5px]">{m}</li>)}</ul>
      </div>
      <div className="panel p-6">
        <p className="eyebrow mb-4 !text-cream/45">Von dir verwendet</p>
        {used.length === 0 ? <p className="text-[14.5px] text-cream/55">Noch keine bezahlte Bestellung.</p> : (
          <ul className="divide-y divide-white/[0.07]">{used.map((p) => <li key={p.provider} className="flex items-center justify-between py-3 text-[14.5px]"><span>{LABEL[p.provider]}</span><span className="text-cream/50">{p._count}× · zuletzt {p._max.paidAt?.toLocaleDateString("de-DE")}</span></li>)}</ul>
        )}
      </div>
    </>
  );
}
