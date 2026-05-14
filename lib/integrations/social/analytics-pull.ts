import type { SupabaseClient } from "@supabase/supabase-js";

import { transformFacebookPageInsights } from "@/lib/integrations/social/transformers/facebook-page";
import { transformInstagramUserInsights } from "@/lib/integrations/social/transformers/instagram-user";
import { transformTikTokVideoListSummary } from "@/lib/integrations/social/transformers/tiktok-videos";
import type { MetaConnectorCredentials } from "@/lib/integrations/social/meta-oauth-client";
import {
  fetchFacebookPageInsightsSummary,
  fetchInstagramUserInsightsSummary,
} from "@/lib/integrations/social/meta-analytics";
import type { AnalyticsMetricsEnvelope } from "@/lib/integrations/social/normalized-metrics";
import type { SocialProviderId, SocialConnectorRow } from "@/lib/integrations/social/types";
import {
  fetchFacebookRecentPosts,
  fetchInstagramRecentMedia,
  parseFacebookRecentPosts,
  parseInstagramRecentMedia,
} from "@/lib/integrations/social/meta-post-analytics";
import { upsertSocialPostSnapshots } from "@/lib/integrations/social/post-snapshot-upsert";
import {
  fetchTikTokVideoAnalyticsSummary,
  isTikTokCredentials,
  parseTikTokVideoPosts,
} from "@/lib/integrations/social/tiktok-analytics";
import { hydrateConnectorCredentialsForPull } from "@/lib/integrations/social/connector-token-hydration";
import { utcHourStart } from "@/lib/time/utc-period";

function parseJson<T>(ref: string | null): T | null {
  if (!ref) {
    return null;
  }
  try {
    return JSON.parse(ref) as T;
  } catch {
    return null;
  }
}

function isMetaCreds(ref: unknown): ref is MetaConnectorCredentials {
  return (
    typeof ref === "object" &&
    ref !== null &&
    "v" in ref &&
    (ref as { v?: number }).v === 1 &&
    "primaryPageId" in ref &&
    "primaryPageAccessToken" in ref
  );
}

