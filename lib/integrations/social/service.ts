import type { SupabaseClient } from "@supabase/supabase-js";

import { pullAllConnectedAnalytics } from "@/lib/integrations/social/analytics-pull";
import type { SocialProviderId } from "@/lib/integrations/social/types";

/**
 * Pull fresh metrics for all connected socials that support analytics (Facebook, Instagram, TikTok).
 * Prefer calling from `POST /api/v1/workspaces/:id/analytics/social`,
 * `/api/internal/cron/social-analytics` (scheduled), or Supabase Edge `social-analytics-cron`.
 */
export async function pullConnectorSnapshot(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  provider: SocialProviderId;
}) {
  const results = await pullAllConnectedAnalytics({
    supabase: args.supabase,
    workspaceId: args.workspaceId,
    onlyProviders: [args.provider],
  });
  const hit = results.results.find((r) => r.provider === args.provider);
  if (hit?.ok === false) {
    return { ok: false as const, reason: hit.error };
  }
  if (hit?.ok === true) {
    return { ok: true as const };
  }
  return {
    ok: false as const,
    reason: `No snapshot produced for ${args.provider}.`,
  };
}
