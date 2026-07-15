/**
 * Server-only QR token utilities.
 *
 * This module MUST only be imported by Server Actions or server-side code.
 * It reads QR_SECRET — a server-only environment variable (no NEXT_PUBLIC_ prefix).
 * The secret is never bundled into client JavaScript.
 *
 * Token format (base64-encoded JSON):
 *   { meetingId, expiresAt, nonce, sig }
 * where `sig` is a simple HMAC-like signature: SHA-256(secret + meetingId + expiresAt + nonce).
 * Full HMAC via Web Crypto is used to ensure tokens cannot be forged client-side.
 */

export interface QRPayload {
  meetingId: string;
  expiresAt: number; // unix ms
}

/** Returns the server-only secret — throws at build time if missing in production. */
function getSecret(): string {
  const secret = process.env.QR_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("QR_SECRET environment variable is not set. Cannot generate QR tokens.");
    }
    // Development fallback — safe because this code never runs in the browser.
    return "dev-only-fc-attendance-secret-not-for-production";
  }
  return secret;
}

/** Derives a signing key from the secret using Web Crypto (Node.js built-in). */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Produces a hex HMAC-SHA-256 signature for the given message. */
async function sign(secret: string, message: string): Promise<string> {
  const key = await deriveKey(secret);
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verifies an HMAC-SHA-256 signature against a message. */
async function verify(secret: string, message: string, sigHex: string): Promise<boolean> {
  try {
    const expected = await sign(secret, message);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== sigHex.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sigHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Generates a signed, expiring QR token.
 * SERVER-SIDE ONLY. Called from a Server Action.
 *
 * @param meetingId  - The meeting UUID.
 * @param expiresAt  - Unix timestamp (ms) when this token expires.
 * @returns An opaque base64 string safe to encode into a QR code.
 */
export async function generateQRToken(
  meetingId: string,
  expiresAt: number,
): Promise<string> {
  const secret = getSecret();
  const nonce = crypto.randomUUID();
  const message = `${meetingId}|${expiresAt}|${nonce}`;
  const sig = await sign(secret, message);

  const payload = { meetingId, expiresAt, nonce, sig };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Validates a scanned QR token.
 * SERVER-SIDE ONLY. Called from a Server Action.
 *
 * @returns The parsed QRPayload if valid and not expired, or null if invalid/expired.
 */
export async function validateQRToken(token: string): Promise<QRPayload | null> {
  try {
    const secret = getSecret();
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));

    const { meetingId, expiresAt, nonce, sig } = parsed;
    if (!meetingId || !expiresAt || !nonce || !sig) return null;

    // 1. Verify expiry on the server — not trusting any client clock
    if (Date.now() >= expiresAt) return null;

    // 2. Verify HMAC signature
    const message = `${meetingId}|${expiresAt}|${nonce}`;
    const isValid = await verify(secret, message, sig);
    if (!isValid) return null;

    return { meetingId, expiresAt };
  } catch {
    return null;
  }
}
