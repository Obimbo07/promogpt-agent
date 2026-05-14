import type { SupabaseClient } from "@supabase/supabase-js";

import {
  billableTokenUnits,
  gatewayEnvFromProcess,
  generateTextGateway,
} from "@promogpt/ai-gateway";

import { resolveAgentKind } from "@/lib/agents/catalog";
import { splitMarkdownAndCalendarSlots } from "@/lib/calendar/slots-from-agent-text";
import { createRequestId } from "@/lib/observability/request-context";
import { fetchWorkspacePostSnapshotsForAi } from "@/lib/reports/social-post-ai-analysis";
import {
  buildSocialPostAnalysisContext,
  dedupePostSnapshots,
} from "@/lib/reports/social-post-ai-context";
import { gatherBusinessReportFacts } from "@/lib/reports/gather-business-report-facts";

export type AgentWorkflowResult = {
  v: 1;
  kind: string;
  title: string;
  markdown: string;
  meta?: Record<string, unknown>;
  /** Stripped before persisting `output` on the workflow run — calendar rows are inserted separately. */
  calendar_slots?: import("@/lib/calendar/slots-from-agent-text").CalendarSlotParsed[];
};

function sliceJsonArray(v: unknown, max: number): unknown[] {
  return Array.isArray(v) ? v.slice(0, max) : [];
}

async function recordAgentUsage(args: {
  admin: SupabaseClient;
  organizationId: string;
  workspaceId: string;
  eventType: string;
  quantity: number;
  metadata: Record<string, unknown>;
}) {
  await args.admin.from("usage_events").insert({
    organization_id: args.organizationId,
    workspace_id: args.workspaceId,
    event_type: args.eventType,
    quantity: args.quantity,
    metadata: args.metadata,
  });
}

async function loadCoreContext(admin: SupabaseClient, workspaceId: string, userId: string) {
  const gathered = await gatherBusinessReportFacts({
    supabase: admin,
    userId,
    workspaceId,
  });

  if (!gathered.ok) {
    throw new Error(gathered.error);
  }

  const postsFetch = await fetchWorkspacePostSnapshotsForAi(admin, workspaceId);
  const deduped = dedupePostSnapshots(postsFetch.ok ? postsFetch.rows : []);

  const { data: snapRows } = await admin
    .from("workspace_social_analytics_snapshots")
    .select("provider, captured_at, sync_status, metrics, error")
    .eq("workspace_id", workspaceId)
    .order("captured_at", { ascending: false })
    .limit(80);

  return {
    facts: gathered.facts,
    posts: deduped,
    snapshots: snapRows ?? [],
  };
}

