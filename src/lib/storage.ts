import { promises as fs } from "node:fs";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { FileKind, FileVisibility } from "@prisma/client";
import { db } from "./db";

/**
 * Storage-Abstraktion.
 *  - STORAGE_DRIVER=local (Standard, nur Entwicklung): Verzeichnis STORAGE_DIR.
 *  - STORAGE_DRIVER=s3 (Pflicht auf Vercel/Production): jeder S3-kompatible Speicher
 *    (AWS S3, Cloudflare R2, Hetzner Object Storage, Supabase Storage …). Bucket bleibt PRIVAT –
 *    Auslieferung ausschließlich über /media (öffentliche Bilder) bzw. /api/files (autorisiert).
 */
export interface StorageDriver {
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  /** Erreichbarkeit/Schreibrechte prüfen (Health Check) */
  check(): Promise<void>;
}

/** Vercel begrenzt Request-Bodies auf 4,5 MB – Upload-Limit bewusst darunter. */
export const MAX_UPLOAD_BYTES = 4 * 1048576;

const root = () => path.resolve(process.env.STORAGE_DIR || "./storage");

function safePath(key: string) {
  const file = path.resolve(root(), key);
  if (!file.startsWith(root() + path.sep)) throw new Error("Ungültiger Storage-Key");
  return file;
}

const localDriver: StorageDriver = {
  async put(key, data) {
    const file = path.join(root(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  },
  async get(key) { return fs.readFile(safePath(key)); },
  async remove(key) { await fs.rm(safePath(key), { force: true }); },
  async check() { await fs.mkdir(root(), { recursive: true }); await fs.access(root(), fs.constants.W_OK); },
};

function s3Driver(): StorageDriver {
  const bucket = process.env.S3_BUCKET!;
  const client = new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "1",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  const prefix = (process.env.S3_PREFIX || "").replace(/^\/|\/$/g, "");
  const k = (key: string) => (prefix ? `${prefix}/${key}` : key);
  return {
    async put(key, data, mime) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: k(key), Body: data, ContentType: mime, ServerSideEncryption: process.env.S3_SSE === "1" ? "AES256" : undefined }));
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: k(key) }));
      return Buffer.from(await res.Body!.transformToByteArray());
    },
    async remove(key) { await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: k(key) })); },
    async check() { await client.send(new HeadBucketCommand({ Bucket: bucket })); },
  };
}

let driver: StorageDriver | null = null;
const active = () => (driver ??= process.env.STORAGE_DRIVER === "s3" ? s3Driver() : localDriver);

export const storage: StorageDriver = {
  put: (k, d, m) => active().put(k, d, m),
  get: (k) => active().get(k),
  remove: (k) => active().remove(k),
  check: () => active().check(),
};

// ── Magic-Byte-Prüfung (der Client-MIME-Type wird nie vertraut) ──
export type DetectedType = { mime: string; ext: string };

export function sniff(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(4, 8).toString() === "ftyp" && /avif|avis/.test(buf.subarray(8, 12).toString())) return { mime: "image/avif", ext: "avif" };
  if (buf.subarray(0, 5).toString() === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const DOC_MIMES = [...IMAGE_MIMES, "application/pdf"];

export async function saveFile(opts: {
  data: Buffer;
  filename: string;
  kind: FileKind;
  visibility: FileVisibility;
  allow: string[];
  maxBytes: number;
  uploadedById?: string | null;
  /** Für vom System erzeugte Dateien (z. B. Rechnungs-PDF) */
  forceMime?: string;
}) {
  if (opts.data.length === 0) throw new Error("Die Datei ist leer.");
  if (opts.data.length > opts.maxBytes) throw new Error(`Die Datei ist zu groß (max. ${Math.round(opts.maxBytes / 1048576)} MB).`);
  const type = sniff(opts.data);
  if (!type || !opts.allow.includes(type.mime)) throw new Error("Dateityp nicht erlaubt.");
  const now = new Date();
  const key = `${opts.visibility.toLowerCase()}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(16).toString("hex")}.${type.ext}`;
  await storage.put(key, opts.data, type.mime);
  const cleanName = opts.filename.replace(/[^\w.\- äöüÄÖÜß]/g, "_").slice(0, 120) || `datei.${type.ext}`;
  return db.storedFile.create({
    data: {
      key, filename: cleanName, mime: type.mime, size: opts.data.length,
      visibility: opts.visibility, kind: opts.kind, uploadedById: opts.uploadedById ?? null,
    },
  });
}

export const publicUrl = (key: string) => `/media/${key}`;
