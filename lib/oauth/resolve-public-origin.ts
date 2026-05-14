/**
 * Public origin (scheme + host + port) for OAuth `redirect_uri` values.
 *
 * Prefer the URL the client actually hit (and proxy headers) over `NEXT_PUBLIC_APP_URL`,
 * so tunnels (e.g. ngrok) match what is registered in TikTok/Meta/LinkedIn without env drift.
 */
export function resolvePublicOriginFromRequest(request: Request): string {
  const protoHeader = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const xfHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();

  if (xfHost) {
    const scheme = protoHeader && protoHeader.length > 0 ? protoHeader : "https";
    try {
      return new URL(`${scheme}://${xfHost}`).origin;
    } catch {
      /* fall through */
    }
  }

  try {
    return new URL(request.url).origin;
  } catch {
    /* fall through */
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  return "http://localhost:3000";
}

/**
 * Exact OAuth redirect_uri: must match what was used in the authorize request and provider portal.
 * Prefers value persisted when the connection flow started (initiateConnection), then request origin.
 */
export function resolveOAuthRedirectUri(
  request: Request,
  metadata: Record<string, unknown>,
  fallbackSuffix: "/auth/callback/tiktok" | "/auth/callback/meta" | "/auth/callback/linkedin"
): string {
  const stored = typeof metadata.oauth_redirect_uri === "string" ? metadata.oauth_redirect_uri.trim() : "";
  if (stored.length > 0) {
    return stored;
  }
  return `${resolvePublicOriginFromRequest(request)}${fallbackSuffix}`;
}
