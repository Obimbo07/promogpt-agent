/**
 * Cross-provider normalized analytics (v1) — used for dashboards + future AI inputs.
 * Provider-specific raw payloads stay in `raw_payload`; this shape is stable.
 */
export type NormalizedSocialMetricsV1 = {
  schema_version: 1;
  source: "meta_page_insights" | "meta_ig_user_insights" | "tiktok_video_list" | "ingestion_error";
  followers?: number | null;
  impressions?: number | null;
  reach?: number | null;
  engagements?: number | null;
  profile_views?: number | null;
  video_views?: number | null;
  video_count?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  engagement_rate?: number | null;
};

export type AnalyticsMetricsEnvelope = {
  normalized: NormalizedSocialMetricsV1;
  display: {
    headline: string;
    kpis: Array<{ label: string; value: string }>;
  };
};
