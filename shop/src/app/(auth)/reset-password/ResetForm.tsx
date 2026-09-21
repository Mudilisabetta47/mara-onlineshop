"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "../actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/Form";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, null);
  const fe = state?.fieldErrors ?? {};
  return (
    <>
      <p className="eyebrow mb-4">Konto</p>
      <h1 className="h-lg mb-8 !text-[clamp(2.4rem,5vw,3.6rem)]">Neues<br />Passwort.</h1>
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field label="Neues Passwort" name="password" type="password" autoComplete="new-password" required error={fe.password} hint="Mindestens 10 Zeichen, mit Buchstaben und Ziffern." />
        <Field label="Passwort wiederholen" name="password2" type="password" autoComplete="new-password" required error={fe.password2} />
        <FormMessage state={state && !state.fieldErrors ? state : null} />
        <SubmitButton className="btn-primary w-full">Passwort speichern</SubmitButton>
      </form>
    </>
  );
}
