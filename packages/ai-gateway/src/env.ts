import type { GatewayEnv } from "./types";

/** Centralized binding to `process.env` for Node / Vercel server runtimes only. */

export function gatewayEnvFromProcess(): GatewayEnv {
  return {
    groqApiKey: nonempty(process.env.GROQ_API_KEY),
    openaiApiKey: nonempty(process.env.OPENAI_API_KEY),
    anthropicApiKey: nonempty(process.env.ANTHROPIC_API_KEY),
    geminiApiKey: nonempty(process.env.GEMINI_API_KEY),
    deepseekApiKey: nonempty(process.env.DEEPSEEK_API_KEY),
    openaiCompatBaseUrl: nonempty(process.env.OPENAI_COMPAT_BASE_URL ?? process.env.LITELLM_BASE_URL),
    openaiCompatApiKey: nonempty(
      process.env.OPENAI_COMPAT_API_KEY ??
        process.env.LITELLM_API_KEY ??
        process.env.OPENROUTER_API_KEY
    ),
    openaiBaseUrl: nonempty(process.env.OPENAI_BASE_URL),
    fetchTimeoutMs: parsePositiveMs(process.env.AI_GATEWAY_FETCH_TIMEOUT_MS),
  };
}

function parsePositiveMs(value: string | undefined) {
  if (!value?.trim()) {
    return 65_000;
  }

  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 3000 || n > 180_000) {
    return 65_000;
  }

  return n;
}

function nonempty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
