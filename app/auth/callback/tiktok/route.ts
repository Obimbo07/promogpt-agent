import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { formatTikTokAuthorizeCallbackError } from "@/lib/integrations/social/tiktok-callback-errors";
import { exchangeTikTokAuthorizationCode } from "@/lib/integrations/social/tiktok-oauth-client";
import { parsePipeOAuthState } from "@/lib/oauth/oauth-callback-state";
import { oauthPopupResponse } from "@/lib/oauth/popup-complete";
import { resolveOAuthRedirectUri } from "@/lib/oauth/resolve-public-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  const stem = parsePipeOAuthState(stateRaw);
  const ctx = stem?.provider === "tiktok" ? stem : null;

  if (errParam) {
    const msg = formatTikTokAuthorizeCallbackError(errParam, errDesc);
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: stem?.workspaceId ?? null,
      provider: stem?.provider ?? null,
      error: msg,
    });
  }

  if (!code || !ctx) {
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
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: "You must be signed in to finish connecting TikTok",
    });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, ctx.workspaceId);
  if (!gate.ok) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: "No access to this workspace",
    });
  }

  if (!editorCapable(gate.role)) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: "Editors or admins can connect social accounts",
    });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  if (!clientKey || !clientSecret) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: "TikTok OAuth is not configured on the server",
    });
  }

  const { data: row, error: rowErr } = await session.supabase
    .from("connector_accounts")
    .select("id, status, metadata")
    .eq("workspace_id", ctx.workspaceId)
    .eq("provider", "tiktok")
    .maybeSingle();

  if (rowErr || !row) {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: rowErr?.message ?? "Connection row not found — start the flow again from the app",
    });
  }

  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const storedNonce = typeof meta.oauth_nonce === "string" ? meta.oauth_nonce : null;
  const pkceVerifier = typeof meta.oauth_code_verifier === "string" ? meta.oauth_code_verifier : null;
  const flow = typeof meta.flow === "string" ? meta.flow : null;

  if (flow !== "oauth" || storedNonce !== ctx.nonce || row.status !== "pending") {
    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: "OAuth session expired or invalid — start the connection again",
    });
  }

  const redirectUri = resolveOAuthRedirectUri(request, meta, "/auth/callback/tiktok");

  try {
    const { data: creds } = await exchangeTikTokAuthorizationCode({
      code,
      redirectUri,
      clientKey,
      clientSecret,
      codeVerifier: pkceVerifier ?? undefined,
    });

    const now = new Date().toISOString();
    const nextMetadata = {
      integration: "social" as const,
      flow: "oauth" as const,
      oauth_provider: "tiktok" as const,
      tiktok_open_id: creds.openId ?? null,
      connected_at: now,
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
      .eq("workspace_id", ctx.workspaceId);

    if (upErr) {
      return oauthPopupResponse({
        source: "promogpt-oauth",
        ok: false,
        workspaceId: ctx.workspaceId,
        provider: ctx.provider,
        error: upErr.message,
      });
    }

    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: true,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
    });
  } catch (err) {
    const message =
      typeof err === "object" && err && "message" in err ?
        String((err as Error).message)
      : "TikTok token exchange failed";

    await session.supabase
      .from("connector_accounts")
      .update({
        status: "error",
        metadata: {
          ...meta,
          flow: "oauth",
          oauth_provider: "tiktok",
          last_error_at: new Date().toISOString(),
          last_error: message.slice(0, 2000),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("workspace_id", ctx.workspaceId)
      .then(() => null);

    return oauthPopupResponse({
      source: "promogpt-oauth",
      ok: false,
      workspaceId: ctx.workspaceId,
      provider: ctx.provider,
      error: message,
    });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
