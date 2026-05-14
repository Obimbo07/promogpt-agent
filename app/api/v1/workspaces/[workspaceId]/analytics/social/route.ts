import { NextResponse } from "next/server";
import { z } from "zod";

import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { requireSessionUser } from "@/lib/api/guards";
import { pullAllConnectedAnalytics } from "@/lib/integrations/social/analytics-pull";

const postSchema = z.object({
  providers: z.array(z.string()).optional(),
});

/** Latest snapshot per provider for a workspace + recent history. */
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

  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? "40") || 40, 1), 200);

  const { data: snapshots, error } = await session.supabase
    .from("workspace_social_analytics_snapshots")
    .select(
      "id, workspace_id, connector_account_id, provider, captured_at, period_start, metric_scope, account_external_id, sync_status, metrics, raw_payload, error, created_at"
    )
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = snapshots ?? [];
  const latestByProvider = new Map<string, (typeof list)[number]>();
  for (const row of list) {
    if (!latestByProvider.has(row.provider)) {
      latestByProvider.set(row.provider, row);
    }
  }

  return NextResponse.json({
    latest: [...latestByProvider.values()],
    history: list,
  });
}

/** Run a fresh pull from Meta / TikTok (editors+). */
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

  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { jobId, results } = await pullAllConnectedAnalytics({
    supabase: session.supabase,
    workspaceId,
    onlyProviders: parsed.data.providers,
  });

  const failed = results.filter((r) => !r.ok);
  const okCount = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: failed.length === 0,
    pulled: okCount,
    jobId,
    results,
  });
}
