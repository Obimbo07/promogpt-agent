/**
 * Page / Instagram user insights via Meta Graph (requires page access token + granted scopes).
 */
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

/** Page-level day bucket metrics for dashboard KPIs. */
export async function fetchFacebookPageInsightsSummary(opts: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{ kpis: Array<{ label: string; value: string }>; raw: unknown }> {
  const data = await graphGetJson(`/${opts.pageId}/insights`, opts.pageAccessToken, {
    metric: "page_fans,page_post_engagements,page_impressions",
    period: "day",
  });

  const kpis: Array<{ label: string; value: string }> = [];
  const list = (data as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> }).data ?? [];
  for (const m of list) {
    const name = m.name ?? "metric";
    const latest = m.values?.at(-1)?.value;
    const label =
      name === "page_fans" ? "Page followers"
      : name === "page_post_engagements" ? "Post engagements (day)"
      : name === "page_impressions" ? "Page impressions (day)"
      : name;
    kpis.push({
      label,
      value: typeof latest === "number" ? latest.toLocaleString() : "—",
    });
  }

  return { kpis, raw: data };
}

export async function fetchInstagramUserInsightsSummary(opts: {
  igUserId: string;
  pageAccessToken: string;
}): Promise<{ kpis: Array<{ label: string; value: string }>; raw: unknown }> {
  const data = await graphGetJson(`/${opts.igUserId}/insights`, opts.pageAccessToken, {
    metric: "impressions,reach,profile_views",
    period: "day",
  });

  const kpis: Array<{ label: string; value: string }> = [];
  const list = (data as { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> }).data ?? [];
  for (const m of list) {
    const name = m.name ?? "metric";
    const latest = m.values?.at(-1)?.value;
    const label =
      name === "impressions" ? "Impressions (day)"
      : name === "reach" ? "Reach (day)"
      : name === "profile_views" ? "Profile views (day)"
      : name;
    kpis.push({
      label,
      value: typeof latest === "number" ? latest.toLocaleString() : "—",
    });
  }

  return { kpis, raw: data };
}
