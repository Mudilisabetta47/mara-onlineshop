import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/money";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Versand & Lieferung" };
export const revalidate = 300;

export default async function Page() {
  const s = await getSettings();
  return (
    <LegalPage title="Versand" intro={`Schnell, transparent und ab einem Bestellwert von ${formatEUR(s.freeShippingThresholdCents)} kostenlos.`}>
      <Sec title="Versandarten und Kosten">
        <ul><li><b>Standardversand (DHL)</b> – 2–4 Werktage – {formatEUR(s.shippingStandardCents)}, ab {formatEUR(s.freeShippingThresholdCents)} Warenwert kostenlos</li><li><b>Expressversand (DHL Express)</b> – 1–2 Werktage – {formatEUR(s.shippingExpressCents)}</li></ul>
        <p>Wir liefern nach Deutschland und Österreich. Alle Preise enthalten die gesetzliche Umsatzsteuer.</p>
      </Sec>
      <Sec title="Lieferzeit"><p>Die Lieferzeit beginnt nach Zahlungseingang (bei Vorkasse nach Gutschrift auf unserem Konto). Bestellungen, die bis 14 Uhr bezahlt sind, versenden wir in der Regel am selben Werktag.</p></Sec>
      <Sec title="Sendungsverfolgung"><p>Sobald deine Bestellung versendet wurde, erhältst du eine E-Mail mit Sendungsnummer. Den Status siehst du auch in deinem Konto unter „Bestellungen“.</p></Sec>
      <Sec title="Rücksendung"><p>Informationen zur Rückgabe findest du in der <a href="/widerruf">Widerrufsbelehrung</a>. Du hast {s.returnDays} Tage Zeit.</p></Sec>
    </LegalPage>
  );
}
