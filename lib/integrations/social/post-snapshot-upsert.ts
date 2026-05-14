import type { SupabaseClient } from "@supabase/supabase-js";

export type SocialPostMetricRow = {
  external_post_id: string;
  title: string | null;
  permalink: string | null;
  posted_at: string | null;
  metrics: Record<string, unknown>;
  raw_payload?: unknown;
};

/**
 * Upserts post-level metrics (latest capture replaces prior row per connector + post id).
 */
export async function upsertSocialPostSnapshots(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  connectorAccountId: string;
  provider: "tiktok" | "facebook" | "instagram";
  posts: SocialPostMetricRow[];
}): Promise<{ upserted: number }> {
  const { supabase, workspaceId, connectorAccountId, provider, posts } = args;

  if (posts.length === 0) {
    return { upserted: 0 };
  }

  const capturedAt = new Date().toISOString();
  let upserted = 0;

  for (const p of posts) {
    const row = {
      workspace_id: workspaceId,
      connector_account_id: connectorAccountId,
      provider,
      external_post_id: p.external_post_id,
      title: p.title,
      permalink: p.permalink,
      posted_at: p.posted_at,
      metrics: p.metrics,
      raw_payload: p.raw_payload ?? null,
      captured_at: capturedAt,
    };

    const { error } = await supabase.from("workspace_social_post_snapshots").upsert(row, {
      onConflict: "connector_account_id,external_post_id",
    });

    if (!error) {
      upserted += 1;
    }
  }

  return { upserted };
}
