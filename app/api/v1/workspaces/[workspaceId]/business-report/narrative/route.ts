import { NextResponse } from "next/server";
import { z } from "zod";

import {
  billableTokenUnits,
  gatewayEnvFromProcess,
  GatewayHttpError,
  generateTextGateway,
} from "@promogpt/ai-gateway";

import { requireSessionUser } from "@/lib/api/guards";
import { requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { createRequestId, logApiEvent } from "@/lib/observability/request-context";
import { gatherBusinessReportFacts } from "@/lib/reports/gather-business-report-facts";

const bodySchema = z.object({
  /** Prefer `multimodal-lite` (Gemini) or default `fast-agent` (Groq). */
  model: z.enum(["fast-agent", "multimodal-lite"]).optional(),
});

/**
 * Builds an AI narrative from `gatherBusinessReportFacts` — Groq (`fast-agent`) or Gemini (`multimodal-lite`).
 */
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

  const gathered = await gatherBusinessReportFacts({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId,
  });

  if (!gathered.ok) {
    return NextResponse.json({ error: gathered.error }, { status: 500 });
  }

  const facts = gathered.facts;

  const rawBody = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const model = parsed.data.model ?? "fast-agent";
  const requestId = createRequestId();

  const systemPrompt =
    "You write concise marketing operator briefs. Output Markdown only. Never invent metrics — only use facts JSON.";

  const userPrompt = [
    "Produce a short executive snapshot (max 5 paragraphs + optional bullet list) for this workspace.",
    "Blend onboarding identity with connected-channel analytics where present.",
    "Call out disconnected channels or sync errors plainly.",
    "",
    "```json",
    JSON.stringify(facts, null, 2),
    "```",
  ].join("\n");

  const env = gatewayEnvFromProcess();

  try {
    const result = await generateTextGateway(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.55,
      },
      env
    );

    const quantity = billableTokenUnits(result.usage);

    const { error: usageErr } = await session.supabase.from("usage_events").insert({
      organization_id: facts.workspace.organizationId,
      workspace_id: workspaceId,
      event_type: "ai.business_report",
      quantity,
      metadata: {
        logical_model: model,
        resolved_model: result.resolvedModel,
        provider: result.provider,
        requestId,
      },
    });

    if (usageErr) {
      logApiEvent({
        event: "usage.insert_failed",
        requestId,
        error: usageErr.message,
      });
    }

    logApiEvent({
      event: "ai.business_report_ok",
      requestId,
      workspaceId,
      provider: result.provider,
    });

    return NextResponse.json({
      requestId,
      model,
      provider: result.provider,
      narrativeMarkdown: result.text,
      facts,
    });
  } catch (err) {
    logApiEvent({
      event: "ai.business_report_failed",
      requestId,
      error: err instanceof Error ? err.message : "unknown",
    });

    if (err instanceof GatewayHttpError) {
      return NextResponse.json(
        { error: err.message, status: err.status, requestId },
        { status: err.status === 429 ? 429 : 502 }
      );
    }

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "AI request timed out.", requestId }, { status: 504 });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI unavailable", requestId },
      { status: 502 }
    );
  }
}
