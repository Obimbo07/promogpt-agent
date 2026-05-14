import type { TikTokConnectorCredentials } from "@/lib/integrations/social/tiktok-oauth-client";

type VideoListItem = {
  id?: string;
  title?: string;
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