async function runGatewayReport(args: {
  workspaceId: string;
  organizationId: string;
  admin: SupabaseClient;
  eventType: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ text: string; resolvedModel: string; provider: string }> {
  const requestId = createRequestId();
  const env = gatewayEnvFromProcess();
  const model = "fast-agent" as const;

  const result = await generateTextGateway(
    {
      model,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      temperature: args.temperature ?? 0.42,
    },
    env
  );

  const quantity = billableTokenUnits(result.usage);

  await recordAgentUsage({
    admin: args.admin,
    organizationId: args.organizationId,
    workspaceId: args.workspaceId,
    eventType: args.eventType,
    quantity,
    metadata: {
      logical_model: model,
      resolved_model: result.resolvedModel,
      provider: result.provider,
      requestId,
    },
  });

  return { text: result.text, resolvedModel: result.resolvedModel, provider: result.provider };
}

export async function executeAgentWorkflow(args: {
  admin: SupabaseClient;
  workflowRun: {
    id: string;
    payload: Record<string, unknown>;
    triggered_by: string | null;
  };
  definition: {
    slug: string;
    workspace_id: string;
    definition: Record<string, unknown>;
  };
}): Promise<AgentWorkflowResult> {
  const userId = args.workflowRun.triggered_by;
  if (!userId) {
    throw new Error("Workflow run is missing triggered_by (user id).");
  }

  const workspaceId = args.definition.workspace_id;
  const kind = resolveAgentKind(args.definition.slug, args.definition.definition as Record<string, unknown>);
  const payload = args.workflowRun.payload ?? {};

  const ctx = await loadCoreContext(args.admin, workspaceId, userId);
  const analysisCtx = buildSocialPostAnalysisContext({
    facts: ctx.facts,
    dedupedPosts: ctx.posts,
  });

  const orgId = ctx.facts.workspace.organizationId;

  if (kind === "promogpt.agent.research") {
    const topic =
      typeof payload.topic === "string" && payload.topic.trim().length > 0 ? payload.topic.trim() : null;

    const system =
      "You are a research lead for a growth team. Output Markdown only. Never invent metrics — cite only numbers present in JSON. " +
      "Prioritize: (1) themes implied by strong post titles + metrics, (2) gaps where engagement is weak, (3) research questions and content angles per platform (TikTok vs Instagram vs Facebook Page). " +
      "If X/Twitter is mentioned, it is conceptual only — there is no X post data in the payload.";

    const user = [
      topic ? `Operator focus / hypothesis: ${topic}` : "No extra focus supplied — infer from data.",
      "",
      "## Workspace + social context",
      "```json",
      JSON.stringify(
        {
          workspace: ctx.facts.workspace,
          organization: ctx.facts.organization,
          social: ctx.facts.social,
          snapshots_recent: ctx.snapshots.slice(0, 24),
          posts_brief: analysisCtx,
        },
        null,
        2
      ),
      "```",
    ].join("\n");

    const out = await runGatewayReport({
      workspaceId,
      organizationId: orgId,
      admin: args.admin,
      eventType: "ai.agent.research",
      system,
      user,
      temperature: 0.45,
    });

    return {
      v: 1,
      kind,
      title: "Content research brief",
      markdown: out.text,
      meta: { resolvedModel: out.resolvedModel, provider: out.provider },
    };
  }

  if (kind === "promogpt.agent.post_draft") {
    const channel =
      payload.channel === "tiktok" || payload.channel === "instagram" || payload.channel === "facebook" ?
        payload.channel
      : "mixed";
    const brief =
      typeof payload.brief === "string" && payload.brief.trim().length > 0 ? payload.brief.trim() : null;

    const system =
      "You are a senior social copywriter. Output Markdown only. Ground hooks and tone in posts that performed well in the JSON; never invent metrics. " +
      "Produce: (1) 3–5 hook lines, (2) body/caption variants per requested channel, (3) optional CTA lines. " +
      "If channel is mixed, clearly label sections for TikTok, Instagram, Facebook Page. " +
      "Do not claim posts were published automatically.";

    const user = [
      `Primary channel mode: ${channel}.`,
      brief ? `Brief from operator: ${brief}` : "Infer positioning from business context + strongest posts.",
      "",
      "```json",
      JSON.stringify(
        {
          focus_channel: channel,
          facts: {
            workspace: ctx.facts.workspace,
            organization: ctx.facts.organization,
            viewer: ctx.facts.viewer,
          },
          posts_ranked_context: sliceJsonArray(analysisCtx.posts_ranked_by_engagement, 25),
          posts_by_platform: analysisCtx.posts_by_platform,
        },
        null,
        2
      ),
      "```",
    ].join("\n");

    const out = await runGatewayReport({
      workspaceId,
      organizationId: orgId,
      admin: args.admin,
      eventType: "ai.agent.post_draft",
      system,
      user,
      temperature: 0.62,
    });

    return {
      v: 1,
      kind,
      title: "Post drafts",
      markdown: out.text,
      meta: { channel, resolvedModel: out.resolvedModel, provider: out.provider },
    };
  }

  if (kind === "promogpt.agent.schedule") {
    const horizon =
      typeof payload.horizonDays === "number" && payload.horizonDays > 0 ?
        Math.min(Math.floor(payload.horizonDays), 60)
      : 14;

    const system =
      "You are an editorial calendar strategist. Use ONLY metrics present in the JSON for quantitative claims. " +
      "First output a clear Markdown plan: (1) recommended weekly cadence per connected platform, (2) day-by-day skeleton for the horizon, (3) experiments tied to weaker posts, (4) reminder that PromoGPT stores draft slots here while external tools still handle auto-publish until native shipping. " +
      "After the Markdown, output EXACTLY one more fenced block using the language tag `calendar_slots` containing a JSON array (no comments) of objects with keys: title (string), starts_at (ISO-8601 UTC e.g. 2026-05-21T15:30:00Z), channel (one of tiktok|instagram|facebook|mixed|internal), notes (optional string). " +
      "Include 4–18 realistic staggered slots spanning the horizon—never invent analytics numbers outside the JSON inputs.";

    const user = [
      `Planning horizon: ${horizon} days.`,
      "",
      "```json",
      JSON.stringify(
        {
          horizonDays: horizon,
          workspace: ctx.facts.workspace,
          social: ctx.facts.social,
          snapshots_recent: ctx.snapshots.slice(0, 40),
          posts_ranked: sliceJsonArray(analysisCtx.posts_ranked_by_engagement, 40),
          underperformers: sliceJsonArray(analysisCtx.posts_underperformers, 40),
        },
        null,
        2
      ),
      "```",
    ].join("\n");

    const out = await runGatewayReport({
      workspaceId,
      organizationId: orgId,
      admin: args.admin,
      eventType: "ai.agent.schedule",
      system,
      user,
      temperature: 0.4,
    });

    const { markdown, slots } = splitMarkdownAndCalendarSlots(out.text);

    return {
      v: 1,
      kind,
      title: `Schedule coach (${horizon} days)`,
      markdown,
      meta: {
        horizonDays: horizon,
        resolvedModel: out.resolvedModel,
        provider: out.provider,
        parsed_calendar_slots: slots.length,
      },
      calendar_slots: slots.length > 0 ? slots : undefined,
    };
  }

  if (kind === "promogpt.agent.marketing_report") {
    const system =
      "You are an FP&A-minded marketing analyst. Output Markdown only. Never invent metrics — cite only what appears in JSON. " +
      "Structure: (1) Executive summary of trajectory, (2) KPI narrative referencing latest vs earlier snapshots where visible, (3) per-platform (TikTok / Instagram / Facebook) performance, (4) What improved vs prior pulls if inferable, (5) Ranked improvement backlog. " +
      "If history is thin, say so and lean on post-level metrics.";

    const snapshotSeries = (ctx.snapshots as Array<Record<string, unknown>>).slice(0, 60);

    const user = [
      "## Inputs",
      "```json",
      JSON.stringify(
        {
          workspace: ctx.facts.workspace,
          organization: ctx.facts.organization,
          social: ctx.facts.social,
          analytics_snapshots_chronological: snapshotSeries,
          deduped_posts_context: {
            rollups: analysisCtx.post_rollups,
            top: sliceJsonArray(analysisCtx.posts_ranked_by_engagement, 20),
            weak: sliceJsonArray(analysisCtx.posts_underperformers, 15),
          },
        },
        null,
        2
      ),
      "```",
    ].join("\n");

    const out = await runGatewayReport({
      workspaceId,
      organizationId: orgId,
      admin: args.admin,
      eventType: "ai.agent.marketing_report",
      system,
      user,
      temperature: 0.38,
    });

    return {
      v: 1,
      kind,
      title: "Marketing improvement report",
      markdown: out.text,
      meta: { resolvedModel: out.resolvedModel, provider: out.provider },
    };
  }

  throw new Error(`Unsupported agent workflow kind: ${kind}`);
}
