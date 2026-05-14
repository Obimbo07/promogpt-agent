import type { TikTokConnectorCredentials } from "@/lib/integrations/social/tiktok-oauth-client";

/**
 * Refresh TikTok user access token when a refresh_token is present.
 * @see https://developers.tiktok.com/doc/oauth-user-access-token-management/
 */
export async function refreshTikTokAccessToken(args: {
  refreshToken: string;
  clientKey: string;
  clientSecret: string;
}): Promise<TikTokConnectorCredentials> {
  const body = new URLSearchParams({
    client_key: args.clientKey,
    client_secret: args.clientSecret,
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as Record<string, unknown> & {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || typeof json.access_token !== "string") {
    const detail =
      typeof json.error === "string" || typeof json.error_description === "string" ?
        [json.error, json.error_description].filter(Boolean).join(": ")
      : JSON.stringify(json).slice(0, 400);
    throw new Error(`TikTok token refresh failed: ${detail || `HTTP ${res.status}`}`);
  }

  const expiresAt =
    typeof json.expires_in === "number" ?
      new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  return {
    v: 1,
    provider: "tiktok",
    accessToken: json.access_token,
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : args.refreshToken,
    expiresAt,
    openId: typeof json.open_id === "string" ? json.open_id : undefined,
    scope: typeof json.scope === "string" ? json.scope : undefined,
  };
}
