import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { requireWorkspaceMembership } from "@/lib/api/workspace-access";

function engagementSortKey(metrics: unknown): number {
  if (!metrics || typeof metrics !== "object") {
    return 0;
  }
  const s = (metrics as Record<string, unknown>).engagement_score;
  return typeof s === "number" && !Number.isNaN(s) ? s : 0;
}

/** Latest captured metrics per workspace post (deduped), sorted by engagement score. */
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
  const limit = Math.min(Math.max(Number(limitParam ?? "40") || 40, 1), 120);

  const { data: rows, error } = await session.supabase
    .from("workspace_social_post_snapshots")
    .select(
      "id, workspace_id, connector_account_id, provider, external_post_id, title, permalink, posted_at, metrics, captured_at"
    )
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dedupe = new Map<string, (typeof rows)[number]>();
  const list = rows ?? [];
  for (const row of list) {
    const key = `${row.connector_account_id}:${row.external_post_id}`;
    if (!dedupe.has(key)) {
      dedupe.set(key, row);
    }
  }

  const posts = [...dedupe.values()].sort((a, b) => engagementSortKey(b.metrics) - engagementSortKey(a.metrics)).slice(0, limit);

  return NextResponse.json({ posts });
}
