import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { MobileMenu } from "@/components/layout/MobileMenu";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-ink-950">Zum Inhalt springen</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
    </>
  );
}
