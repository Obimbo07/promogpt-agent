/**
 * TikTok Login Kit / Open API — authorization code exchange.
 * @see https://developers.tiktok.com/doc/login-kit-web/
 */

export type TikTokConnectorCredentials = {
  v: 1;
  provider: "tiktok";
  accessToken: string;
  refreshToken?: string;
  expiresAt: string | null;
  openId?: string;
  scope?: string;
};

export async function exchangeTikTokAuthorizationCode(opts: {
  code: string;
  redirectUri: string;
  clientKey: string;
  clientSecret: string;
  /** RFC 7636 / TikTok — required when authorize URL included `code_challenge`. */
  codeVerifier?: string;
}): Promise<{ data: TikTokConnectorCredentials }> {
  /** TikTok requires form body, not JSON — @see https://developers.tiktok.com/doc/oauth-user-access-token-management/ */
  const body = new URLSearchParams({
    client_key: opts.clientKey,
    client_secret: opts.clientSecret,
    code: opts.code,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
  });
  if (opts.codeVerifier) {
    body.set("code_verifier", opts.codeVerifier);
  }

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
    throw new Error(`TikTok token exchange failed: ${detail || `HTTP ${res.status}`}`);
  }

  const expiresAt =
    typeof json.expires_in === "number" ?
      new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  return {
    data: {
      v: 1,
      provider: "tiktok",
      accessToken: json.access_token,
      refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
      expiresAt,
      openId: typeof json.open_id === "string" ? json.open_id : undefined,
      scope: typeof json.scope === "string" ? json.scope : undefined,
    },
  };
}
