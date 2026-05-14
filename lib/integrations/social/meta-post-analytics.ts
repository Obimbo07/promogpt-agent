/**
 * Recent Meta-owned posts/media for post-level snapshots (best-effort; optional scopes).
 */
import { engagementScoreInteractionOnly } from "@/lib/integrations/social/engagement-score";
import type { SocialPostMetricRow } from "@/lib/integrations/social/post-snapshot-upsert";

function graphVersion(): string {
  const v = process.env.META_GRAPH_API_VERSION?.trim();
  return v?.length ? v : "v21.0";
}

function graphBase(): string {
  return `https://graph.facebook.com/${graphVersion()}`;
}

async function graphGetJson(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`${graphBase()}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("access_token", accessToken);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const json = (await res.json().catch(() => null)) as Record<string, unknown>;
  if (!res.ok) {
    const err = json?.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Graph ${res.status}`);
  }
  if (json && typeof json.error === "object" && json.error) {
    const err = json.error as { message?: string };
    throw new Error(err.message ?? "Graph error");
  }
  return json;
}

export async function fetchInstagramRecentMedia(opts: {
  igUserId: string;
  pageAccessToken: string;
  limit?: number;
}): Promise<unknown> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
  return graphGetJson(`/${opts.igUserId}/media`, opts.pageAccessToken, {
    fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
    limit: String(limit),
  });
}

export async function fetchFacebookRecentPosts(opts: {
  pageId: string;
  pageAccessToken: string;
  limit?: number;
}): Promise<unknown> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);
  return graphGetJson(`/${opts.pageId}/posts`, opts.pageAccessToken, {
    fields: "id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares",
    limit: String(limit),
  });
}

function num(x: unknown): number {
  return typeof x === "number" && !Number.isNaN(x) ? x : 0;
}

export function parseInstagramRecentMedia(raw: unknown): SocialPostMetricRow[] {
  const data = (raw as { data?: unknown[] }).data ?? [];
  const out: SocialPostMetricRow[] = [];

  for (const item of data) {
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : undefined;
    if (!id) {
      continue;
    }

    const likes = num(row.like_count);
    const comments = num(row.comments_count);
    const shares = 0;
    const caption = typeof row.caption === "string" ? row.caption.trim() : "";
    const title = caption.length > 0 ? caption.slice(0, 500) : null;
    const permalink = typeof row.permalink === "string" ? row.permalink : null;
    const ts = typeof row.timestamp === "string" ? row.timestamp : null;
    const mediaType = typeof row.media_type === "string" ? row.media_type : "unknown";

    out.push({
      external_post_id: id,
      title,
      permalink,
      posted_at: ts,
      metrics: {
        views: 0,
        likes,
        comments,
        shares,
        engagement_score: engagementScoreInteractionOnly(likes, comments, shares),
        media_type: mediaType,
      },
      raw_payload: item,
    });
  }

  return out;
}

export function parseFacebookRecentPosts(raw: unknown): SocialPostMetricRow[] {
  const data = (raw as { data?: unknown[] }).data ?? [];
  const out: SocialPostMetricRow[] = [];

  for (const item of data) {
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : undefined;
    if (!id) {
      continue;
    }

    const likesRec = row.likes as { summary?: { total_count?: number } } | undefined;
    const commentsRec = row.comments as { summary?: { total_count?: number } } | undefined;
    const sharesRec = row.shares as { count?: number } | undefined;

    const likes = num(likesRec?.summary?.total_count);
    const comments = num(commentsRec?.summary?.total_count);
    const shares = num(sharesRec?.count);

    const msg = typeof row.message === "string" ? row.message.trim() : "";
    const title = msg.length > 0 ? msg.slice(0, 500) : null;
    const permalink = typeof row.permalink_url === "string" ? row.permalink_url : null;
    const created = typeof row.created_time === "string" ? row.created_time : null;

    out.push({
      external_post_id: id,
      title,
      permalink,
      posted_at: created,
      metrics: {
        views: 0,
        likes,
        comments,
        shares,
        engagement_score: engagementScoreInteractionOnly(likes, comments, shares),
        media_type: "post",
      },
      raw_payload: item,
    });
  }

  return out;
}
