import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { createRequestId } from "@/lib/observability/request-context";
import { runWorkspaceSocialPostAnalysisFlow } from "@/lib/reports/social-post-ai-analysis";

const bodySchema = z.object({
  model: z.enum(["fast-agent", "multimodal-lite"]).optional(),
});

/** Alias for POST …/analytics/social/analysis — includes legacy `playbookMarkdown` key. */
export async function POST(request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const model = parsed.data.model ?? "fast-agent";
  const requestId = createRequestId();

  const flow = await runWorkspaceSocialPostAnalysisFlow({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId,
    model,
    requestId,
  });

  if (!flow.ok) {
    return NextResponse.json(flow.body, { status: flow.status });
  }

  return NextResponse.json({
    requestId: flow.requestId,
    model: flow.model,
    provider: flow.provider,
    resolvedModel: flow.resolvedModel,
    analysisMarkdown: flow.analysisMarkdown,
    playbookMarkdown: flow.analysisMarkdown,
    postsUsed: flow.postsUsed,
  });
}
