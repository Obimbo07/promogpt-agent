import type { TikTokConnectorCredentials } from "@/lib/integrations/social/tiktok-oauth-client";
import { engagementScoreRate } from "@/lib/integrations/social/engagement-score";
import type { SocialPostMetricRow } from "@/lib/integrations/social/post-snapshot-upsert";

type VideoListItem = {
  id?: string;
  title?: string;
  create_time?: number;
  view_count?: number | string;
  like_count?: number | string;
  comment_count?: number | string;
  share_count?: number | string;
};

function coalesceMetric(x: unknown): number {
  if (typeof x === "number" && !Number.isNaN(x)) {
    return x;
  }
  if (typeof x === "string" && x.trim() !== "") {
    const p = Number(x);
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
}

type VideoListResponse = {
  data?: { videos?: VideoListItem[]; cursor?: number; has_more?: boolean };
  error?: { code?: string; message?: string; log_id?: string };
};

/** TikTok returns an `error` object on BOTH success and failure — only `code === "ok"` means success. */
function isTikTokResponseOk(json: VideoListResponse | null): boolean {
  if (!json) {
    return false;
  }
  const code = json.error?.code;
  if (code === undefined || code === null) {
    return true;
  }
  return String(code).toLowerCase() === "ok";
}

/**
 * Aggregate public video stats for the authorized TikTok user (needs `video.list` scope).
 */
export async function fetchTikTokVideoAnalyticsSummary(accessToken: string): Promise<{
  videoCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  raw: unknown;
}> {
  const url = new URL("https://open.tiktokapis.com/v2/video/list/");
  url.searchParams.set("fields", "id,title,create_time,view_count,like_count,comment_count,share_count");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ max_count: 20 }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as VideoListResponse;
  if (!res.ok) {
    const msg =
      json?.error && typeof json.error.message === "string" && json.error.message.length > 0 ?
        json.error.message
      : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!isTikTokResponseOk(json)) {
    const code = json?.error?.code ?? "unknown";
    const msg =
      typeof json?.error?.message === "string" && json.error.message.length > 0 ?
        json.error.message
      : String(code);
    throw new Error(msg);
  }

  const videos = json.data?.videos ?? [];
  let views = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  for (const v of videos) {
    views += coalesceMetric(v.view_count);
    likes += coalesceMetric(v.like_count);
    comments += coalesceMetric(v.comment_count);
    shares += coalesceMetric(v.share_count);
  }

  return {
    videoCount: videos.length,
    views,
    likes,
    comments,
    shares,
    raw: json,
  };
}

export function isTikTokCredentials(ref: unknown): ref is TikTokConnectorCredentials {
  return (
    typeof ref === "object" &&
    ref !== null &&
    "provider" in ref &&
    (ref as { provider?: string }).provider === "tiktok" &&
    "accessToken" in ref &&
    typeof (ref as { accessToken?: string }).accessToken === "string"
  );
}

/** Normalized post rows from TikTok `video/list` JSON (same shape as {@link fetchTikTokVideoAnalyticsSummary} `raw`). */
export function parseTikTokVideoPosts(raw: unknown): SocialPostMetricRow[] {
  const json = raw as VideoListResponse;
  const videos = json?.data?.videos ?? [];
  const out: SocialPostMetricRow[] = [];

  for (const v of videos) {
    const id = typeof v.id === "string" ? v.id : undefined;
    if (!id) {
      continue;
    }

    const views = coalesceMetric(v.view_count);
    const likes = coalesceMetric(v.like_count);
    const comments = coalesceMetric(v.comment_count);
    const shares = coalesceMetric(v.share_count);

    const title = typeof v.title === "string" && v.title.trim() ? v.title : null;
    const postedAt =
      typeof v.create_time === "number" && v.create_time > 0 ?
        new Date(v.create_time * 1000).toISOString()
      : null;

    out.push({
      external_post_id: id,
      title,
      permalink: `https://www.tiktok.com/video/${id}`,
      posted_at: postedAt,
      metrics: {
        views,
        likes,
        comments,
        shares,
        engagement_score: engagementScoreRate(views, likes, comments, shares),
        media_type: "video",
      },
      raw_payload: v,
    });
  }

  return out;
}
