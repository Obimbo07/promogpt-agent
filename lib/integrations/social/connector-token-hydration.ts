import type { SupabaseClient } from "@supabase/supabase-js";

import type { MetaConnectorCredentials } from "@/lib/integrations/social/meta-oauth-client";
import { rotateMetaConnectorCredentials } from "@/lib/integrations/social/meta-oauth-client";
import { isTikTokCredentials } from "@/lib/integrations/social/tiktok-analytics";
import type { TikTokConnectorCredentials } from "@/lib/integrations/social/tiktok-oauth-client";
import { refreshTikTokAccessToken } from "@/lib/integrations/social/tiktok-token-refresh";
import type { SocialConnectorRow } from "@/lib/integrations/social/types";

const TIKTOK_REFRESH_MARGIN_MS = 10 * 60 * 1000;
const META_ROTATE_MARGIN_MS = 72 * 60 * 60 * 1000;

function tenantMs(iso: string | null): number | null {
  if (!iso) {
    return null;
  }

  const t = Date.parse(iso);

  return Number.isFinite(t) ? t : null;
}

async function persistConnectorRef(
  supabase: SupabaseClient,
  connectorId: string,
  credentialsJson: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("connector_accounts")
    .update({ credentials_ref: credentialsJson, updated_at: now })
    .eq("id", connectorId);

  return !error;
}

/**
 * Proactively rotates OAuth tokens before vendor pulls fail (best-effort; failures surface on pull errors).
 */
export async function hydrateConnectorCredentialsForPull(
  supabase: SupabaseClient,
  row: SocialConnectorRow
): Promise<{ credentials_ref: string | null }> {
  if (!row.credentials_ref) {
    return { credentials_ref: null };
  }

  if (row.provider === "tiktok") {
    let parsed: unknown;

    try {
      parsed = JSON.parse(row.credentials_ref) as unknown;
    } catch {
      return { credentials_ref: row.credentials_ref };
    }

    if (!isTikTokCredentials(parsed)) {
      return { credentials_ref: row.credentials_ref };
    }

    const c = parsed as TikTokConnectorCredentials;
    const exp = tenantMs(c.expiresAt ?? null);

    const needsRefresh =
      typeof c.refreshToken === "string" &&
      c.refreshToken.length > 0 &&
      (exp == null || exp - Date.now() < TIKTOK_REFRESH_MARGIN_MS);

    if (!needsRefresh) {
      return { credentials_ref: row.credentials_ref };
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();

    if (!clientKey || !clientSecret) {
      return { credentials_ref: row.credentials_ref };
    }

    try {
      const next = await refreshTikTokAccessToken({
        refreshToken: c.refreshToken!,
        clientKey,
        clientSecret,
      });
      const json = JSON.stringify(next);
      const ok = await persistConnectorRef(supabase, row.id, json);
      return { credentials_ref: ok ? json : row.credentials_ref };
    } catch {
      return { credentials_ref: row.credentials_ref };
    }
  }

  if (row.provider !== "facebook" && row.provider !== "instagram") {
    return { credentials_ref: row.credentials_ref };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(row.credentials_ref) as unknown;
  } catch {
    return { credentials_ref: row.credentials_ref };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { v?: number }).v !== 1 ||
    !("primaryPageId" in parsed) ||
    typeof (parsed as MetaConnectorCredentials).userAccessToken !== "string"
  ) {
    return { credentials_ref: row.credentials_ref };
  }

  const c = parsed as MetaConnectorCredentials;
  const exp = tenantMs(c.userTokenExpiresAt ?? null);

  const needsRotate = exp != null ? exp - Date.now() < META_ROTATE_MARGIN_MS : false;

  if (!needsRotate) {
    return { credentials_ref: row.credentials_ref };
  }

  try {
    const rotated = await rotateMetaConnectorCredentials(c);
    const json = JSON.stringify(rotated);
    const ok = await persistConnectorRef(supabase, row.id, json);
    return { credentials_ref: ok ? json : row.credentials_ref };
  } catch {
    return { credentials_ref: row.credentials_ref };
  }
}
