import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Impressum" };
export const revalidate = 300;

export default async function Page() {
  const s = await getSettings();
  return (
    <LegalPage title="Impressum">
      <Sec title="Angaben gemäß § 5 DDG">
        <p>{s.legalName}{s.legalForm ? ` (${s.legalForm})` : ""}<br />{s.street}<br />{s.postalCode} {s.city}<br />{s.country}</p>
        {s.managingDirector && <p>Vertretungsberechtigt: {s.managingDirector}</p>}
      </Sec>
      <Sec title="Kontakt"><p>E-Mail: <a href={`mailto:${s.email}`}>{s.email}</a>{s.phone && <><br />Telefon: {s.phone}</>}</p></Sec>
      {(s.registerCourt || s.vatId) && <Sec title="Register und Steuern"><p>{s.registerCourt && <>Registergericht: {s.registerCourt}<br /></>}{s.registerNumber && <>Registernummer: {s.registerNumber}<br /></>}{s.vatId && <>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {s.vatId}</>}</p></Sec>}
      <Sec title="Verbraucherstreitbeilegung"><p>Wir sind weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p></Sec>
    </LegalPage>
  );
}
