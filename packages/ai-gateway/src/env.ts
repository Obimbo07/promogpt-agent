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
  };
}

function nonempty(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
