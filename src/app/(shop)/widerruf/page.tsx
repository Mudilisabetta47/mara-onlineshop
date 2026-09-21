import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage, Sec } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Widerrufsbelehrung & Rückgabe" };
export const revalidate = 300;

export default async function Page() {
  const s = await getSettings();
  return (
    <LegalPage title="Widerruf" intro={`Du hast ein gesetzliches Widerrufsrecht von 14 Tagen – wir gewähren zusätzlich freiwillig ${s.returnDays} Tage Rückgaberecht.`}>
      <Sec title="Widerrufsbelehrung">
        <p><b>Widerrufsrecht.</b> Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir benannter Dritter, der nicht Beförderer ist, die Waren in Besitz genommen hast bzw. hat.</p>
        <p>Um dein Widerrufsrecht auszuüben, musst du uns ({s.legalName}, {s.street}, {s.postalCode} {s.city}, E-Mail: {s.email}{s.phone ? `, Telefon: ${s.phone}` : ""}) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>
      </Sec>
      <Sec title="Folgen des Widerrufs">
        <p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast.</p>
        <p>Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast. Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem du uns über den Widerruf unterrichtest, an uns zurückzusenden. Die unmittelbaren Kosten der Rücksendung der Waren trägst du. Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.</p>
      </Sec>
      <Sec title={`Freiwillige Rückgabe (${s.returnDays} Tage)`}><p>Unabhängig vom gesetzlichen Widerrufsrecht kannst du unbenutzte Ware in Originalzustand innerhalb von {s.returnDays} Tagen nach Erhalt zurücksenden. Schreibe uns kurz an {s.email}, damit wir deine Rücksendung zuordnen können.</p></Sec>
      <Sec title="Muster-Widerrufsformular">
        <p className="rounded-2xl border border-white/10 p-5 text-[14.5px]">(Wenn du den Vertrag widerrufen willst, fülle dieses Formular aus und sende es zurück.)<br /><br />An {s.legalName}, {s.street}, {s.postalCode} {s.city}, E-Mail: {s.email}<br />Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den Kauf der folgenden Waren (*): …<br />Bestellt am (*) / erhalten am (*): …<br />Name des/der Verbraucher(s): …<br />Anschrift des/der Verbraucher(s): …<br />Datum, Unterschrift (nur bei Mitteilung auf Papier)<br />(*) Unzutreffendes streichen.</p>
      </Sec>
    </LegalPage>
  );
}
