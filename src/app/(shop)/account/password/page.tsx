import { PageTitle } from "@/components/account/bits";
import { PasswordForm } from "@/components/account/Forms";

export const metadata = { title: "Passwort" };

export default function Page() {
  return <><PageTitle eyebrow="Mein Konto" sub="Nach der Änderung werden alle anderen Geräte abgemeldet.">Passwort.</PageTitle><PasswordForm /></>;
}
