import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { formatEUR } from "@/lib/money";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Allgemeine Geschäftsbedingungen" };
export const revalidate = 300;

export default async function Page() {
  const s = await getSettings();
  return (
    <LegalPage title="AGB" intro="Allgemeine Geschäftsbedingungen für Verbraucher.">
      <Sec title="1. Geltungsbereich"><p>Diese AGB gelten für alle Bestellungen über diesen Online-Shop von {s.legalName}, {s.street}, {s.postalCode} {s.city} („wir“) durch Verbraucher.</p></Sec>
      <Sec title="2. Vertragsschluss"><p>Die Darstellung der Produkte ist kein verbindliches Angebot. Mit „Zahlungspflichtig bestellen“ gibst du ein verbindliches Angebot ab. Wir bestätigen den Eingang per E-Mail; der Vertrag kommt zustande, sobald wir die Ware versenden oder die Annahme ausdrücklich erklären. Bei Zahlung per Stripe oder PayPal wird die Bestellung nach erfolgreicher Zahlung verbindlich bearbeitet.</p></Sec>
      <Sec title="3. Preise und Versandkosten"><p>Alle Preise sind Endpreise in Euro inklusive gesetzlicher Umsatzsteuer ({s.taxRatePercent} %). Versandkosten: Standardversand {formatEUR(s.shippingStandardCents)} (kostenlos ab {formatEUR(s.freeShippingThresholdCents)}), Expressversand {formatEUR(s.shippingExpressCents)}. Wir liefern nach Deutschland und Österreich.</p></Sec>
      <Sec title="4. Zahlung"><p>Es stehen die im Checkout angezeigten Zahlungsarten zur Verfügung (u. a. Kreditkarte, Apple Pay, Google Pay, PayPal, Vorkasse). Bei Vorkasse ist der Betrag innerhalb von 7 Tagen nach Bestellung zu überweisen; danach kann die Bestellung storniert werden.</p></Sec>
      <Sec title="5. Lieferung und Bestandsreservierung"><p>Die Lieferzeit beträgt in der Regel 2–4 Werktage (Standard) bzw. 1–2 Werktage (Express) nach Zahlungseingang. Ist ein Artikel nicht mehr verfügbar, informieren wir dich unverzüglich und erstatten bereits geleistete Zahlungen.</p></Sec>
      <Sec title="6. Eigentumsvorbehalt"><p>Die Ware bleibt bis zur vollständigen Bezahlung unser Eigentum.</p></Sec>
      <Sec title="7. Widerrufsrecht und Rückgabe"><p>Es gilt das gesetzliche Widerrufsrecht gemäß unserer <a href="/widerruf">Widerrufsbelehrung</a>. Darüber hinaus gewähren wir freiwillig {s.returnDays} Tage Rückgaberecht.</p></Sec>
      <Sec title="8. Mängelhaftung"><p>Es gelten die gesetzlichen Mängelhaftungsrechte.</p></Sec>
      <Sec title="9. Gutscheine"><p>Gutscheincodes sind nur im angegebenen Zeitraum und unter den angegebenen Bedingungen (z. B. Mindestbestellwert) einlösbar, nicht mit Bargeld verrechenbar und im Fall des Widerrufs nur anteilig für tatsächlich gezahlte Beträge erstattbar.</p></Sec>
      <Sec title="10. Anwendbares Recht"><p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften deines Aufenthaltsstaates bleiben unberührt.</p></Sec>
    </LegalPage>
  );
}
