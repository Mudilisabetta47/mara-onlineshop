import { requireUser } from "@/lib/auth/guards";
import { PageTitle } from "@/components/account/bits";
import { ProfileForm } from "@/components/account/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

export default async function Page() {
  const u = await requireUser();
  return <><PageTitle eyebrow="Mein Konto">Profil.</PageTitle><ProfileForm user={{ firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone }} /></>;
}
