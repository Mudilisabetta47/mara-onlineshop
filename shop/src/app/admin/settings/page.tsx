import { getSettings } from "@/lib/settings";
import { centsToInput } from "@/lib/money";
import { Card, Lbl, PageHead, fieldCls } from "@/components/admin/ui";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { saveSettingsAction } from "../actions";
import { paypalEnabled, stripeEnabled, testPaymentEnabled } from "@/lib/env";

export const metadata = { title: "Einstellungen" };

export default async function Page() {
  const s = await getSettings();
  const T = ({ k, label, type = "text", hint }: { k: keyof typeof s; label: string; type?: string; hint?: string }) => <Lbl label={label} hint={hint}><input name={k} type={type} defaultValue={String(s[k] ?? "")} className={fieldCls} /></Lbl>;
  const E = ({ k, label }: { k: keyof typeof s; label: string }) => <Lbl label={label}><input name={k} defaultValue={centsToInput(s[k] as number)} inputMode="decimal" className={fieldCls} /></Lbl>;
  const status = (on: boolean) => <span className={on ? "text-emerald-300" : "text-cream/40"}>{on ? "aktiv" : "nicht konfiguriert"}</span>;
  return (
    <>
      <PageHead title="Einstellungen" />
      <Card title="Zahlungsanbieter (Umgebungsvariablen)" className="mb-5">
        <ul className="grid gap-2 text-[13.5px] sm:grid-cols-3"><li>Stripe: {status(stripeEnabled())}</li><li>PayPal: {status(paypalEnabled())}</li><li>Testzahlung: {status(testPaymentEnabled())} <span className="text-cream/35">(nie in Production)</span></li></ul>
        <p className="mt-3 text-[12.5px] text-cream/40">Schlüssel werden ausschließlich serverseitig in <code>.env</code> gepflegt – nie in der Datenbank oder im Frontend.</p>
      </Card>
      <ActionForm action={saveSettingsAction} className="space-y-5">
        <Card title="Anbieter (Impressum, Rechnung)"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <T k="legalName" label="Firmenname" /><T k="legalForm" label="Rechtsform" /><T k="managingDirector" label="Vertretungsberechtigt" />
          <T k="street" label="Straße, Hausnr." /><T k="postalCode" label="PLZ" /><T k="city" label="Ort" /><T k="country" label="Land" /><T k="email" label="E-Mail" type="email" /><T k="phone" label="Telefon" />
          <T k="registerCourt" label="Registergericht" /><T k="registerNumber" label="Registernummer" /><T k="vatId" label="USt-IdNr." />
        </div></Card>
        <Card title="Bankverbindung (Vorkasse)"><div className="grid gap-4 sm:grid-cols-2"><T k="bankHolder" label="Kontoinhaber" /><T k="bankIban" label="IBAN" /><T k="bankBic" label="BIC" /><T k="bankName" label="Bank" /></div><p className="mt-3 text-[12.5px] text-cream/40">Ohne IBAN ist Vorkasse im Live-Betrieb nicht wählbar.</p></Card>
        <Card title="Versand, Steuern, Rückgabe"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <E k="shippingStandardCents" label="Standardversand (€)" /><E k="shippingExpressCents" label="Expressversand (€)" /><E k="freeShippingThresholdCents" label="Kostenlos ab (€)" />
          <T k="taxRatePercent" label="MwSt.-Satz (%)" type="number" hint="Preise sind Bruttopreise" /><T k="returnDays" label="Rückgabefrist (Tage)" type="number" /><T k="reservationMinutes" label="Bestandsreservierung im Checkout (Min.)" type="number" />
        </div></Card>
        <Submit>Einstellungen speichern</Submit>
      </ActionForm>
    </>
  );
}
