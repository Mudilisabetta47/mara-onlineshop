import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[80svh] flex-col items-center justify-center pt-24 text-center">
      <p className="eyebrow mb-5">404</p>
      <h1 className="h-xl mb-6 !text-[clamp(3rem,9vw,7rem)]">Hier gibt&apos;s<br />nichts zu sehen.</h1>
      <p className="mb-9 max-w-md text-cream/60">Die Seite existiert nicht mehr oder wurde verschoben.</p>
      <div className="flex gap-3"><Link href="/" className="btn-primary">Zur Startseite</Link><Link href="/shop" className="btn-ghost">Zum Shop</Link></div>
    </div>
  );
}
