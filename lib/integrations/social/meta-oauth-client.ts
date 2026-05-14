/**
 * Meta (Facebook Login) token exchange + page / Instagram Business discovery.
 * Server-only — uses META_APP_SECRET.
 */

export type MetaOAuthPageSnapshot = {
  pageId: string;
  pageName: string | null;
  pageAccessToken: string;
  instagramBusinessAccount?: { id: string; username?: string };
};

export type MetaConnectorCredentials = {
  v: 1;
  provider: "facebook" | "instagram";
  fbUserId: string;
  fbUserName: string | null;
  userAccessToken: string;
  userTokenExpiresAt: string | null;
  pages: MetaOAuthPageSnapshot[];
  primaryPageId: string | null;
  primaryPageAccessToken: string | null;
  instagramBusinessAccountId: string | null;
};

function graphVersion(): string {
  const v = process.env.META_GRAPH_API_VERSION?.trim();
  return v?.length ? v : "v21.0";
}

function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

export async function exchangeMetaAuthorizationCode(opts: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("client_secret", opts.clientSecret);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("code", opts.code);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });

  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json || typeof json.access_token !== "string") {
    const msg =
      json && typeof json.error === "object" && json.error && typeof (json.error as { message?: string }).message === "string"
        ? (json.error as { message: string }).message
        : typeof json?.error_description === "string"
          ? (json.error_description as string)
          : `HTTP ${res.status}`;
    throw new Error(`Meta OAuth token exchange failed: ${msg}`);
  }

  return {
    accessToken: json.access_token as string,
    expiresInSeconds: typeof json.expires_in === "number" ? json.expires_in : null,
  };
}

export async function exchangeMetaLongLivedUserToken(shortLivedToken: string) {
  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET are not configured");
  }

  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json || typeof json.access_token !== "string") {
    const msg =
      json && typeof json.error === "object" && json.error && typeof (json.error as { message?: string }).message === "string"
        ? (json.error as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(`Meta long-lived token exchange failed: ${msg}`);
  }

  return {
    accessToken: json.access_token as string,
    expiresInSeconds: typeof json.expires_in === "number" ? json.expires_in : null,
  };
}

async function metaJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${graphBase()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [k, val] of Object.entries(params)) {
    url.searchParams.set(k, val);
  }
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json().catch(() => null)) as Record<string, unknown>;
  if (!res.ok || (json && "error" in json && json.error)) {
    const err = json?.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Graph request failed (${res.status})`);
  }
  return json as T;
}

export async function fetchMetaUserProfile(accessToken: string): Promise<{ id: string; name?: string }> {
  const data = await metaJson<{ id: string; name?: string }>("/me", {
    fields: "id,name",
    access_token: accessToken,
  });
  return data;
}

export async function fetchMetaUserPages(accessToken: string): Promise<MetaOAuthPageSnapshot[]> {
  type Edge = {
    data?: Array<{
      id: string;
      name?: string;
      access_token: string;
      instagram_business_account?: { id: string; username?: string };
    }>;
  };
  const accounts = await metaJson<Edge>("/me/accounts", {
    fields: "name,access_token,instagram_business_account{id,username}",
    limit: "100",
    access_token: accessToken,
  });

  const rows = accounts.data ?? [];
  return rows.map((p) => ({
    pageId: p.id,
    pageName: p.name ?? null,
    pageAccessToken: p.access_token,
    instagramBusinessAccount:
      p.instagram_business_account?.id ?
        {
          id: p.instagram_business_account.id,
          username: p.instagram_business_account.username,
        }
      : undefined,
  }));
}

export function pickPrimaryPage(provider: "facebook" | "instagram", pages: MetaOAuthPageSnapshot[]) {
  if (provider === "instagram") {
    const withIg = pages.find((p) => p.instagramBusinessAccount?.id);
    if (withIg) {
      return {
        primaryPageId: withIg.pageId,
        primaryPageAccessToken: withIg.pageAccessToken,
        instagramBusinessAccountId: withIg.instagramBusinessAccount?.id ?? null,
      };
    }
    return {
      primaryPageId: pages[0]?.pageId ?? null,
      primaryPageAccessToken: pages[0]?.pageAccessToken ?? null,
      instagramBusinessAccountId: null,
    };
  }

  const first = pages[0];
  return {
    primaryPageId: first?.pageId ?? null,
    primaryPageAccessToken: first?.pageAccessToken ?? null,
    instagramBusinessAccountId: first?.instagramBusinessAccount?.id ?? null,
  };
}

export function buildMetaCredentialsBlob(opts: {
  provider: "facebook" | "instagram";
  userAccessToken: string;
  userTokenExpiresAt: Date | null;
  fbUser: { id: string; name?: string };
  pages: MetaOAuthPageSnapshot[];
}): MetaConnectorCredentials {
  const picked = pickPrimaryPage(opts.provider, opts.pages);

  return {
    v: 1,
    provider: opts.provider,
    fbUserId: opts.fbUser.id,
    fbUserName: opts.fbUser.name ?? null,
    userAccessToken: opts.userAccessToken,
    userTokenExpiresAt: opts.userTokenExpiresAt?.toISOString() ?? null,
    pages: opts.pages,
    primaryPageId: picked.primaryPageId,
    primaryPageAccessToken: picked.primaryPageAccessToken,
    instagramBusinessAccountId:
      opts.provider === "instagram" ?
        picked.instagramBusinessAccountId
      : opts.pages.find((p) => p.instagramBusinessAccount)?.instagramBusinessAccount?.id ?? null,
  };
}

export async function rotateMetaConnectorCredentials(
  creds: MetaConnectorCredentials
): Promise<MetaConnectorCredentials> {
  const longLived = await exchangeMetaLongLivedUserToken(creds.userAccessToken);
  const userTokenExpiresAt =
    longLived.expiresInSeconds != null ?
      new Date(Date.now() + longLived.expiresInSeconds * 1000)
    : null;

  const fbUser = await fetchMetaUserProfile(longLived.accessToken);
  const pages = await fetchMetaUserPages(longLived.accessToken);

  return buildMetaCredentialsBlob({
    provider: creds.provider,
    userAccessToken: longLived.accessToken,
    userTokenExpiresAt,
    fbUser,
    pages,
  });
}
