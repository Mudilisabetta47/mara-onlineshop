import { Lbl, fieldCls } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { saveContractAction } from "../actions";

type C = { id: string; userEmail: string; title: string; type: string; status: string; startsAt: Date | null; endsAt: Date | null; notes: string | null };
const d = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : "");

export function ContractForm({ c, email }: { c?: C; email?: string }) {
  return (
    <ActionForm action={saveContractAction} className="grid gap-4 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Lbl label="Kunden-E-Mail *" hint="Muss ein bestehendes Kundenkonto sein"><input name="userEmail" type="email" required defaultValue={c?.userEmail ?? email} className={fieldCls} /></Lbl>
      <Lbl label="Titel *"><input name="title" required defaultValue={c?.title} className={fieldCls} /></Lbl>
      <Lbl label="Art"><input name="type" required defaultValue={c?.type ?? "Kundenvertrag"} className={fieldCls} /></Lbl>
      <Lbl label="Status"><select name="status" defaultValue={c?.status ?? "DRAFT"} className={fieldCls}><option value="DRAFT">Entwurf (für Kunden unsichtbar)</option><option value="ACTIVE">Aktiv</option><option value="ENDED">Beendet</option><option value="CANCELLED">Gekündigt</option></select></Lbl>
      <Lbl label="Beginn"><input name="startsAt" type="date" defaultValue={d(c?.startsAt)} className={fieldCls} /></Lbl>
      <Lbl label="Ende"><input name="endsAt" type="date" defaultValue={d(c?.endsAt)} className={fieldCls} /></Lbl>
      <Lbl label="Notizen (für den Kunden sichtbar)" className="sm:col-span-2"><textarea name="notes" defaultValue={c?.notes ?? ""} className={`${fieldCls} min-h-[100px] py-3`} /></Lbl>
      <div className="sm:col-span-2"><Submit>Speichern</Submit></div>
    </ActionForm>
  );
}
