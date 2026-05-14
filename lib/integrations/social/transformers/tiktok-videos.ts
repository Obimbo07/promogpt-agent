import type { AnalyticsMetricsEnvelope, NormalizedSocialMetricsV1 } from "@/lib/integrations/social/normalized-metrics";

export function transformTikTokVideoListSummary(args: {
  raw: unknown;
  videoCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}): AnalyticsMetricsEnvelope {
  void args.raw;
  const normalized: NormalizedSocialMetricsV1 = {
    schema_version: 1,
    source: "tiktok_video_list",
    video_count: args.videoCount,
    video_views: args.views,
    likes: args.likes,
    comments: args.comments,
    shares: args.shares,
    engagement_rate:
      args.views > 0 && args.likes + args.comments + args.shares > 0 ?
        (args.likes + args.comments + args.shares) / args.views
      : null,
  };

  return {
    normalized,
    display: {
      headline: "TikTok (recent videos in list response)",
      kpis: [
        { label: "Videos (batch)", value: String(args.videoCount) },
        { label: "View count (sum)", value: args.views.toLocaleString() },
        { label: "Likes (sum)", value: args.likes.toLocaleString() },
        { label: "Comments (sum)", value: args.comments.toLocaleString() },
        { label: "Shares (sum)", value: args.shares.toLocaleString() },
      ],
    },
  };
}
