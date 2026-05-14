import type { TokenUsage } from "./types";

/** Billing-ready token rollup for usage_events / Stripe meter alignment. */

export function billableTokenUnits(usage: TokenUsage) {
  if (typeof usage.totalTokens === "number" && usage.totalTokens > 0) {
    return usage.totalTokens;
  }

  const inferred =
    (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0);

  return inferred > 0 ? inferred : 1;
}
