import type { ProviderKey } from "./types";

/**
 * Stable product-facing aliases → concrete routing targets.
 * Swap targets here instead of refactoring call sites across the orchestration layer.
 */

export type ModelRoute = {
  provider: ProviderKey;
  model: string;
};

/** Aliases intentionally avoid vendor naming in UX surfaces (`model: 'fast-agent'`). */
export const MODEL_ALIASES: Record<string, ModelRoute> = {
  "fast-agent": { provider: "groq", model: "llama-3.3-70b-versatile" },

  /** Quality / general SaaS workloads */
  "premium-agent": { provider: "openai", model: "gpt-4o-mini" },

  /** Long-context, careful reasoning workloads */
  "reasoning-agent": { provider: "anthropic", model: "claude-3-5-haiku-latest" },

  /** Multimodal / Google ecosystem path (text-first in gateway V1 wire-up) */
  "multimodal-lite": { provider: "gemini", model: "gemini-2.0-flash" },

  /** Cost-optimized reasoning */
  "value-agent": { provider: "deepseek", model: "deepseek-chat" },
};

/**
 * Lightweight inference when callers pass vendor-style ids directly (`gpt-*`, `claude-*`, …).
 */

export function resolveModelRoute(model: string): ModelRoute | null {
  const trimmed = model.trim();

  if (trimmed.toLowerCase().startsWith("compat:")) {
    const rest = trimmed.slice("compat:".length).trim();
    return {
      provider: "openai_compat",
      model: rest.length > 0 ? rest : "gpt-4o-mini",
    };
  }

  const aliasHit = MODEL_ALIASES[trimmed];

  if (aliasHit) {
    return aliasHit;
  }

  const lower = trimmed.toLowerCase();

  if (lower.includes("gpt") || lower.startsWith("o1") || lower.startsWith("o3")) {
    return { provider: "openai", model: trimmed };
  }

  if (lower.includes("deepseek")) {
    return { provider: "deepseek", model: trimmed };
  }

  if (lower.startsWith("claude")) {
    return { provider: "anthropic", model: trimmed };
  }

  if (lower.startsWith("gemini")) {
    return { provider: "gemini", model: trimmed };
  }

  if (
    trimmed.startsWith("llama") ||
    trimmed.startsWith("mixtral") ||
    trimmed.startsWith("moonshot")
  ) {
    return { provider: "groq", model: trimmed };
  }

  return null;
}
