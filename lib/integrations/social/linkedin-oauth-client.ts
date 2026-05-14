/**
 * LinkedIn OAuth 2.0 — authorization code exchange (OpenID + member posting scopes).
 * @see https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication
 */

export type LinkedInConnectorCredentials = {
  v: 1;
  provider: "linkedin";
  accessToken: string;
  expiresAt: string | null;
  scope?: string;
};

export async function exchangeLinkedInAuthorizationCode(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ data: LinkedInConnectorCredentials }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || typeof json.access_token !== "string") {
    const msg = json.error_description ?? json.error ?? `HTTP ${res.status}`;
    throw new Error(`LinkedIn token exchange failed: ${msg}`);
  }

  const expiresAt =
    typeof json.expires_in === "number" ?
      new Date(Date.now() + json.expires_in * 1000).toISOString()
    : null;

  return {
    data: {
      v: 1,
      provider: "linkedin",
      accessToken: json.access_token,
      expiresAt,
      scope: typeof json.scope === "string" ? json.scope : undefined,
    },
  };
}

export async function fetchLinkedInUserInfo(accessToken: string): Promise<{ sub?: string; name?: string }> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { sub?: string; name?: string };
  if (!res.ok) {
    return {};
  }
  return json;
}
