import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import {
  buildMetaCredentialsBlob,
  exchangeMetaAuthorizationCode,
  exchangeMetaLongLivedUserToken,
  fetchMetaUserPages,
  fetchMetaUserProfile,
} from "@/lib/integrations/social/meta-oauth-client";
import { parsePipeOAuthState } from "@/lib/oauth/oauth-callback-state";
import { oauthPopupResponse } from "@/lib/oauth/popup-complete";
import { resolveOAuthRedirectUri } from "@/lib/oauth/resolve-public-origin";

function isMetaProvider(p: string): p is "instagram" | "facebook" {
  return p === "instagram" || p === "facebook";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const metaError = url.searchParams.get("error");
  const metaErrorDesc = url.searchParams.get("error_description");

  const stem = parsePipeOAuthState(stateRaw);
  const metaParsed = stem && isMetaProvider(stem.provider) ? stem : null;

  if (metaError) {
    const msg = metaErrorDesc?.replace(/\+/g, " ") ?? metaError;
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: stem?.workspaceId ?? null,
      provider: stem?.provider ?? null,
      error: msg,
    });
  }

  if (!code || !metaParsed) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      error: "Missing OAuth code or invalid state",
    });
  }

  const session = await requireSessionUser();
  if (!session.ok) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: "You must be signed in to finish connecting Meta",
    });
  }

  const gate = await requireWorkspaceMembership(
    session.supabase,
    session.userId,
    metaParsed.workspaceId
  );
  if (!gate.ok) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: "No access to this workspace",
    });
  }

  if (!editorCapable(gate.role)) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: "Editors or admins can connect social accounts",
    });
  }

  const clientId = process.env.META_APP_ID?.trim();
  const clientSecret = process.env.META_APP_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: "Meta OAuth is not configured on the server",
    });
  }

  const { data: row, error: rowErr } = await session.supabase
    .from("connector_accounts")
    .select("id, status, metadata")
    .eq("workspace_id", metaParsed.workspaceId)
    .eq("provider", metaParsed.provider)
    .maybeSingle();

  if (rowErr || !row) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: rowErr?.message ?? "Connection row not found — start the flow again from the app",
    });
  }

  const rowMeta = (row.metadata ?? {}) as Record<string, unknown>;
  const storedNonce = typeof rowMeta.oauth_nonce === "string" ? rowMeta.oauth_nonce : null;
  const flow = typeof rowMeta.flow === "string" ? rowMeta.flow : null;

  if (flow !== "oauth" || storedNonce !== metaParsed.nonce || row.status !== "pending") {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: "OAuth session expired or invalid — start the connection again",
    });
  }

  const redirectUri = resolveOAuthRedirectUri(request, rowMeta, "/auth/callback/meta");

  try {
    const shortLived = await exchangeMetaAuthorizationCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    const longLived = await exchangeMetaLongLivedUserToken(shortLived.accessToken);

    const userTokenExpiresAt =
      longLived.expiresInSeconds != null ?
        new Date(Date.now() + longLived.expiresInSeconds * 1000)
      : null;

    const fbUser = await fetchMetaUserProfile(longLived.accessToken);
    const pages = await fetchMetaUserPages(longLived.accessToken);

    const creds = buildMetaCredentialsBlob({
      provider: metaParsed.provider as "instagram" | "facebook",
      userAccessToken: longLived.accessToken,
      userTokenExpiresAt,
      fbUser,
      pages,
    });

    const now = new Date().toISOString();
    const missingIg =
      metaParsed.provider === "instagram" && !creds.instagramBusinessAccountId;

    const nextMetadata = {
      integration: "social" as const,
      flow: "oauth" as const,
      oauth_provider: "meta" as const,
      fb_user_id: fbUser.id,
      fb_user_name: fbUser.name ?? null,
      pages_count: pages.length,
      connected_at: now,
      missing_instagram_business: missingIg,
    };

    const { error: upErr } = await session.supabase
      .from("connector_accounts")
      .update({
        credentials_ref: JSON.stringify(creds),
        status: "connected",
        metadata: nextMetadata,
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      })
      .eq("id", row.id)
      .eq("workspace_id", metaParsed.workspaceId);

    if (upErr) {
      return oauthPopupResponse({
        source: "promogpt-oauth",
        ok: false,
        workspaceId: metaParsed.workspaceId,
        provider: metaParsed.provider,
        error: upErr.message,
      });
    }

    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: true,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      notice: missingIg
        ? "Connected to Meta — link an Instagram Business account to your Facebook Page to unlock Instagram actions."
        : undefined,
    });
  } catch (err) {
    const message =
      typeof err === "object" && err && "message" in err ?
        String((err as Error).message)
      : "Meta token exchange failed";

    await session.supabase
      .from("connector_accounts")
      .update({
        status: "error",
        metadata: {
          ...rowMeta,
          flow: "oauth",
          oauth_provider: "meta",
          last_error_at: new Date().toISOString(),
          last_error: message.slice(0, 2000),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("workspace_id", metaParsed.workspaceId)
      .then(() => null);

    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: metaParsed.workspaceId,
      provider: metaParsed.provider,
      error: message,
    });
  }
}

/** Block non-GET */
export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
