"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function LoginForm({ next, reset }: { next: string; reset: boolean }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <>
      <p className="eyebrow mb-4">Konto</p>
      <h1 className="h-lg mb-8 !text-[clamp(2.4rem,5vw,3.6rem)]">Willkommen<br />zurück.</h1>
      {reset && <p className="mb-5 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-[13.5px] text-rose-300">Dein Passwort wurde geändert. Bitte melde dich neu an.</p>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="E-Mail" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
        <Field label="Passwort" name="password" type="password" autoComplete="current-password" required />
        <div className="flex justify-end"><Link href="/forgot-password" className="text-[13px] text-cream/55 underline-offset-4 hover:text-cream hover:underline">Passwort vergessen?</Link></div>
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full">Anmelden</SubmitButton>
      </form>
      <p className="mt-8 text-center text-[14px] text-cream/55">Neu hier? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-cream underline underline-offset-4">Konto erstellen</Link></p>
    </>
  );
}
