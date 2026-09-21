import type { Metadata } from "next";
import { WishlistView } from "@/components/account/WishlistView";
import { PageTitle } from "@/components/account/bits";

export const metadata: Metadata = { title: "Wunschliste", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function WishlistPage() {
  return (
    <div className="container-x pb-16 pt-[120px] md:pt-[140px]">
      <PageTitle eyebrow="Favoriten" sub="Deine gespeicherten Lieblingsstücke – melde dich an, um sie auf allen Geräten zu sehen.">Wunschliste.</PageTitle>
      <WishlistView />
    </div>
  );
}
