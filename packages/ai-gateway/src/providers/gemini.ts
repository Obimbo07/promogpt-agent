import type { ChatMessage, GenerateTextInput, GenerateTextResult, GatewayEnv, TokenUsage } from "../types";
import { GatewayHttpError, maybeTimeoutSignal } from "./openai-shaped";

/**
 * Google Generative Language API (single-user prompt consolidation for PromoGPT-Agent V1).
 */

export async function generateWithGemini(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const apiKey = env.geminiApiKey;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for Gemini-backed models.");
  }

  const prompt = consolidateMessages(input.messages);

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(routedModel)}:generateContent?key=` +
    encodeURIComponent(apiKey);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: input.temperature ?? 0.7,
      },
    }),
    signal: maybeTimeoutSignal(env.fetchTimeoutMs),
  });

  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new GatewayHttpError(`Gemini error (${res.status})`, res.status, raw);
  }

  const text = extractGeminiAssistantText(raw);
  const usage = extractGeminiUsage(raw);

  return {
    text,
    usage,
    raw,
    provider: "gemini",
    resolvedModel: routedModel,
  };
}

function consolidateMessages(messages: ChatMessage[]) {
  return messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join("\n\n---\n\n");
}

function extractGeminiAssistantText(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Malformed Gemini JSON");
  }

  const parts =
    (
      raw as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
      }
    ).candidates?.[0]?.content?.parts ?? [];

  const glued = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  if (!glued) {
    throw new Error("Gemini assistant content missing");
  }

  return glued;
}

function extractGeminiUsage(raw: unknown): TokenUsage {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const meta =
    (
      raw as {
        usageMetadata?: Record<string, unknown>;
      }
    ).usageMetadata ?? {};

  const prompt =
    typeof meta.promptTokenCount === "number" ? meta.promptTokenCount : undefined;
  const completion =
    typeof meta.candidatesTokenCount === "number"
      ? meta.candidatesTokenCount
      : undefined;
  const total =
    typeof meta.totalTokenCount === "number" ? meta.totalTokenCount : undefined;

  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens:
      total ?? (prompt != null || completion != null ? (prompt ?? 0) + (completion ?? 0) : undefined),
  };
}

