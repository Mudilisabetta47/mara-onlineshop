import { WishlistView } from "@/components/account/WishlistView";
import { PageTitle } from "@/components/account/bits";
export const metadata = { title: "Wunschliste" };
export const dynamic = "force-dynamic";
export default function Page() { return <><PageTitle eyebrow="Mein Konto">Wunschliste.</PageTitle><WishlistView /></>; }
