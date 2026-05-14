import type { GatewayEnv, GenerateTextInput, GenerateTextResult } from "./types";
import { resolveModelRoute } from "./model-registry";
import { generateWithAnthropic } from "./providers/anthropic";
import { generateWithGemini } from "./providers/gemini";
import {
  generateWithDeepSeek,
  generateWithGroq,
  generateWithOpenAiCompat,
  generateWithOpenAI,
} from "./providers/openai-family";

/**
 * TypeScript-first AI gateway used by PromoGPT-Agent API routes / orchestrators.
 */

export async function generateTextGateway(
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const logicalModel = input.model.trim() || "fast-agent";

  const route =
    resolveModelRoute(logicalModel) ??
    ({ provider: "openai", model: logicalModel } as const);

  switch (route.provider) {
    case "groq":
      return generateWithGroq(route.model, input, env);
    case "openai":
      return generateWithOpenAI(route.model, input, env);
    case "anthropic":
      return generateWithAnthropic(route.model, input, env);
    case "gemini":
      return generateWithGemini(route.model, input, env);
    case "deepseek":
      return generateWithDeepSeek(route.model, input, env);
    case "openai_compat":
      return generateWithOpenAiCompat(route.model, input, env);
    default:
      throw new Error(
        `Gateway misconfiguration — unknown provider (${(route as { provider: string }).provider}).`
      );
  }
}

/** Legacy OpenAI-chat envelope for incremental UI/tooling migrations. */

export function toOpenAiCompatibilityCompletion(result: GenerateTextResult): Record<string, unknown> {
  const prompt = result.usage.promptTokens;
  const completion = result.usage.completionTokens;
  const summed =
    result.usage.totalTokens ??
    (prompt != null || completion != null ? (prompt ?? 0) + (completion ?? 0) : undefined);

  const totalTokens =
    summed != null && summed > 0 ? summed : 1;

  return {
    provider: result.provider,
    gateway_model: result.resolvedModel,
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: result.text,
        },
      },
    ],
    usage: {
      ...(prompt != null ? { prompt_tokens: prompt } : {}),
      ...(completion != null ? { completion_tokens: completion } : {}),
      total_tokens: totalTokens,
    },
  };
}
