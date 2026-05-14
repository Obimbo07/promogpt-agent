import type { ChatMessage, TokenUsage } from "../types";

export function usageFromOpenAiCompat(usage: unknown): TokenUsage {
  if (!usage || typeof usage !== "object") {
    return {};
  }

  const u = usage as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };

  const prompt =
    typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined;
  const completion =
    typeof u.completion_tokens === "number" ? u.completion_tokens : undefined;
  const total = typeof u.total_tokens === "number" ? u.total_tokens : undefined;

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens:
      total ?? (prompt != null || completion != null ? (prompt ?? 0) + (completion ?? 0) : undefined),
  };
}

export async function fetchOpenAiChatCompletion(input: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ text: string; usage: TokenUsage; raw: unknown }> {
  const base = input.baseUrl.replace(/\/$/, "");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.7,
      ...(input.maxTokens ? { max_tokens: input.maxTokens } : {}),
    }),
  });

  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new GatewayHttpError(`OpenAI-shaped provider error (${res.status})`, res.status, raw);
  }

  if (!raw || typeof raw !== "object") {
    throw new GatewayHttpError("Malformed OpenAI-shaped response", res.status, raw);
  }

  const body = raw as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: unknown;
  };

  const text = body.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw new GatewayHttpError("Missing assistant text in response", res.status, raw);
  }

  return { text, usage: usageFromOpenAiCompat(body.usage), raw };
}

export class GatewayHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "GatewayHttpError";
  }
}
