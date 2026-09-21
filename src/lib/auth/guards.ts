import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./session";

/** Seiten: leitet auf Login um. */
export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

/**
 * Admin-Autorisierung – IMMER serverseitig. Wird in jedem Admin-Layout UND in jeder Admin-Action/-API erneut geprüft,
 * nie nur im Frontend versteckt. Nicht-Admins sehen einen 404 (keine Existenz-Information).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

/** Für Route Handler / Actions, die Fehler statt Redirect liefern sollen. */
export async function adminOrNull() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}
