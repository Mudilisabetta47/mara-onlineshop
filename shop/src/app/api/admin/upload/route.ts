import { db } from "@/lib/db";
import { ok, route, ApiError } from "@/lib/http";
import { adminOrNull } from "@/lib/auth/guards";
import { IMAGE_MIMES, MAX_UPLOAD_BYTES, publicUrl, saveFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Produktbild-Upload (nur Admin). Dateityp per Magic Bytes geprüft, max. 4 MB. */
export const POST = route(async (req) => {
  const admin = await adminOrNull();
  if (!admin) throw new ApiError(403, "Keine Berechtigung.", "forbidden");
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) throw new ApiError(400, "Keine Datei übermittelt.");
  if (files.length > 12) throw new ApiError(400, "Maximal 12 Dateien pro Upload.");
  const out: { id: string; url: string; filename: string }[] = [];
  for (const f of files) {
    try {
      const rec = await saveFile({
        data: Buffer.from(await f.arrayBuffer()), filename: f.name, kind: "PRODUCT_IMAGE", visibility: "PUBLIC",
        allow: IMAGE_MIMES, maxBytes: MAX_UPLOAD_BYTES, uploadedById: admin.id,
      });
      out.push({ id: rec.id, url: publicUrl(rec.key), filename: rec.filename });
    } catch (e) {
      throw new ApiError(400, `${f.name}: ${(e as Error).message}`);
    }
  }
  await audit(admin.id, "file.upload", "StoredFile", null, { count: out.length });
  void db;
  return ok({ files: out });
});
