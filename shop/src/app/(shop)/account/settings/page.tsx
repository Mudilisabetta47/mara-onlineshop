import { requireUser } from "@/lib/auth/guards";
import { PageTitle } from "@/components/account/bits";
import { DeleteAccountForm } from "@/components/account/Forms";
import { newsletterAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Einstellungen" };

export default async function Page() {
  const u = await requireUser();
  return (
    <>
      <PageTitle eyebrow="Mein Konto">Einstellungen.</PageTitle>
      <section className="panel mb-6 max-w-[620px] p-6">
        <h2 className="mb-4 text-[17px] font-medium">Newsletter</h2>
        <form action={newsletterAction} className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-3 text-[14.5px] text-cream/75"><input type="checkbox" name="newsletter" defaultChecked={u.newsletter} className="h-4 w-4 accent-[#A95D7C]" /> Neuigkeiten und Angebote per E-Mail</label>
          <button className="btn-ghost btn-sm">Speichern</button>
        </form>
        <p className="mt-4 text-[12.5px] text-cream/40">Bestell- und Versandbenachrichtigungen erhältst du unabhängig davon.</p>
      </section>
      <section className="panel max-w-[620px] p-6">
        <h2 className="mb-2 text-[17px] font-medium">Konto löschen</h2>
        <p className="mb-5 text-[14px] text-cream/55">Du kannst dein Konto jederzeit löschen (Art. 17 DSGVO).</p>
        <DeleteAccountForm />
      </section>
    </>
  );
}
