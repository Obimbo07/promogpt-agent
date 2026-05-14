import type { SupabaseClient } from "@supabase/supabase-js";

import {
  billableTokenUnits,
  gatewayEnvFromProcess,
  GatewayHttpError,
  generateTextGateway,
} from "@promogpt/ai-gateway";

import {
  gatherBusinessReportFacts,
  type BusinessReportFacts,
} from "@/lib/reports/gather-business-report-facts";
import {
  buildSocialPostAnalysisContext,
  dedupePostSnapshots,
  type PostSnapshotRowInput,
  socialPostAnalysisSystemPrompt,
  socialPostAnalysisUserPrompt,
} from "@/lib/reports/social-post-ai-context";
import { logApiEvent } from "@/lib/observability/request-context";

export async function fetchWorkspacePostSnapshotsForAi(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ ok: true; rows: PostSnapshotRowInput[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("workspace_social_post_snapshots")
    .select(
      "connector_account_id, external_post_id, provider, title, permalink, posted_at, metrics, captured_at"
    )
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(320);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, rows: (data ?? []) as PostSnapshotRowInput[] };
}

export async function executeSocialPostAiAnalysis(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  facts: BusinessReportFacts;
  postRows: PostSnapshotRowInput[];
  model: "fast-agent" | "multimodal-lite";
  requestId: string;
}): Promise<
  | { ok: true; analysisMarkdown: string; postsUsed: number; resolvedModel: string; provider: string }
  | { ok: false; error: unknown }
> {
  const deduped = dedupePostSnapshots(args.postRows);
  const context = buildSocialPostAnalysisContext({
    facts: args.facts,
    dedupedPosts: deduped,
  });

  const system = socialPostAnalysisSystemPrompt();
  const user = socialPostAnalysisUserPrompt(context);
  const env = gatewayEnvFromProcess();

  try {
    const result = await generateTextGateway(
      {
        model: args.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.42,
      },
      env
    );

    const quantity = billableTokenUnits(result.usage);

    const { error: usageErr } = await args.supabase.from("usage_events").insert({
      organization_id: args.facts.workspace.organizationId,
      workspace_id: args.workspaceId,
      event_type: "ai.social_post_analysis",
      quantity,
      metadata: {
        logical_model: args.model,
        resolved_model: result.resolvedModel,
        provider: result.provider,
        requestId: args.requestId,
        posts_used: deduped.length,
      },
    });

    if (usageErr) {
      logApiEvent({
        event: "usage.insert_failed",
        requestId: args.requestId,
        error: usageErr.message,
      });
    }

    logApiEvent({
      event: "ai.social_post_analysis_ok",
      requestId: args.requestId,
      workspaceId: args.workspaceId,
      provider: result.provider,
    });

    return {
      ok: true,
      analysisMarkdown: result.text,
      postsUsed: deduped.length,
      resolvedModel: result.resolvedModel,
      provider: result.provider,
    };
  } catch (err) {
    logApiEvent({
      event: "ai.social_post_analysis_failed",
      requestId: args.requestId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: err };
  }
}

export function mapSocialAnalysisError(err: unknown): {
  status: number;
  body: Record<string, unknown>;
} {
  if (err instanceof GatewayHttpError) {
    return {
      status: err.status === 429 ? 429 : 502,
      body: { error: err.message, status: err.status },
    };
  }
  if (err instanceof Error && err.name === "AbortError") {
    return { status: 504, body: { error: "AI request timed out." } };
  }
  return {
    status: 502,
    body: { error: err instanceof Error ? err.message : "AI unavailable" },
  };
}

export async function runWorkspaceSocialPostAnalysisFlow(args: {
  supabase: SupabaseClient;
  userId: string;
  workspaceId: string;
  model: "fast-agent" | "multimodal-lite";
  requestId: string;
}): Promise<
  | {
      ok: true;
      analysisMarkdown: string;
      postsUsed: number;
      model: string;
      provider: string;
      resolvedModel: string;
      requestId: string;
    }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const gathered = await gatherBusinessReportFacts({
    supabase: args.supabase,
    userId: args.userId,
    workspaceId: args.workspaceId,
  });

  if (!gathered.ok) {
    return { ok: false, status: 500, body: { error: gathered.error } };
  }

  const postsFetch = await fetchWorkspacePostSnapshotsForAi(args.supabase, args.workspaceId);
  if (!postsFetch.ok) {
    return { ok: false, status: 500, body: { error: postsFetch.error } };
  }

  const exec = await executeSocialPostAiAnalysis({
    supabase: args.supabase,
    workspaceId: args.workspaceId,
    facts: gathered.facts,
    postRows: postsFetch.rows,
    model: args.model,
    requestId: args.requestId,
  });

  if (!exec.ok) {
    const { status, body } = mapSocialAnalysisError(exec.error);
    return { ok: false, status, body: { ...body, requestId: args.requestId } };
  }

  const md = exec.analysisMarkdown.trim().length > 0 ? exec.analysisMarkdown : "_No analysis returned._";

  return {
    ok: true,
    analysisMarkdown: md,
    postsUsed: exec.postsUsed,
    model: args.model,
    provider: exec.provider,
    resolvedModel: exec.resolvedModel,
    requestId: args.requestId,
  };
}
