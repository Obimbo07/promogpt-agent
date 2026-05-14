import type { ChatMessage, GenerateTextInput, GenerateTextResult, GatewayEnv, TokenUsage } from "../types";

/**
 * Anthropic Messages API (non-OpenAI).
 * @see https://docs.anthropic.com/en/api/messages
 */

export async function generateWithAnthropic(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const apiKey = env.anthropicApiKey;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY for Anthropic-backed models.");
  }

  const { system, messages } = splitSystemAndConversation(input.messages);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: routedModel,
      max_tokens: input.maxTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
    }),
  });

  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw formatVendorError("Anthropic", res.status, raw);
  }

  const text = extractAnthropicAssistantText(raw);
  const usage = extractAnthropicUsage(raw);

  return {
    text,
    usage,
    raw,
    provider: "anthropic",
    resolvedModel: routedModel,
  };
}

function splitSystemAndConversation(messages: ChatMessage[]): {
  system?: string;
  messages: AnthropicConversationMessage[];
} {
  const systemParts: string[] = [];
  const conv: AnthropicConversationMessage[] = [];

  const mergeAppend = (
    bucket: AnthropicConversationMessage[],
    role: AnthropicConversationMessage["role"],
    content: string
  ) => {
    const tail = bucket[bucket.length - 1];

    if (tail?.role === role) {
      tail.content = `${tail.content}\n${content}`;
      return;
    }

    bucket.push({ role, content });
  };

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }

    if (m.role === "assistant") {
      mergeAppend(conv, "assistant", m.content);
    }

    if (m.role === "user") {
      mergeAppend(conv, "user", m.content);
    }
  }

  const systemCombined = systemParts.join("\n").trim();
  let out = normalizeLeadingAssistant(conv);

  if (out.length === 0) {
    out = [{ role: "user", content: "(empty)" }];
  }

  return { system: systemCombined || undefined, messages: out };
}

type AnthropicConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

function normalizeLeadingAssistant(conv: AnthropicConversationMessage[]) {
  if (conv[0]?.role !== "assistant") {
    return conv;
  }

  const clone = [...conv];
  clone.unshift({ role: "user", content: "(context)" });
  return clone;
}

function extractAnthropicAssistantText(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Malformed Anthropic JSON");
  }

  const chunks =
    Array.isArray(
      (
        raw as {
          content?: Array<{ text?: unknown }>;
        }
      ).content
    )
      ? (
          (
            raw as {
              content: Array<{ text?: unknown }>;
            }
          ).content ?? []
        ).map((chunk) => (typeof chunk.text === "string" ? chunk.text : ""))
      : [];

  const glued = chunks.join("").trim();

  if (!glued) {
    throw new Error("Anthropic assistant content missing");
  }

  return glued;
}

function extractAnthropicUsage(raw: unknown): TokenUsage {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const usage =
    (
      raw as {
        usage?: { input_tokens?: unknown; output_tokens?: unknown };
      }
    ).usage ?? {};

  const prompt =
    typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
  const completion =
    typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens:
      prompt != null || completion != null ? (prompt ?? 0) + (completion ?? 0) : undefined,
  };
}

function formatVendorError(label: string, status: number, raw: unknown) {
  let slice = "";

  try {
    slice =
      typeof raw === "object" && raw !== null ?
        JSON.stringify(raw).slice(0, 500)
      : String(raw ?? "");
  } catch {
    slice = "(unreadable)";
  }

  return new Error(`${label} error (${status}): ${slice}`);
}
