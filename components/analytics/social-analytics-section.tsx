"use client";

import { ExternalLinkIcon, Loader2Icon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Workspace = { id: string; name: string; slug: string };

type PostSnapshotRow = {
  id: string;
  connector_account_id?: string;
  provider: string;
  external_post_id?: string;
  title: string | null;
  permalink: string | null;
  posted_at: string | null;
  captured_at: string;
  metrics: Record<string, unknown>;
};

type SnapshotRow = {
  id: string;
  connector_account_id?: string;
  provider: string;
  captured_at: string;
  period_start?: string;
  metric_scope?: string;
  account_external_id?: string | null;
  sync_status?: string | null;
  metrics: {
    display?: { kpis?: Array<{ label: string; value: string }>; headline?: string };
    normalized?: Record<string, unknown>;
  };
  error?: string | null;
};

function metricNum(m: Record<string, unknown>, key: string): number | null {
  const v = m[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

function fmtMetric(n: number | null): string {
  return n === null ? "—" : n.toLocaleString();
}

export function SocialAnalyticsSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loadingWs, setLoadingWs] = useState(true);
  const [latest, setLatest] = useState<SnapshotRow[]>([]);
  const [history, setHistory] = useState<SnapshotRow[]>([]);
  const [posts, setPosts] = useState<PostSnapshotRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [analysisMd, setAnalysisMd] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [syncTone, setSyncTone] = useState<"neutral" | "success" | "warning" | "error">("neutral");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const res = await fetch("/api/v1/workspaces", { credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { workspaces?: Workspace[] };
      if (cancel) {
        return;
      }
      if (!res.ok) {
        setLoadingWs(false);
        setSyncTone("error");
        setNotice(
          typeof json === "object" && json && "error" in json ?
            String((json as { error?: string }).error)
          : "Could not load workspaces"
        );
        return;
      }
      const list = json.workspaces ?? [];
      setWorkspaces(list);
      setWorkspaceId((id) => id || list[0]?.id || "");
      setLoadingWs(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      startTransition(() => {
        setLatest([]);
        setHistory([]);
        setPosts([]);
        setAnalysisMd(null);
      });
      return;
    }
    let cancelled = false;
    (async () => {
      startTransition(() => setLoadingData(true));
      const [snapRes, postsRes] = await Promise.all([
        fetch(`/api/v1/workspaces/${workspaceId}/analytics/social?limit=60`, {
          credentials: "include",
        }),
        fetch(`/api/v1/workspaces/${workspaceId}/analytics/social/posts?limit=40`, {
          credentials: "include",
        }),
      ]);
      const json = await snapRes.json().catch(() => ({}));
      const postsJson = await postsRes.json().catch(() => ({}));
      if (cancelled) {
        return;
      }
      startTransition(() => {
        setLoadingData(false);
        if (!snapRes.ok) {
          setSyncTone("error");
          setNotice(typeof json.error === "string" ? json.error : "Could not load social analytics");
          setLatest([]);
          setHistory([]);
        } else {
          setNotice(null);
          setSyncTone("neutral");
          setLatest(Array.isArray(json.latest) ? json.latest : []);
          setHistory(Array.isArray(json.history) ? json.history : []);
        }
        if (postsRes.ok && Array.isArray(postsJson.posts)) {
          setPosts(postsJson.posts as PostSnapshotRow[]);
        } else {
          setPosts([]);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function runSync() {
    if (!workspaceId) {
      return;
    }
    setSyncing(true);
    setNotice(null);
    setSyncTone("neutral");
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/analytics/social`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    setSyncing(false);
    if (!res.ok) {
      setSyncTone("error");
      setNotice(typeof json.error === "string" ? json.error : "Sync failed");
      return;
    }

    const pulled = typeof json.pulled === "number" ? json.pulled : 0;
    const results = json.results as Array<{ ok: boolean; provider: string; error?: string }> | undefined;
    const failures = results?.filter((r) => !r.ok) ?? [];

    if (failures.length > 0) {
      setSyncTone("warning");
      setNotice(
        [
          pulled > 0 ? `Updated ${pulled} channel(s). Some issues:` : "Pull finished with issues:",
          ...failures.map((f) => `• ${f.provider}: ${f.error ?? "unknown error"}`),
        ].join("\n")
      );
    } else {
      setSyncTone("success");
      setNotice(`Synced ${pulled} connected channel(s).`);
    }
    startTransition(() => setLoadingData(true));
    const [reload, reloadPosts] = await Promise.all([
      fetch(`/api/v1/workspaces/${workspaceId}/analytics/social?limit=60`, {
        credentials: "include",
      }),
      fetch(`/api/v1/workspaces/${workspaceId}/analytics/social/posts?limit=40`, {
        credentials: "include",
      }),
    ]);
    const reloadJson = await reload.json().catch(() => ({}));
    const reloadPostsJson = await reloadPosts.json().catch(() => ({}));
    startTransition(() => {
      setLoadingData(false);
      if (reload.ok) {
        setLatest(Array.isArray(reloadJson.latest) ? reloadJson.latest : []);
        setHistory(Array.isArray(reloadJson.history) ? reloadJson.history : []);
      }
      if (reloadPosts.ok && Array.isArray(reloadPostsJson.posts)) {
        setPosts(reloadPostsJson.posts as PostSnapshotRow[]);
      }
    });
  }

  async function generateSocialAnalysis() {
    if (!workspaceId) {
      return;
    }
    setAnalysisLoading(true);
    setAnalysisMd(null);
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/analytics/social/analysis`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json().catch(() => ({}));
    setAnalysisLoading(false);
    if (!res.ok) {
      setSyncTone("error");
      setNotice(typeof json.error === "string" ? json.error : "Could not generate AI analysis");
      return;
    }
    const md =
      typeof json.analysisMarkdown === "string" ? json.analysisMarkdown
      : typeof json.playbookMarkdown === "string" ? json.playbookMarkdown
      : "";
    setAnalysisMd(md.length > 0 ? md : "_No analysis returned._");
    setNotice(null);
    setSyncTone("neutral");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
          <select
            className={cn(
              "h-9 w-full min-w-[200px] rounded-xl border border-input bg-background px-3 text-sm",
              "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            )}
            value={workspaceId}
            disabled={loadingWs || workspaces.length === 0}
            onChange={(e) => setWorkspaceId(e.target.value)}
            aria-label="Workspace"
          >
            <option value="">{loadingWs ? "Loading…" : "Select workspace"}</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          className="rounded-xl"
          disabled={!workspaceId || syncing}
          onClick={() => void runSync()}
        >
          {syncing ?
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
              Pulling…
            </>
          : <>
              <RefreshCwIcon className="mr-2 size-4" aria-hidden />
              Pull from connected channels
            </>
          }
        </Button>
      </div>

      {notice ?
        <p
          className={cn(
            "text-sm whitespace-pre-line rounded-xl border px-4 py-3",
            syncTone === "neutral" && "border-transparent text-muted-foreground",
            syncTone === "success" &&
              "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-950 dark:text-emerald-100",
            syncTone === "warning" &&
              "border-amber-500/35 bg-amber-500/[0.08] text-amber-950 dark:text-amber-50",
            syncTone === "error" && "border-destructive/40 bg-destructive/[0.06] text-destructive"
          )}
          role="status"
        >
          {notice}
        </p>
      : null}

      {workspaceId ?
        <Card className="rounded-2xl border-border/70 bg-gradient-to-br from-primary/[0.05] via-transparent to-transparent shadow-elevated">
          <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="font-display text-lg">AI analysis</CardTitle>
              <CardDescription className="max-w-2xl text-pretty">
                Full read on connected accounts and ingested posts: pull health, post winners vs laggards, then distinct viral
                playbooks for TikTok, Instagram, and Facebook Page.{" "}
                <span className="text-foreground/90">
                  X-style discovery is contrasted only at a strategic level—there is no X post ingest in this workspace.
                </span>
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0 rounded-xl"
              disabled={analysisLoading}
              onClick={() => void generateSocialAnalysis()}
            >
              {analysisLoading ?
                <>
                  <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                  Analyzing…
                </>
              : <>
                  <SparklesIcon className="mr-2 size-4" aria-hidden />
                  Generate analysis
                </>
              }
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysisMd ?
              <article className="max-h-[min(70vh,36rem)] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/50 bg-background/85 px-4 py-3 text-sm leading-relaxed text-foreground">
                {analysisMd}
              </article>
            : null}
            {!analysisMd && !analysisLoading ?
              <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                Pull channel data above for richer metrics. You can generate anytime—insights use connector snapshots and any
                captured posts.
              </p>
            : null}
          </CardContent>
        </Card>
      : null}

      {!workspaceId && !loadingWs ?
        <p className="text-sm text-muted-foreground">Create a workspace in onboarding to scope social analytics.</p>
      : null}

      {loadingData ?
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Loading snapshots…
        </div>
      : null}

      {!loadingData && workspaceId && latest.length === 0 ?
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground">
          No social metrics yet. Connect a channel in onboarding, then use{" "}
          <span className="font-medium text-foreground">Pull from connected channels</span> to ingest TikTok, Meta, or
          Instagram stats into this workspace.
        </div>
      : null}

      {!loadingData && workspaceId && posts.length > 0 ?
        <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg">Recent posts</CardTitle>
            <CardDescription>
              Latest captured metrics per post (merged across pulls). TikTok rows include views; Meta rows rank on public
              interactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Channel</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Score</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Views</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Likes</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Comments</th>
                  <th className="pb-2 pr-3 font-medium tabular-nums">Shares</th>
                  <th className="pb-2 pr-3 font-medium">Posted</th>
                  <th className="pb-2 font-medium">Preview</th>
                  <th className="pb-2 w-10" aria-label="Open link" />
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => {
                  const m = p.metrics ?? {};
                  const score = metricNum(m, "engagement_score");
                  return (
                    <tr key={p.id} className="border-b border-border/35 align-top">
                      <td className="py-2 pr-3 capitalize">{p.provider}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtMetric(score)}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtMetric(metricNum(m, "views"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtMetric(metricNum(m, "likes"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtMetric(metricNum(m, "comments"))}</td>
                      <td className="py-2 pr-3 tabular-nums">{fmtMetric(metricNum(m, "shares"))}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                        {p.posted_at ? new Date(p.posted_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 pr-3 max-w-[220px] truncate" title={p.title ?? undefined}>
                        {p.title ?? "—"}
                      </td>
                      <td className="py-2">
                        {p.permalink ?
                          <a
                            href={p.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-primary hover:underline"
                            aria-label="Open post"
                          >
                            <ExternalLinkIcon className="size-4" aria-hidden />
                          </a>
                        : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {latest.map((row) => (
          <Card key={row.id} className="rounded-2xl border-border/70 bg-card/85 shadow-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg capitalize">{row.provider}</CardTitle>
              <CardDescription>
                {row.metrics?.display?.headline ?? "Social snapshot"}
                {" · "}
                {new Date(row.captured_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {row.error ?
                <p className="text-sm text-destructive">{row.error}</p>
              : null}
              <ul className="space-y-2 text-sm">
                {(row.metrics?.display?.kpis ?? []).map((k) => (
                  <li key={k.label} className="flex justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
                    <span className="text-muted-foreground">{k.label}</span>
                    <span className="font-medium tabular-nums text-foreground">{k.value}</span>
                  </li>
                ))}
              </ul>
              {(row.metrics?.display?.kpis ?? []).length === 0 && !row.error ?
                <p className="text-xs text-muted-foreground">No KPIs parsed — check provider scopes or try another sync.</p>
              : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {history.length > 0 ?
        <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
          <p className="text-sm font-medium">Recent pulls</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {history.slice(0, 20).map((h) => (
              <li key={h.id}>
                <span className="font-medium capitalize text-foreground">{h.provider}</span> ·{" "}
                {new Date(h.captured_at).toLocaleString()}
                {h.error ? ` · ${h.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      : null}
    </div>
  );
}
