"use client";

import { ChevronDownIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
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

type WorkflowDefBrief = { id: string; name: string; slug: string } | null;

type RunRow = {
  id: string;
  workflow_definition_id: string;
  workflow_definition?: WorkflowDefBrief;
  status: string;
  created_at: string;
  completed_at: string | null;
  output: {
    markdown?: string;
    title?: string;
    kind?: string;
  } | null;
  error_message: string | null;
};

export function WorkflowRunsPanel() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loadingWs, setLoadingWs] = useState(true);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pageSize] = useState(40);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hint, setHint] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (nextOffset: number, mode: "replace" | "append") => {
      if (!workspaceId) {
        return;
      }
      setLoading(true);
      const res = await fetch(
        `/api/v1/workflow-runs?workspace_id=${encodeURIComponent(workspaceId)}&limit=${pageSize}&offset=${nextOffset}`,
        { credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      setLoading(false);
      if (!res.ok) {
        setHint(typeof json.error === "string" ? json.error : "Could not load runs.");
        return;
      }
      const batch = Array.isArray(json.runs) ? (json.runs as RunRow[]) : [];
      const more = Boolean(json.hasMore);
      startTransition(() => {
        setRuns((prev) => (mode === "replace" ? batch : [...prev, ...batch]));
        setOffset(nextOffset + batch.length);
        setHasMore(more);
        setHint(null);
      });
    },
    [pageSize, workspaceId]
  );

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const res = await fetch("/api/v1/workspaces", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (cancel) {
        return;
      }
      if (!res.ok) {
        setHint("Could not load workspaces.");
        setLoadingWs(false);
        return;
      }
      const list = (json.workspaces ?? []) as Workspace[];
      setWorkspaces(list);
      setWorkspaceId((w) => w || list[0]?.id || "");
      setLoadingWs(false);
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) {
      startTransition(() => {
        setRuns([]);
        setOffset(0);
        setHasMore(false);
      });
      return;
    }
    startTransition(() => {
      setRuns([]);
      setOffset(0);
    });
    startTransition(() => {
      void fetchPage(0, "replace");
    });
  }, [workspaceId, fetchPage]);

  function toggleExpand(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">Workflow run history</CardTitle>
            <CardDescription>
              {hint ??
                "All completed and in-progress runs for this workspace (Supabase-backed). Use load more for older pages."}
            </CardDescription>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
            <select
              className={cn(
                "h-9 min-w-[220px] rounded-xl border border-input bg-background px-3 text-sm",
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!workspaceId && !loadingWs ?
          <p className="text-sm text-muted-foreground">Create or select a workspace to see run history.</p>
        : null}

        {runs.length === 0 && !loading && workspaceId ?
          <p className="text-sm text-muted-foreground">No runs yet — trigger an agent from the Agents page.</p>
        : null}

        {runs.map((run) => {
          const md = run.output?.markdown;
          const name = run.workflow_definition?.name ?? "Workflow";
          const slug = run.workflow_definition?.slug ?? run.workflow_definition_id;
          const open = expanded[run.id];

          return (
            <div key={run.id} className="rounded-xl border border-border/60 bg-muted/20">
              <button
                type="button"
                onClick={() => toggleExpand(run.id)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {open ?
                      <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                    : <ChevronRightIcon className="size-4 shrink-0" aria-hidden />}
                    <span className="truncate">{name}</span>
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{slug}</p>
                  <p className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</p>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">
                  {run.status}
                </Badge>
              </button>
              {run.error_message && run.status === "failed" ?
                <p className="px-3 pb-2 text-xs text-destructive">{run.error_message}</p>
              : null}
              {open && md ?
                <article className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border/50 px-3 py-2 text-xs leading-relaxed">
                  {md}
                </article>
              : null}
              {open && !md && run.status === "succeeded" ?
                <p className="border-t border-border/50 px-3 py-2 text-xs text-muted-foreground">No markdown payload.</p>
              : null}
            </div>
          );
        })}

        {loading ?
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" aria-hidden />
            Loading…
          </div>
        : null}

        {hasMore && workspaceId ?
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() => void fetchPage(offset, "append")}
          >
            Load more
          </Button>
        : null}
      </CardContent>
    </Card>
  );
}
