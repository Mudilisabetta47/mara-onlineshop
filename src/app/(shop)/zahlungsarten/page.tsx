import type { Metadata } from "next";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Zahlungsarten" };
export const revalidate = 300;

export default function Page() {
  return (
    <LegalPage title="Zahlungsarten" intro="Bezahle so, wie du es am liebsten machst – sicher und ohne dass wir deine Zahlungsdaten speichern.">
      <Sec title="Kreditkarte, Apple Pay, Google Pay & weitere"><p>Die Zahlung erfolgt über unseren Zahlungsdienstleister Stripe. Neben Kredit- und Debitkarten (Visa, Mastercard) stehen – je nach Gerät und Land – Apple Pay, Google Pay und weitere Zahlarten zur Verfügung. Deine Kartendaten werden ausschließlich von Stripe verarbeitet.</p></Sec>
      <Sec title="PayPal"><p>Du wirst zur Zahlung zu PayPal weitergeleitet und kehrst danach automatisch in unseren Shop zurück. Käuferschutz gemäß den PayPal-Bedingungen.</p></Sec>
      <Sec title="Vorkasse / Überweisung"><p>Nach der Bestellung erhältst du unsere Bankverbindung. Wir versenden, sobald das Geld eingegangen ist. Bitte überweise innerhalb von 7 Tagen und gib die Bestellnummer als Verwendungszweck an.</p></Sec>
      <Sec title="Steuern und Gesamtbetrag"><p>Im Checkout siehst du vor der Bestellung transparent: Warenkorb, Versandkosten, enthaltene Mehrwertsteuer und den Gesamtbetrag.</p></Sec>
    </LegalPage>
  );
}
