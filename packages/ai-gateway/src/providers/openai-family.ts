import type { GenerateTextInput, GenerateTextResult, GatewayEnv } from "../types";
import { fetchOpenAiChatCompletion } from "./openai-shaped";

export async function generateWithGroq(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const apiKey = env.groqApiKey;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY for Groq-backed models.");
  }

  const baseUrl = "https://api.groq.com/openai/v1";

  const { text, usage, raw } = await fetchOpenAiChatCompletion({
    baseUrl,
    apiKey,
    model: routedModel,
    messages: input.messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  return {
    text,
    usage,
    raw,
    provider: "groq",
    resolvedModel: routedModel,
  };
}

export async function generateWithOpenAI(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const apiKey = env.openaiApiKey;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for OpenAI-backed models.");
  }

  const baseUrl =
    env.openaiBaseUrl?.replace(/\/$/, "") ?? "https://api.openai.com/v1";

  const { text, usage, raw } = await fetchOpenAiChatCompletion({
    baseUrl,
    apiKey,
    model: routedModel,
    messages: input.messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  return {
    text,
    usage,
    raw,
    provider: "openai",
    resolvedModel: routedModel,
  };
}

export async function generateWithDeepSeek(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const apiKey = env.deepseekApiKey;

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY for DeepSeek-backed models.");
  }

  const baseUrl = "https://api.deepseek.com/v1";

  const { text, usage, raw } = await fetchOpenAiChatCompletion({
    baseUrl,
    apiKey,
    model: routedModel,
    messages: input.messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  return {
    text,
    usage,
    raw,
    provider: "deepseek",
    resolvedModel: routedModel,
  };
}

export async function generateWithOpenAiCompat(
  routedModel: string,
  input: GenerateTextInput,
  env: GatewayEnv
): Promise<GenerateTextResult> {
  const baseRaw = env.openaiCompatBaseUrl;
  const apiKey = env.openaiCompatApiKey;

  if (!baseRaw || !apiKey) {
    throw new Error(
      "Missing OPENAI_COMPAT_BASE_URL / OPENAI_COMPAT_API_KEY for OpenAI-compatible proxies."
    );
  }

  const baseNormalized = normalizeOpenAiCompatBase(baseRaw);

  const { text, usage, raw } = await fetchOpenAiChatCompletion({
    baseUrl: baseNormalized,
    apiKey,
    model: routedModel,
    messages: input.messages,
    temperature: input.temperature,
    maxTokens: input.maxTokens,
  });

  return {
    text,
    usage,
    raw,
    provider: "openai_compat",
    resolvedModel: routedModel,
  };
}

function normalizeOpenAiCompatBase(raw: string) {
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}
