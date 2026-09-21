import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Datenschutzerklärung" };
export const revalidate = 300;

export default async function Page() {
  const s = await getSettings();
  return (
    <LegalPage title="Datenschutz" intro="Der Schutz deiner Daten ist uns wichtig. Hier erfährst du, welche Daten wir verarbeiten und warum.">
      <Sec title="1. Verantwortlicher"><p>{s.legalName}, {s.street}, {s.postalCode} {s.city}, E-Mail: <a href={`mailto:${s.email}`}>{s.email}</a></p></Sec>
      <Sec title="2. Bereitstellung der Website, Server-Logfiles"><p>Beim Aufruf verarbeitet unser Hosting-Anbieter technisch notwendige Daten (IP-Adresse, Datum/Uhrzeit, aufgerufene Seite, Browser). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (sicherer und stabiler Betrieb).</p></Sec>
      <Sec title="3. Cookies und lokale Speicherung">
        <p>Wir setzen ausschließlich technisch notwendige Cookies ein (Art. 6 Abs. 1 lit. f DSGVO, § 25 Abs. 2 TDDDG):</p>
        <ul><li><b>lumi_session</b> – Anmeldung (HttpOnly; Kunden bis zu 30 Tage, Administratoren 12 Stunden)</li><li><b>lumi_cart</b> / <b>lumi_wish</b> – Warenkorb und Wunschliste für nicht angemeldete Besucher (HttpOnly, bis zu 90 Tage)</li><li>Im Live-Betrieb tragen diese Cookies das Präfix <b>__Host-</b> (nur über HTTPS, ausschließlich für diese Domain).</li></ul>
        <p>Es findet kein Tracking und keine Werbe-Profilbildung statt.</p>
      </Sec>
      <Sec title="4. Kundenkonto"><p>Für das Konto verarbeiten wir Name, E-Mail, Passwort (nur als gesicherter Hash), optional Telefon und Adressen (Art. 6 Abs. 1 lit. b DSGVO). Du kannst dein Konto jederzeit unter „Einstellungen“ löschen.</p></Sec>
      <Sec title="5. Bestellung und Zahlung">
        <p>Zur Vertragsabwicklung verarbeiten wir Kontakt-, Adress-, Bestell- und Zahlungsstatusdaten (Art. 6 Abs. 1 lit. b DSGVO). Rechnungen und Bestelldaten bewahren wir aufgrund handels- und steuerrechtlicher Pflichten bis zu zehn Jahre auf (Art. 6 Abs. 1 lit. c DSGVO).</p>
        <p>Zahlungen werden über <b>Stripe</b> (Stripe Payments Europe Ltd., Irland) und <b>PayPal</b> (PayPal (Europe) S.à r.l. et Cie, S.C.A., Luxemburg) abgewickelt. Zahlungsdaten (z. B. Kartennummer) erhalten wir nicht; sie werden direkt beim jeweiligen Dienstleister verarbeitet. Bei Vorkasse erhältst du unsere Bankverbindung per E-Mail.</p>
        <p>Für den Versand geben wir Name und Lieferadresse an das Versandunternehmen weiter.</p>
      </Sec>
      <Sec title="6. E-Mails"><p>Bestell- und Versandbenachrichtigungen versenden wir zur Vertragserfüllung. Für den Newsletter benötigen wir deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO); du kannst sie jederzeit widerrufen.</p></Sec>
      <Sec title="7. Bewertungen"><p>Wenn du ein Produkt bewertest, speichern wir Bewertung, Text und deinen Vornamen (Anzeige) sowie den Kaufbezug (Art. 6 Abs. 1 lit. f DSGVO).</p></Sec>
      <Sec title="8. Deine Rechte"><p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Kontaktiere uns unter <a href={`mailto:${s.email}`}>{s.email}</a>.</p></Sec>
    </LegalPage>
  );
}
