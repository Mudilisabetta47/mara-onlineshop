"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <>
      <p className="eyebrow mb-4">Konto</p>
      <h1 className="h-lg mb-4 !text-[clamp(2.4rem,5vw,3.6rem)]">Passwort<br />vergessen?</h1>
      <p className="mb-8 text-[15px] text-cream/60">Gib deine E-Mail-Adresse ein – wir senden dir einen Link zum Zurücksetzen.</p>
      <form action={action} className="space-y-4">
        <Field label="E-Mail" name="email" type="email" autoComplete="email" required autoFocus defaultValue={state?.values?.email} />
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full">Link senden</SubmitButton>
      </form>
      <p className="mt-8 text-center text-[14px]"><Link href="/login" className="text-cream/60 underline underline-offset-4 hover:text-cream">Zurück zur Anmeldung</Link></p>
    </>
  );
}
