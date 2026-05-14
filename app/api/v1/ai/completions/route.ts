import { NextResponse } from "next/server";
import { z } from "zod";

import {
  billableTokenUnits,
  gatewayEnvFromProcess,
  generateTextGateway,
  toOpenAiCompatibilityCompletion,
} from "@promogpt/ai-gateway";

import { requireSessionUser } from "@/lib/api/guards";
import { createRequestId, logApiEvent } from "@/lib/observability/request-context";

const promptSchema = z.object({
  organizationId: z.string().uuid(),
  workspaceId: z.string().uuid().optional(),
  /** Logical alias (`fast-agent`) or vendor id (`gpt-4o-mini`). */
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  temperature: z.number().optional(),
});

export async function POST(request: Request) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const raw = await request.json().catch(() => null);
  const parsed = promptSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const requestId = createRequestId();
  const env = gatewayEnvFromProcess();

  let gatewayResult: Awaited<ReturnType<typeof generateTextGateway>>;

  try {
    gatewayResult = await generateTextGateway(
      {
        model: parsed.data.model ?? "fast-agent",
        messages: parsed.data.messages,
        temperature: parsed.data.temperature,
      },
      env
    );
  } catch (err) {
    logApiEvent({
      event: "ai.chat_failed",
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "AI provider unavailable",
      },
      { status: 502 }
    );
  }

  const quantity = billableTokenUnits(gatewayResult.usage);

  const compatibilityCompletion = toOpenAiCompatibilityCompletion(gatewayResult);

  const { error: usageErr } = await session.supabase.from("usage_events").insert({
    organization_id: parsed.data.organizationId,
    workspace_id: parsed.data.workspaceId ?? null,
    event_type: "ai.chat",
    quantity,
    metadata: {
      logical_model: parsed.data.model ?? "fast-agent",
      resolved_model: gatewayResult.resolvedModel,
      provider: gatewayResult.provider,
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
    event: "ai.chat_ok",
    requestId,
    organizationId: parsed.data.organizationId,
    provider: gatewayResult.provider,
  });

  return NextResponse.json({
    requestId,
    gateway: {
      provider: gatewayResult.provider,
      model: gatewayResult.resolvedModel,
      usage: gatewayResult.usage,
      text_preview: gatewayResult.text.slice(0, 280),
    },
    /** OpenAI-chat-shaped envelope retained for tooling that still expects `{ choices, usage }`. */
    completion: compatibilityCompletion,
  });
}
