import { NextResponse, type NextRequest } from "next/server";
import { validateConfig, type ConfigReport } from "@/lib/config";

/**
 * Konfigurations-Wächter (fail closed, aber lesbar): Ist die Umgebung in staging/production falsch konfiguriert
 * (lokale DB, Testschlüssel in Production, schwaches CRON_SECRET …), liefert der Shop 503 mit den betroffenen
 * Variablen-NAMEN – niemals mit Werten. Lokal (APP_ENV=local) greift der Wächter nicht.
 *  - staging:    Details sichtbar (damit Fehlkonfigurationen im Browser erkennbar sind)
 *  - production: nur allgemeine Meldung, Details stehen im Server-Log
 */
let report: ConfigReport | null = null;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function middleware(req: NextRequest) {
  report ??= validateConfig();
  if (report.env === "local" || report.errors.length === 0) return NextResponse.next();

  const detail = report.env === "staging";
  const origin = `${report.env} (aus ${report.envSource === "APP_ENV" ? "APP_ENV" : report.envSource === "VERCEL_ENV" ? "Vercel-Umgebung VERCEL_ENV" : "Standard"}; ${report.appEnvNote})`;
  const wantsHtml = (req.headers.get("accept") ?? "").includes("text/html");
  const headers = { "Cache-Control": "no-store", "Retry-After": "300", "X-Robots-Tag": "noindex" };
  if (!wantsHtml) {
    return NextResponse.json(
      { error: "Konfigurationsfehler", env: report.env, envSource: report.envSource, appEnv: report.appEnvNote, ...(detail ? { problems: report.errors } : { hint: "Details im Server-Log (Vercel → Logs, Suche: [config:)" }) },
      { status: 503, headers },
    );
  }
  const list = detail ? `<ul>${report.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : "<p>Details stehen im Server-Log.</p>";
  return new NextResponse(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Konfigurationsfehler</title>
<style>body{margin:0;background:#0B090B;color:#F6EEF2;font:16px/1.6 -apple-system,Inter,system-ui,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px}main{max-width:720px}h1{font-size:28px;letter-spacing:-.03em;margin:0 0 8px}p,li{color:#F6EEF2b3}code{color:#DCAFC0}li{margin:8px 0}</style></head>
<body><main><h1>Der Shop ist nicht korrekt konfiguriert.</h1><p>Umgebung: <code>${esc(origin)}</code> – bitte die folgenden Punkte in den Environment Variables prüfen und neu deployen.</p>${list}</main></body></html>`,
    { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
  );
}

// Statische Assets ausnehmen; alles andere (Seiten, API, Webhooks) läuft durch den Wächter.
export const config = { matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon.png|brand/|seed/).*)"] };
