"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <p className="eyebrow mb-5">Fehler</p>
      <h1 className="h-lg mb-5">Da ist etwas<br />schiefgelaufen.</h1>
      <p className="mb-8 max-w-md text-cream/60">Bitte versuche es erneut. Wenn das Problem bleibt, melde dich bei uns.</p>
      <button onClick={reset} className="btn-primary">Erneut versuchen</button>
    </div>
  );
}
