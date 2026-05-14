import type { AnalyticsMetricsEnvelope, NormalizedSocialMetricsV1 } from "@/lib/integrations/social/normalized-metrics";

function insightLatestValue(raw: unknown, name: "impressions" | "reach" | "profile_views"): number | null {
  const data =
    raw && typeof raw === "object" && "data" in raw ?
      (raw as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> }).data
    : undefined;
  if (!Array.isArray(data)) {
    return null;
  }
  const block = data.find((x) => x.name === name);
  const v = block?.values?.at(-1)?.value;
  return typeof v === "number" ? v : null;
}

export function transformInstagramUserInsights(args: { igUserId: string; raw: unknown }): AnalyticsMetricsEnvelope {
  void args.igUserId;
  const raw = args.raw;
  const impressions = insightLatestValue(raw, "impressions");
  const reach = insightLatestValue(raw, "reach");
  const profile_views = insightLatestValue(raw, "profile_views");

  const normalized: NormalizedSocialMetricsV1 = {
    schema_version: 1,
    source: "meta_ig_user_insights",
    impressions,
    reach,
    profile_views,
    engagement_rate: reach != null && reach > 0 && impressions != null ? impressions / reach : null,
  };

  return {
    normalized,
    display: {
      headline: "Instagram Professional (Graph day bucket)",
      kpis: [
        { label: "Impressions (day)", value: impressions != null ? impressions.toLocaleString() : "—" },
        { label: "Reach (day)", value: reach != null ? reach.toLocaleString() : "—" },
        { label: "Profile views (day)", value: profile_views != null ? profile_views.toLocaleString() : "—" },
      ],
    },
  };
}
