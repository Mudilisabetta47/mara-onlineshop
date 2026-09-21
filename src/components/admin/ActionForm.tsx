"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/components/ui/Form";

/** Generisches Admin-Formular für Server Actions mit Status-/Fehlermeldung und optionaler Bestätigung. */
export function ActionForm({ action, children, className = "", confirm, inline }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>; children: ReactNode; className?: string; confirm?: string; inline?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {children}
      {state?.error && <p role="alert" className={`${inline ? "ml-2 inline" : "mt-3"} text-[12.5px] text-[#f0a3b9]`}>{state.error}</p>}
      {state?.ok && <p role="status" className={`${inline ? "ml-2 inline" : "mt-3"} text-[12.5px] text-emerald-300`}>{state.ok}</p>}
    </form>
  );
}

export function Submit({ children, className = "", danger }: { children: ReactNode; className?: string; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition-colors disabled:opacity-50 ${danger ? "border border-[#f0a3b9]/40 text-[#f0a3b9] hover:bg-[#f0a3b9]/10" : "bg-cream text-ink-950 hover:bg-white"} ${className}`}>
      {pending ? "…" : children}
    </button>
  );
}

export function GhostSubmit({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-[13px] font-medium transition-colors hover:border-rose-300/60 hover:bg-white/[0.05] disabled:opacity-50 ${className}`}>{pending ? "…" : children}</button>;
}
