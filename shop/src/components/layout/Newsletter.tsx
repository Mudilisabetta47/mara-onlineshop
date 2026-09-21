"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/ui/Icons";

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setState("loading");
        const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        const d = await res.json().catch(() => ({}));
        if (res.ok) { setState("done"); setMsg("Willkommen! Wir melden uns nur, wenn es etwas Schönes gibt."); }
        else { setState("error"); setMsg(d.error ?? "Das hat leider nicht geklappt."); }
      }}
      className="w-full"
    >
      {state === "done" ? (
        <p className="flex items-center gap-2 text-[15px] text-rose-300"><CheckIcon width={18} height={18} /> {msg}</p>
      ) : (
        <>
          <div className={`flex gap-2 ${compact ? "" : "flex-col sm:flex-row"}`}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Deine E-Mail-Adresse" aria-label="E-Mail-Adresse" autoComplete="email" className="field flex-1" />
            <button className="btn-primary shrink-0" disabled={state === "loading"}>{state === "loading" ? "…" : "Anmelden"}</button>
          </div>
          {state === "error" && <p className="field-error">{msg}</p>}
          <p className="mt-3 text-[12px] text-cream/40">Mit der Anmeldung stimmst du dem Erhalt des Newsletters zu. Abmeldung jederzeit möglich – siehe <a href="/datenschutz" className="underline underline-offset-2">Datenschutz</a>.</p>
        </>
      )}
    </form>
  );
}
