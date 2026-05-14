import { createHash, randomBytes } from "node:crypto";

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** RFC 7636 — high-entropy verifier (43+ chars, URL-safe). */
export function generatePkceCodeVerifier(entropyBytes = 32): string {
  return base64Url(randomBytes(entropyBytes));
}

/** RFC 7636 S256 — `code_challenge` from `code_verifier`. */
export function pkceCodeChallengeS256(codeVerifier: string): string {
  return base64Url(createHash("sha256").update(codeVerifier).digest());
}
