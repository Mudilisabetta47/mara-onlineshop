import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow mb-5">404</p>
      <h1 className="h-xl mb-6 !text-[clamp(3rem,9vw,7rem)]">Nicht gefunden.</h1>
      <Link href="/" className="btn-primary">Zur Startseite</Link>
    </div>
  );
}
