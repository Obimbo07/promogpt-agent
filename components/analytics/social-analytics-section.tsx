"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
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

export function SocialAnalyticsSection() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [loadingWs, setLoadingWs] = useState(true);
  const [latest, setLatest] = useState<SnapshotRow[]>([]);
  const [history, setHistory] = useState<SnapshotRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
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
      });
      return;
    }
    let cancelled = false;
    (async () => {
      startTransition(() => setLoadingData(true));
      const res = await fetch(`/api/v1/workspaces/${workspaceId}/analytics/social?limit=60`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (cancelled) {
        return;
      }
      startTransition(() => {
        setLoadingData(false);
        if (!res.ok) {
          setSyncTone("error");
          setNotice(typeof json.error === "string" ? json.error : "Could not load social analytics");
          return;
        }
        setNotice(null);
        setSyncTone("neutral");
        setLatest(Array.isArray(json.latest) ? json.latest : []);
        setHistory(Array.isArray(json.history) ? json.history : []);
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
    const reload = await fetch(`/api/v1/workspaces/${workspaceId}/analytics/social?limit=60`, {
      credentials: "include",
    });
    const reloadJson = await reload.json().catch(() => ({}));
    startTransition(() => {
      setLoadingData(false);
      if (reload.ok) {
        setLatest(Array.isArray(reloadJson.latest) ? reloadJson.latest : []);
        setHistory(Array.isArray(reloadJson.history) ? reloadJson.history : []);
      }
    });
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
