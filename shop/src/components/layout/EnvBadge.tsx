import { appEnv } from "@/lib/config";

/** Sichtbarer Hinweis, damit Staging nie mit dem Live-Shop verwechselt wird. */
export function EnvBadge() {
  const env = appEnv();
  if (env === "production") return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[130] rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200 backdrop-blur">
      {env === "staging" ? "Staging · Testumgebung" : "Local"}
    </div>
  );
}
