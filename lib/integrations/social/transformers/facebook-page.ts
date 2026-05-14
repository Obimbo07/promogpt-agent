import type { AnalyticsMetricsEnvelope, NormalizedSocialMetricsV1 } from "@/lib/integrations/social/normalized-metrics";

function insightLatestValue(
  raw: unknown,
  name: "page_fans" | "page_post_engagements" | "page_impressions"
): number | null {
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

export function transformFacebookPageInsights(args: { pageId: string; raw: unknown }): AnalyticsMetricsEnvelope {
  void args.pageId;
  const raw = args.raw;
  const followers = insightLatestValue(raw, "page_fans");
  const engagements = insightLatestValue(raw, "page_post_engagements");
  const impressions = insightLatestValue(raw, "page_impressions");

  const normalized: NormalizedSocialMetricsV1 = {
    schema_version: 1,
    source: "meta_page_insights",
    followers,
    impressions,
    engagements,
    reach: null,
    engagement_rate:
      impressions != null && impressions > 0 && engagements != null ? engagements / impressions : null,
  };

  return {
    normalized,
    display: {
      headline: "Facebook Page (Graph day bucket)",
      kpis: [
        { label: "Page followers", value: followers != null ? followers.toLocaleString() : "—" },
        { label: "Post engagements (day)", value: engagements != null ? engagements.toLocaleString() : "—" },
        { label: "Page impressions (day)", value: impressions != null ? impressions.toLocaleString() : "—" },
      ],
    },
  };
}
