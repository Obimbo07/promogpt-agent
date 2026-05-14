"use client";

import Link from "next/link";
import {
  BarChart3Icon,
  BotIcon,
  CalendarIcon,
  Loader2Icon,
  PenLineIcon,
  PlayIcon,
  SearchIcon,
} from "lucide-react";
import { useCallback, useEffect, useState, startTransition } from "react";

import { AGENT_WORKFLOW_CATALOG } from "@/lib/agents/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Workspace = { id: string; name: string; slug: string };

type WorkflowRow = { id: string; name: string; slug: string; definition: Record<string, unknown> };

type RunRow = {
  id: string;
  workflow_definition_id: string;
  status: string;
  output: {
    v?: number;
    kind?: string;
    title?: string;
    markdown?: string;
    meta?: Record<string, unknown>;
  } | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

const iconForSlug: Record<string, typeof SearchIcon> = {
  "agent-content-research": SearchIcon,
  "agent-post-drafts": PenLineIcon,
  "agent-schedule-coach": CalendarIcon,
  "agent-marketing-report": BarChart3Icon,
};

export function AgentsWorkspacePanel() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loadingWs, setLoadingWs] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [runningSlug, setRunningSlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [researchTopic, setResearchTopic] = useState("");
  const [postBrief, setPostBrief] = useState("");
  const [postChannel, setPostChannel] = useState<"mixed" | "tiktok" | "instagram" | "facebook">("mixed");
  const [horizonDays, setHorizonDays] = useState("14");

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      setWorkflows([]);
      setRuns([]);
      return;
    }
    setLoadingData(true);
    try {
      const [wfRes, runRes] = await Promise.all([
        fetch(`/api/v1/workflows?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
        fetch(`/api/v1/workflow-runs?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" }),
      ]);
      const wfJson = await wfRes.json().catch(() => ({}));
      const runJson = await runRes.json().catch(() => ({}));
      if (wfRes.ok && Array.isArray(wfJson.workflows)) {
        setWorkflows(wfJson.workflows as WorkflowRow[]);
      } else {
        setWorkflows([]);
      }
      if (runRes.ok && Array.isArray(runJson.runs)) {
        setRuns(runJson.runs as RunRow[]);
      } else {
        setRuns([]);
      }
    } finally {
      setLoadingData(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const res = await fetch("/api/v1/workspaces", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (cancel) {
        return;
      }
      if (!res.ok) {
        setNotice("Could not load workspaces.");
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
    startTransition(() => {
      void loadData();
    });
  }, [loadData]);

  async function bootstrapAgents() {
    if (!workspaceId) {
      return;
    }
    setBootstrapping(true);
    setNotice(null);
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/workflows/bootstrap`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    setBootstrapping(false);
    if (!res.ok) {
      setNotice(typeof json.error === "string" ? json.error : "Bootstrap failed");
      return;
    }
    const added = Array.isArray(json.inserted) ? json.inserted.length : 0;
    const skipped = Array.isArray(json.skippedSlugs) ? json.skippedSlugs.length : 0;
    setNotice(`Installed ${added} new workflow(s). ${skipped > 0 ? `${skipped} already present.` : ""}`);
    await loadData();
  }

  function definitionIdForSlug(slug: string): string | null {
    return workflows.find((w) => w.slug === slug)?.id ?? null;
  }

  function latestRunForSlug(slug: string): RunRow | undefined {
    const defId = definitionIdForSlug(slug);
    if (!defId) {
      return undefined;
    }
    const subset = runs.filter((r) => r.workflow_definition_id === defId);
    if (subset.length === 0) {
      return undefined;
    }
    return subset.reduce((best, r) =>
      new Date(r.created_at) > new Date(best.created_at) ? r : best
    );
  }

  async function runAgent(slug: string, payload: Record<string, unknown>) {
    const defId = definitionIdForSlug(slug);
    if (!defId) {
      setNotice("Install agent workflows first.");
      return;
    }
    setRunningSlug(slug);
    setNotice(null);
    const res = await fetch("/api/v1/workflow-runs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflowDefinitionId: defId,
        payload,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setRunningSlug(null);
    if (!res.ok) {
      setNotice(typeof json.error === "string" ? json.error : "Run failed");
      return;
    }
    setNotice("Run queued — refreshing status…");
    await new Promise((r) => setTimeout(r, 1600));
    await loadData();
    await new Promise((r) => setTimeout(r, 2000));
    await loadData();
    setNotice(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
          <select
            className={cn(
              "h-9 w-full min-w-[220px] rounded-xl border border-input bg-background px-3 text-sm",
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
          variant="secondary"
          className="rounded-xl"
          disabled={!workspaceId || bootstrapping}
          onClick={() => void bootstrapAgents()}
        >
          {bootstrapping ?
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
              Installing…
            </>
          : "Install agent workflows"}
        </Button>
      </div>

      {notice ?
        <p className="text-sm rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-muted-foreground">{notice}</p>
      : null}

      {workspaceId ?
        <p className="text-xs text-muted-foreground">
          Review agent-proposed posting slots or plan manually in the{" "}
          <Link href="/calendar" className="font-medium text-accent-primary underline underline-offset-2">
            content calendar
          </Link>
          .
        </p>
      : null}

      {!workspaceId && !loadingWs ?
        <p className="text-sm text-muted-foreground">Select or create a workspace to attach agents.</p>
      : null}

      {loadingData ?
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" aria-hidden />
          Loading agents…
        </div>
      : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {AGENT_WORKFLOW_CATALOG.map((agent) => {
          const Icon = iconForSlug[agent.slug] ?? BotIcon;
          const installed = Boolean(definitionIdForSlug(agent.slug));
          const latest = latestRunForSlug(agent.slug);
          const busy = runningSlug === agent.slug;

          return (
            <Card key={agent.slug} className="rounded-2xl border-border/70 bg-card/90 shadow-elevated">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/30 bg-accent-primary/10">
                      <Icon className="size-5 text-accent-primary" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="font-display text-lg">{agent.name}</CardTitle>
                      <CardDescription className="mt-1 text-pretty">{agent.description}</CardDescription>
                    </div>
                  </div>
                  {latest ?
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {latest.status}
                    </Badge>
                  : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!installed ?
                  <p className="text-xs text-muted-foreground">
                    Install workflows to enable this agent. Results are written to workflow runs (Markdown in output).
                  </p>
                : null}

                {agent.slug === "agent-content-research" ?
                  <div className="space-y-1.5">
                    <label htmlFor={`topic-${agent.slug}`} className="text-xs text-muted-foreground">
                      Focus topic (optional)
                    </label>
                    <Input
                      id={`topic-${agent.slug}`}
                      value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      placeholder="e.g. holiday promo, product education…"
                      className="rounded-xl"
                    />
                  </div>
                : null}

                {agent.slug === "agent-post-drafts" ?
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <span className="text-xs text-muted-foreground">Channel</span>
                      <select
                        className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm"
                        value={postChannel}
                        onChange={(e) =>
                          setPostChannel(e.target.value as "mixed" | "tiktok" | "instagram" | "facebook")
                        }
                      >
                        <option value="mixed">Mixed / compare</option>
                        <option value="tiktok">TikTok</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook Page</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label htmlFor={`brief-${agent.slug}`} className="text-xs text-muted-foreground">
                        Brief (optional)
                      </label>
                      <Input
                        id={`brief-${agent.slug}`}
                        value={postBrief}
                        onChange={(e) => setPostBrief(e.target.value)}
                        placeholder="Launch angle, offer, tone…"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                : null}

                {agent.slug === "agent-schedule-coach" ?
                  <div className="space-y-1.5">
                    <label htmlFor={`horizon-${agent.slug}`} className="text-xs text-muted-foreground">
                      Horizon (days)
                    </label>
                    <Input
                      id={`horizon-${agent.slug}`}
                      type="number"
                      min={1}
                      max={60}
                      value={horizonDays}
                      onChange={(e) => setHorizonDays(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                : null}

                <Button
                  type="button"
                  className="w-full rounded-xl sm:w-auto"
                  disabled={!installed || busy}
                  onClick={() => {
                    if (agent.slug === "agent-content-research") {
                      void runAgent(agent.slug, { topic: researchTopic || undefined });
                      return;
                    }
                    if (agent.slug === "agent-post-drafts") {
                      void runAgent(agent.slug, {
                        brief: postBrief || undefined,
                        channel: postChannel === "mixed" ? undefined : postChannel,
                      });
                      return;
                    }
                    if (agent.slug === "agent-schedule-coach") {
                      const n = Number(horizonDays);
                      void runAgent(agent.slug, { horizonDays: Number.isFinite(n) ? n : 14 });
                      return;
                    }
                    void runAgent(agent.slug, {});
                  }}
                >
                  {busy ?
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                      Running…
                    </>
                  : <>
                      <PlayIcon className="mr-2 size-4" aria-hidden />
                      Run agent
                    </>
                  }
                </Button>

                {latest?.output?.markdown && latest.status === "succeeded" ?
                  <details className="rounded-xl border border-border/60 bg-muted/15">
                    <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium">Latest output</summary>
                    <article className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-border/50 px-3 py-2 text-xs leading-relaxed">
                      {latest.output.markdown}
                    </article>
                  </details>
                : null}

                {latest?.error_message && latest.status === "failed" ?
                  <p className="text-xs text-destructive">{latest.error_message}</p>
                : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
