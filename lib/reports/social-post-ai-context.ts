import type { BusinessReportFacts } from "@/lib/reports/gather-business-report-facts";

/** Row shape from `workspace_social_post_snapshots` (nullable ids filtered during dedupe). */
export type PostSnapshotRowInput = {
  connector_account_id?: string | null;
  external_post_id?: string | null;
  provider?: string | null;
  title?: string | null;
  permalink?: string | null;
  posted_at?: string | null;
  metrics: unknown;
  captured_at?: string | null;
};

export type PostSnapshotDbRow = {
  connector_account_id: string;
  external_post_id: string;
  provider: string;
  title: string | null;
  permalink: string | null;
  posted_at: string | null;
  metrics: unknown;
  captured_at: string;
};

export function engagementSortKey(metrics: unknown): number {
  if (!metrics || typeof metrics !== "object") {
    return 0;
  }
  const s = (metrics as Record<string, unknown>).engagement_score;
  return typeof s === "number" && !Number.isNaN(s) ? s : 0;
}

/** Keeps newest snapshot first (rows must be ordered by captured_at desc). Skips malformed ids. */
export function dedupePostSnapshots(rows: PostSnapshotRowInput[]): PostSnapshotDbRow[] {
  const map = new Map<string, PostSnapshotDbRow>();
  for (const row of rows) {
    const ca = typeof row.connector_account_id === "string" ? row.connector_account_id.trim() : "";
    const ext = typeof row.external_post_id === "string" ? row.external_post_id.trim() : "";
    if (!ca || !ext) {
      continue;
    }
    const key = `${ca}:${ext}`;
    if (!map.has(key)) {
      map.set(key, {
        connector_account_id: ca,
        external_post_id: ext,
        provider: typeof row.provider === "string" ? row.provider : "",
        title: row.title ?? null,
        permalink: row.permalink ?? null,
        posted_at: row.posted_at ?? null,
        metrics: row.metrics,
        captured_at:
          typeof row.captured_at === "string" && row.captured_at.length > 0 ?
            row.captured_at
          : new Date().toISOString(),
      });
    }
  }
  return [...map.values()];
}

function briefPost(p: PostSnapshotDbRow) {
  return {
    provider: p.provider,
    external_post_id: p.external_post_id,
    title: p.title,
    permalink: p.permalink,
    posted_at: p.posted_at,
    captured_at: p.captured_at,
    metrics: p.metrics,
  };
}

export function buildSocialPostAnalysisContext(args: {
  facts: BusinessReportFacts;
  dedupedPosts: PostSnapshotDbRow[];
}): Record<string, unknown> {
  const ranked = [...args.dedupedPosts].sort((a, b) => engagementSortKey(b.metrics) - engagementSortKey(a.metrics));
  const weakest = [...ranked].reverse();

  const countByProvider = ranked.reduce<Record<string, number>>((acc, p) => {
    acc[p.provider] = (acc[p.provider] ?? 0) + 1;
    return acc;
  }, {});

  const tiktokPosts = ranked.filter((p) => p.provider === "tiktok").map(briefPost);
  const instagramPosts = ranked.filter((p) => p.provider === "instagram").map(briefPost);
  const facebookPosts = ranked.filter((p) => p.provider === "facebook").map(briefPost);

  return {
    ingest_note:
      "Post metrics are ingested for TikTok and Meta (Instagram + Facebook Page) only. There is no X/Twitter post data unless explicitly added later.",
    workspace: args.facts.workspace,
    organization: args.facts.organization,
    viewer: args.facts.viewer,
    generatedAt: args.facts.generatedAt,
    connected_accounts: args.facts.social.connectors,
    latest_channel_pulls: args.facts.social.latestSnapshots,
    post_rollups: {
      total_deduped_posts: ranked.length,
      count_by_provider: countByProvider,
    },
    posts_ranked_by_engagement: ranked.slice(0, 90).map(briefPost),
    posts_underperformers: weakest.slice(0, 14).map(briefPost),
    posts_by_platform: {
      tiktok: tiktokPosts.slice(0, 40),
      instagram: instagramPosts.slice(0, 40),
      facebook: facebookPosts.slice(0, 40),
    },
  };
}

export function socialPostAnalysisSystemPrompt(): string {
  return [
    "You are a principal social strategist and data interpreter for a marketing workspace.",
    "Output Markdown only.",
    "",
    "Hard rules:",
    "- Never invent metrics: quote numbers only when they appear in the JSON (including nested metrics objects).",
    "- If a platform has connectors but zero posts in JSON, explain likely causes (scopes, sync not run, API limits) without fabricating stats.",
    "- TikTok discovery favors completion/watch-time loops; Instagram favors saves/shares/comments within Meta ranking signals; Facebook Page posts favor reactions/comments/shares in slower graphs.",
    "- Use separate VIRAL PLAYBOOK sections per platform — TikTok tactics MUST differ from Instagram and Facebook.",
    "- For X (Twitter): there is normally NO ingest data in this JSON. Give at most one short subsection contrasting thread/reply-network mechanics vs short-form vertical video — clearly label it as strategic context only and do NOT cite metrics for X.",
    "",
    "Required Markdown structure — use ## headings exactly:",
    "## Executive summary",
    "## Connected accounts & pull health",
    "## TikTok — account snapshot & post analysis",
    "## Instagram — account snapshot & post analysis",
    "## Facebook — account snapshot & post analysis",
    "## Cross-platform insights",
    "## Viral playbook — TikTok-native",
    "## Viral playbook — Instagram-native",
    "## Viral playbook — Facebook-native",
    "## Other networks (e.g. X) — strategic contrast only",
    "",
    "Within each platform section (when relevant): interpret top vs weak performers using ONLY supplied metrics; note hooks/thumbnails/caption patterns suggested by titles (do not claim you watched videos).",
    "Close with prioritized experiments for the next 14 days tied to metrics gaps you observed.",
  ].join("\n");
}

export function socialPostAnalysisUserPrompt(context: Record<string, unknown>): string {
  return [
    "Produce the full analysis following the required Markdown headings.",
    "",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
  ].join("\n");
}
