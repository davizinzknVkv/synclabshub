// Server-only helpers for admin session tokens.
// Token format: `${payloadB64}.${signatureB64}` where payload = { exp: number }
// signed with HMAC-SHA256 using ADMIN_TOKEN_SECRET.
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}

function getSecret(): string {
  const s = process.env.ADMIN_TOKEN_SECRET;
  if (!s) throw new Error("ADMIN_TOKEN_SECRET not configured");
  return s;
}

export function signAdminToken(): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const payloadStr = b64url(JSON.stringify(payload));
  const sig = b64url(
    createHmac("sha256", getSecret()).update(payloadStr).digest(),
  );
  return `${payloadStr}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadStr, sig] = parts;
  try {
    const expected = createHmac("sha256", getSecret())
      .update(payloadStr)
      .digest();
    const actual = b64urlDecode(sig);
    if (actual.length !== expected.length) return false;
    if (!timingSafeEqual(actual, expected)) return false;
    const payload = JSON.parse(b64urlDecode(payloadStr).toString("utf8")) as {
      exp?: number;
    };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
      return false;
    return true;
  } catch {
    return false;
  }
}

export function requireAdminFromRequest(request: Request): boolean {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return verifyAdminToken(token);
}