async function upsertSnapshot(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  connectorAccountId: string;
  provider: string;
  metricScope: string;
  accountExternalId: string | null;
  syncStatus: "success" | "partial" | "error";
  metrics: AnalyticsMetricsEnvelope | Record<string, unknown>;
  rawPayload: unknown | null;
  error: string | null;
  periodStart: Date;
  periodGranularity: "hour" | "day";
}) {
  const row = {
    workspace_id: args.workspaceId,
    connector_account_id: args.connectorAccountId,
    provider: args.provider,
    captured_at: new Date().toISOString(),
    period_start: args.periodStart.toISOString(),
    period_granularity: args.periodGranularity,
    metric_scope: args.metricScope,
    account_external_id: args.accountExternalId,
    sync_status: args.syncStatus,
    metrics: args.metrics as unknown as Record<string, unknown>,
    raw_payload: args.rawPayload,
    error: args.error,
  };

  const { error } = await args.supabase.from("workspace_social_analytics_snapshots").upsert(row, {
    onConflict: "connector_account_id,period_start,period_granularity,metric_scope",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export type PullSnapshotResult =
  | {
      ok: true;
      provider: SocialProviderId | string;
      connectorAccountId: string;
      metrics: AnalyticsMetricsEnvelope | Record<string, unknown>;
    }
  | { ok: false; provider: SocialProviderId | string; connectorAccountId?: string; error: string };

export async function pullConnectorSnapshot(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  row: SocialConnectorRow;
}): Promise<PullSnapshotResult> {
  const { supabase, workspaceId, row } = args;
  const provider = row.provider as SocialProviderId;
  const periodStart = utcHourStart();
  const periodGranularity = "hour" as const;

  if (row.status !== "connected" || !row.credentials_ref) {
    return { ok: false, provider, connectorAccountId: row.id, error: "Connector not connected or missing credentials" };
  }

  const hydrated = await hydrateConnectorCredentialsForPull(supabase, row);
  const activeCredentialsRef = hydrated.credentials_ref ?? row.credentials_ref;
  const credsUnknown = parseJson<unknown>(activeCredentialsRef);

  try {
    if (provider === "facebook" && isMetaCreds(credsUnknown)) {
      const c = credsUnknown;
      const pageId = c.primaryPageId;
      const token = c.primaryPageAccessToken;
      if (!pageId || !token) {
        throw new Error("Missing primary Facebook Page — reconnect Meta.");
      }
      const { raw } = await fetchFacebookPageInsightsSummary({
        pageId,
        pageAccessToken: token,
      });
      const metrics = transformFacebookPageInsights({ pageId, raw });
      await upsertSnapshot({
        supabase,
        workspaceId,
        connectorAccountId: row.id,
        provider,
        metricScope: "meta_page_insights_day",
        accountExternalId: pageId,
        syncStatus: "success",
        metrics,
        rawPayload: raw,
        error: null,
        periodStart,
        periodGranularity,
      });
      try {
        const postsRaw = await fetchFacebookRecentPosts({ pageId, pageAccessToken: token });
        await upsertSocialPostSnapshots({
          supabase,
          workspaceId,
          connectorAccountId: row.id,
          provider: "facebook",
          posts: parseFacebookRecentPosts(postsRaw),
        });
      } catch {
        /* Optional scopes — account snapshot already saved */
      }
      return { ok: true, provider, connectorAccountId: row.id, metrics };
    }

    if (provider === "instagram" && isMetaCreds(credsUnknown)) {
      const c = credsUnknown;
      const igId = c.instagramBusinessAccountId;
      const token = c.primaryPageAccessToken;
      if (!igId || !token) {
        throw new Error("Missing Instagram Business account on this connection.");
      }
      const { raw } = await fetchInstagramUserInsightsSummary({
        igUserId: igId,
        pageAccessToken: token,
      });
      const metrics = transformInstagramUserInsights({ igUserId: igId, raw });
      await upsertSnapshot({
        supabase,
        workspaceId,
        connectorAccountId: row.id,
        provider,
        metricScope: "meta_ig_user_insights_day",
        accountExternalId: igId,
        syncStatus: "success",
        metrics,
        rawPayload: raw,
        error: null,
        periodStart,
        periodGranularity,
      });
      try {
        const mediaRaw = await fetchInstagramRecentMedia({ igUserId: igId, pageAccessToken: token });
        await upsertSocialPostSnapshots({
          supabase,
          workspaceId,
          connectorAccountId: row.id,
          provider: "instagram",
          posts: parseInstagramRecentMedia(mediaRaw),
        });
      } catch {
        /* Optional scopes — account snapshot already saved */
      }
      return { ok: true, provider, connectorAccountId: row.id, metrics };
    }

    if (provider === "tiktok" && isTikTokCredentials(credsUnknown)) {
      const summary = await fetchTikTokVideoAnalyticsSummary(credsUnknown.accessToken);
      const metrics = transformTikTokVideoListSummary({
        raw: summary.raw,
        videoCount: summary.videoCount,
        views: summary.views,
        likes: summary.likes,
        comments: summary.comments,
        shares: summary.shares,
      });
      const externalId =
        typeof credsUnknown.openId === "string" && credsUnknown.openId.length > 0 ? credsUnknown.openId : "tiktok_user";
      await upsertSnapshot({
        supabase,
        workspaceId,
        connectorAccountId: row.id,
        provider,
        metricScope: "tiktok_video_list_recent",
        accountExternalId: externalId,
        syncStatus: "success",
        metrics,
        rawPayload: summary.raw,
        error: null,
        periodStart,
        periodGranularity,
      });
      await upsertSocialPostSnapshots({
        supabase,
        workspaceId,
        connectorAccountId: row.id,
        provider: "tiktok",
        posts: parseTikTokVideoPosts(summary.raw),
      });
      return { ok: true, provider, connectorAccountId: row.id, metrics };
    }

    return {
      ok: false,
      provider,
      connectorAccountId: row.id,
      error: `Analytics pull not implemented for provider "${provider}" yet.`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown pull error";
    const scopeByProvider: Record<string, string> = {
      facebook: "meta_page_insights_day",
      instagram: "meta_ig_user_insights_day",
      tiktok: "tiktok_video_list_recent",
    };
    const metricScope = scopeByProvider[row.provider] ?? `${row.provider}_pull`;
    await upsertSnapshot({
      supabase,
      workspaceId,
      connectorAccountId: row.id,
      provider,
      metricScope,
      accountExternalId: null,
      syncStatus: "error",
      metrics: {
        normalized: {
          schema_version: 1,
          source: "ingestion_error",
        },
        display: {
          headline: "Pull failed",
          kpis: [{ label: "Error", value: message.slice(0, 400) }],
        },
      },
      rawPayload: null,
      error: message,
      periodStart,
      periodGranularity,
    });
    return { ok: false, provider, connectorAccountId: row.id, error: message };
  }
}

export async function pullAllConnectedAnalytics(args: {
  supabase: SupabaseClient;
  workspaceId: string;
  onlyProviders?: string[];
}): Promise<{
  jobId: string | null;
  results: PullSnapshotResult[];
}> {
  const { supabase, workspaceId, onlyProviders } = args;

  const { data: jobRow, error: jobErr } = await supabase
    .from("social_sync_jobs")
    .insert({
      workspace_id: workspaceId,
      kind: "analytics_pull",
      status: "running",
      metadata: { v: 1 },
    })
    .select("id")
    .maybeSingle();

  const jobId = !jobErr && jobRow?.id ? jobRow.id : null;

  const { data: rows, error } = await supabase
    .from("connector_accounts")
    .select("id,provider,status,credentials_ref")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected");

  if (error) {
    if (jobId) {
      await supabase
        .from("social_sync_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error: error.message,
        })
        .eq("id", jobId);
    }
    return { jobId, results: [{ ok: false, provider: "workspace", error: error.message }] };
  }

  const supported = new Set(["facebook", "instagram", "tiktok"]);
  const filtered =
    (rows ?? []).filter((r) => {
      if (!supported.has(r.provider)) {
        return false;
      }
      if (onlyProviders && onlyProviders.length > 0) {
        return onlyProviders.includes(r.provider);
      }
      return true;
    }) ?? [];

  const results: PullSnapshotResult[] = [];
  for (const row of filtered) {
    const r = await pullConnectorSnapshot({
      supabase,
      workspaceId,
      row: {
        id: row.id,
        provider: row.provider,
        status: row.status,
        credentials_ref: row.credentials_ref,
      },
    });
    results.push(r);
  }

  if (filtered.length === 0) {
    results.push({
      ok: false,
      provider: "workspace",
      error: "No supported connected channels (Facebook, Instagram, TikTok) to pull — connect one first.",
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;
  const status =
    failCount === 0 ? "succeeded"
    : okCount === 0 ? "failed"
    : "partial";
  const summaryError =
    failCount === 0 ? null : results.filter((r) => !r.ok).map((r) => r.error).join(" · ").slice(0, 8000);

  if (jobId) {
    await supabase
      .from("social_sync_jobs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        records_processed: okCount,
        error: summaryError,
        metadata: { v: 1, result_count: results.length, failed: failCount },
      })
      .eq("id", jobId);
  }

  return { jobId, results };
}
