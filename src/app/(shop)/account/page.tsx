import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { formatEUR } from "@/lib/money";
import { StatusPill } from "@/components/account/bits";
import { readNotificationsAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Übersicht" };

export default async function AccountHome() {
  const user = await requireUser("/account");
  const [orders, orderCount, wishCount, contractCount, notes] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, take: 3 }),
    db.order.count({ where: { userId: user.id } }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    db.contract.count({ where: { userId: user.id } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const unread = notes.filter((n) => !n.readAt).length;
  const tiles = [
    ["Bestellungen", "/account/orders", `${orderCount}`, "Status, Sendungsverfolgung, Rechnungen"], ["Wunschliste", "/account/wishlist", `${wishCount}`, "Gespeicherte Lieblingsstücke"],
    ["Deine Verträge", "/account/contracts", `${contractCount}`, "Verträge und Dokumente"], ["Adressen", "/account/addresses", "→", "Liefer- und Rechnungsadressen"],
    ["Profil", "/account/profile", "→", "Name, E-Mail, Telefon"], ["Einstellungen", "/account/settings", "→", "Newsletter & Datenschutz"],
  ];
  return (
    <>
      <p className="eyebrow mb-3">Mein Konto</p>
      <h1 className="h-lg mb-10 !text-[clamp(2.4rem,5vw,4rem)]">Hallo, {user.firstName}.</h1>

      <div data-reveal-stagger="0.06" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(([t, href, n, d]) => (
          <Link data-reveal="up" key={t} href={href} className="group panel p-6 transition-all duration-500 ease-premium hover:-translate-y-0.5 hover:border-rose-300/40 hover:bg-white/[0.04]">
            <div className="flex items-start justify-between"><span className="text-[17px] font-medium tracking-tight">{t}</span><span className="text-2xl font-semibold text-rose-300">{n}</span></div>
            <p className="mt-6 text-[13px] text-cream/50">{d}</p>
          </Link>
        ))}
      </div>

      <section className="mt-14">
        <div className="mb-5 flex items-end justify-between"><h2 className="h-md !text-[1.7rem]">Letzte Bestellungen</h2><Link href="/account/orders" className="text-[13.5px] text-cream/55 underline underline-offset-4 hover:text-cream">Alle ansehen</Link></div>
        {orders.length === 0 ? <p className="panel p-6 text-cream/55">Noch keine Bestellungen. <Link href="/shop" className="text-cream underline underline-offset-4">Jetzt stöbern</Link></p> : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}><Link href={`/account/orders/${o.number}`} className="panel flex items-center justify-between gap-4 p-5 transition-colors hover:border-rose-300/40">
                <div><p className="font-medium">#{o.number}</p><p className="text-[13px] text-cream/50">{o.placedAt.toLocaleDateString("de-DE")}</p></div>
                <div className="flex items-center gap-5"><StatusPill status={o.status} /><span className="tabular-nums">{formatEUR(o.totalCents)}</span></div>
              </Link></li>
            ))}
          </ul>
        )}
      </section>

      {notes.length > 0 && (
        <section className="mt-14">
          <div className="mb-5 flex items-end justify-between"><h2 className="h-md !text-[1.7rem]">Benachrichtigungen {unread > 0 && <span className="ml-2 rounded-full bg-rose-500 px-2.5 py-0.5 align-middle text-[12px] font-medium">{unread}</span>}</h2>
            {unread > 0 && <form action={readNotificationsAction}><button className="text-[13.5px] text-cream/55 underline underline-offset-4 hover:text-cream">Alle gelesen</button></form>}</div>
          <ul className="divide-y divide-white/[0.07] rounded-3xl border border-white/[0.08]">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-5">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-white/15" : "bg-rose-300"}`} />
                <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{n.href ? <Link href={n.href} className="hover:text-rose-300">{n.title}</Link> : n.title}</p><p className="text-[13.5px] text-cream/55">{n.body}</p></div>
                <time className="shrink-0 text-[12px] text-cream/35">{n.createdAt.toLocaleDateString("de-DE")}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
