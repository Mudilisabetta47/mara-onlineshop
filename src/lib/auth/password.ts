import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Mind. 10 Zeichen, Buchstabe und Ziffer. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 10) return "Das Passwort muss mindestens 10 Zeichen lang sein.";
  if (pw.length > 200) return "Das Passwort ist zu lang.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Bitte mindestens einen Buchstaben und eine Ziffer verwenden.";
  return null;
}
