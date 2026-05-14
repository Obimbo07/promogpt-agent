import { NextResponse } from "next/server";
import { z } from "zod";

import { sanitizeConnectionMetadataForApi } from "@/lib/api/sanitize-connection-metadata";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { requireSessionUser } from "@/lib/api/guards";
import { CONNECTOR_REGISTRY } from "@/lib/connectors/registry";
import { getSocialAdapter } from "@/lib/integrations/social/registry";
import { generatePkceCodeVerifier } from "@/lib/oauth/pkce";
import { resolvePublicOriginFromRequest } from "@/lib/oauth/resolve-public-origin";

const providerSchema = z.enum([
  "x",
  "telegram",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
]);

const CATALOG_PROVIDER_IDS = [
  "tiktok",
  "facebook",
  "instagram",
  "x",
  "telegram",
  "linkedin",
] as const;

const postSchema = z.object({
  provider: providerSchema,
  /** Dev/demo only — persists a synthetic connected row (see CONNECTOR_STUB_ALLOW). */
  stubComplete: z.boolean().optional(),
});

function stubConnectAllowed() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.CONNECTOR_STUB_ALLOW === "true"
  );
}

function omitSecrets<
  T extends {
    status?: string | null;
    metadata?: unknown;
    provider?: string | null;
    display_name?: string | null;
    connected_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    id?: string | null;
    workspace_id?: string | null;
  },
>(row: T) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    displayName: row.display_name,
    status: row.status,
    metadata: sanitizeConnectionMetadataForApi(row.metadata),
    connectedAt: row.connected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ workspaceId: string }> }
) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const { data, error } = await session.supabase
    .from("connector_accounts")
    .select(
      "id, workspace_id, provider, display_name, status, metadata, connected_at, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const catalog = CONNECTOR_REGISTRY.filter((c) => CATALOG_PROVIDER_IDS.includes(c.id as (typeof CATALOG_PROVIDER_IDS)[number])).map(
    (c) => ({
      id: c.id,
      displayName: c.displayName,
      capabilities: c.capabilities,
    })
  );

  return NextResponse.json({
    catalog,
    connections: (data ?? []).map(omitSecrets),
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ workspaceId: string }> }
) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { provider } = parsed.data;
  const adapter = getSocialAdapter(provider);

  if (!adapter) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const origin = resolvePublicOriginFromRequest(request);
  const redirectUri = `${origin}/onboarding`;

  if (parsed.data.stubComplete) {
    if (!stubConnectAllowed()) {
      return NextResponse.json({ error: "Stub connections disabled" }, { status: 403 });
    }

    const now = new Date().toISOString();
    const stubRef = `stub:${crypto.randomUUID()}`;

    const { data, error } = await session.supabase
      .from("connector_accounts")
      .upsert(
        {
          workspace_id: workspaceId,
          provider,
          display_name: adapter.displayName,
          credentials_ref: stubRef,
          status: "connected",
          metadata: {
            integration: "social",
            stub: true,
            recorded_at: now,
          },
          connected_at: now,
          disconnected_at: null,
          updated_at: now,
        },
        { onConflict: "workspace_id,provider" }
      )
      .select(
        "id, workspace_id, provider, display_name, status, metadata, connected_at, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      initiation: { kind: "stub" as const },
      connection: data ? omitSecrets(data) : null,
    });
  }

  const isMetaSocial = provider === "instagram" || provider === "facebook";
  if (isMetaSocial && (!process.env.META_APP_ID?.trim() || !process.env.META_APP_SECRET?.trim())) {
    return NextResponse.json(
      {
        error:
          "Meta OAuth is not configured. Set META_APP_ID and META_APP_SECRET and register redirect URI /auth/callback/meta in Meta Developer Portal.",
      },
      { status: 503 }
    );
  }

  if (provider === "tiktok" && (!process.env.TIKTOK_CLIENT_KEY?.trim() || !process.env.TIKTOK_CLIENT_SECRET?.trim())) {
    return NextResponse.json(
      {
        error:
          "TikTok OAuth is not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET and register redirect URI /auth/callback/tiktok.",
      },
      { status: 503 }
    );
  }

  if (provider === "linkedin" && (!process.env.LINKEDIN_CLIENT_ID?.trim() || !process.env.LINKEDIN_CLIENT_SECRET?.trim())) {
    return NextResponse.json(
      {
        error:
          "LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET and register redirect URI /auth/callback/linkedin.",
      },
      { status: 503 }
    );
  }

  const oauthStateNonce = crypto.randomUUID();
  const pkceCodeVerifier = provider === "tiktok" ? generatePkceCodeVerifier() : undefined;

  let initiation;
  try {
    initiation = await adapter.initiateConnection({
      workspaceId,
      redirectUri,
      appOrigin: origin.replace(/\/$/, ""),
      oauthStateNonce,
      ...(pkceCodeVerifier ? { pkceCodeVerifier } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not build OAuth authorize URL";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const oauthProviderLabel =
    isMetaSocial ? ("meta" as const)
    : provider === "tiktok" ? ("tiktok" as const)
    : provider === "linkedin" ? ("linkedin" as const)
    : undefined;

  const oauthCallbackRel =
    isMetaSocial ? "/auth/callback/meta"
    : provider === "tiktok" ? "/auth/callback/tiktok"
    : provider === "linkedin" ? "/auth/callback/linkedin"
    : null;

  const now = new Date().toISOString();

  const metadata =
    initiation.kind === "manual_setup"
      ? {
          integration: "social",
          flow: "manual",
          instructions: initiation.instructions,
          initiated_at: now,
        }
      : {
          integration: "social",
          flow: "oauth",
          oauth_provider: oauthProviderLabel,
          oauth_nonce: oauthStateNonce,
          ...(pkceCodeVerifier ? { oauth_code_verifier: pkceCodeVerifier } : {}),
          ...(oauthCallbackRel ?
            { oauth_redirect_uri: `${origin.replace(/\/$/, "")}${oauthCallbackRel}` }
          : {}),
          authorization_url: initiation.authorizationUrl,
          initiated_at: now,
        };

  const { data, error } = await session.supabase
    .from("connector_accounts")
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        display_name: adapter.displayName,
        credentials_ref: null,
        status: "pending",
        metadata,
        connected_at: null,
        disconnected_at: null,
        updated_at: now,
      },
      { onConflict: "workspace_id,provider" }
    )
    .select(
      "id, workspace_id, provider, display_name, status, metadata, connected_at, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    initiation:
      initiation.kind === "oauth_redirect"
        ? {
            kind: "oauth_redirect" as const,
            authorizationUrl: initiation.authorizationUrl,
          }
        : {
            kind: "manual_setup" as const,
            instructions: initiation.instructions,
          },
    connection: data ? omitSecrets(data) : null,
  });
}
