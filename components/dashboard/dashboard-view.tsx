"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { TokenUsageChart, type UsageSeriesPoint } from "@/components/dashboard/token-usage-chart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type WorkflowRunLite = {
  id: string;
  status: string;
  created_at: string;
};

function runStatusTone(status: string) {
  if (status === "succeeded") {
    return "border-accent-success/50 bg-accent-success/15 text-accent-success";
  }
  if (status === "failed") {
    return "border-destructive/45 bg-destructive/15 text-destructive";
  }
  if (status === "running" || status === "pending") {
    return "border-accent-secondary/50 bg-accent-secondary/15 text-accent-secondary";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function DashboardView() {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const [orgLabel, setOrgLabel] = useState<string | null>(null);

  const [usageSeries, setUsageSeries] = useState<UsageSeriesPoint[]>([]);
  const [monthlyUnits, setMonthlyUnits] = useState<string | null>(null);
  const [usageLimit, setUsageLimit] = useState<number | null>(null);

  const [workflowDefCount, setWorkflowDefCount] = useState<number | null>(null);
  const [recentRuns, setRecentRuns] = useState<WorkflowRunLite[]>([]);
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const orgsRes = await fetch("/api/v1/organizations", { credentials: "include" });

      if (!orgsRes.ok) {
        if (!cancelled) {
          setLoadState("empty");
        }
        return;
      }

      const orgJson = (await orgsRes.json().catch(() => null)) as
        | { organizations?: Array<{ id: string; name?: string }> }
        | null;

      const org = orgJson?.organizations?.[0];

      if (!org?.id) {
        if (!cancelled) {
          setLoadState("empty");
        }
        return;
      }

      setOrgLabel(typeof org.name === "string" && org.name.trim() ? org.name : org.id.slice(0, 8));

      const wsRes = await fetch(`/api/v1/workspaces?organization_id=${encodeURIComponent(org.id)}`, {
        credentials: "include",
      });

      const wsJson = (await wsRes.json().catch(() => null)) as { workspaces?: Array<{ id: string }> } | null;
      const wsId = wsJson?.workspaces?.[0]?.id ?? null;

      setHasWorkspace(wsId !== null);

      const [usageRes, wfRes, runsRes] = await Promise.all([
        fetch(`/api/v1/organizations/${org.id}/usage`, { credentials: "include" }),
        wsId ?
          fetch(`/api/v1/workflows?workspace_id=${encodeURIComponent(wsId)}`, { credentials: "include" })
        : Promise.resolve(null),
        wsId ?
          fetch(`/api/v1/workflow-runs?workspace_id=${encodeURIComponent(wsId)}`, { credentials: "include" })
        : Promise.resolve(null),
      ]);

      if (cancelled) {
        return;
      }

      if (usageRes?.ok) {
        const payload = (await usageRes.json().catch(() => null)) as {
          monthly?: { billable_units?: string; limit_units?: number | null };
          series?: UsageSeriesPoint[];
        } | null;

        setMonthlyUnits(payload?.monthly?.billable_units ?? null);
        setUsageLimit(payload?.monthly?.limit_units ?? null);
        setUsageSeries(payload?.series ?? []);
      }

      if (wfRes?.ok) {
        const wf = (await wfRes.json().catch(() => null)) as { workflows?: unknown[] } | null;
        setWorkflowDefCount(Array.isArray(wf?.workflows) ? wf!.workflows!.length : 0);
      } else {
        setWorkflowDefCount(null);
      }

      if (runsRes?.ok) {
        const body = (await runsRes.json().catch(() => null)) as { runs?: WorkflowRunLite[] } | null;
        setRecentRuns(Array.isArray(body?.runs) ? body!.runs! : []);
      } else {
        setRecentRuns([]);
      }

      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyCardValue =
    monthlyUnits ?
      `${BigInt(monthlyUnits).toLocaleString()}`
    : "—";

  const monthlyDetail =
    usageLimit !== null && usageLimit > 0 ?
      `Monthly cap · ${usageLimit.toLocaleString()} billable units`
    : loadState === "ready" ?
      "Cap optional — set AI_USAGE_MONTHLY_LIMIT_UNITS to enforce quotas"
    : "Loading usage…";

  const workflowCardValue =
    workflowDefCount === null ?
      loadState === "ready" ?
        "—"
      : "…"
    : String(workflowDefCount);

  const workflowDetail =
    loadState !== "ready" ?
      "Loading…"
    : hasWorkspace === false ?
      "Create a workspace under onboarding"
    : recentRuns.length > 0 ?
      `${recentRuns.length} latest runs referenced for rollout stats`
    : "Define workflows to enqueue runs";

  const pendingRuns = recentRuns.filter((r) => r.status === "pending" || r.status === "running").length;
  const succeededRuns = recentRuns.filter((r) => r.status === "succeeded").length;

  const runsCardValue = recentRuns.length > 0 ? String(recentRuns.length) : "—";
  const runsDetail =
    loadState !== "ready" ?
      "Loading…"
    : hasWorkspace === false ?
      "Requires a workspace with definitions"
    : recentRuns.length > 0 ?
      `${pendingRuns} in flight · ${succeededRuns} succeeded (shown window)`
    : "No runs returned from the API yet";

  const showEmptySplash = loadState === "empty";

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl font-bold tracking-tight md:text-4xl">Mission readiness</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Live counts from{' '}
            <span className="text-foreground/80">Organizations</span>,{' '}
            <span className="text-foreground/80">AI usage_events</span>, and{' '}
            <span className="text-foreground/80">workflow_runs</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-lg">
            {!showEmptySplash ? orgLabel ?? "Signed in" : "No organization"}
          </Badge>
        </div>
      </motion.div>

      {showEmptySplash ? (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border/70 bg-muted/25 p-6 text-sm text-muted-foreground">
          Join or create an organization to populate this dashboard — start from Onboarding if you haven&apos;t yet.
        </motion.div>
      ) : (
        <>
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
        {(
          [
            {
              title: "Workflow definitions",
              value: workflowCardValue,
              detail: workflowDetail,
            },
            {
              title: "Monthly AI billable units",
              value: monthlyCardValue,
              detail: monthlyDetail,
            },
            {
              title: "Tracked workflow runs",
              value: runsCardValue,
              detail: runsDetail,
            },
          ] as const
        ).map((item) => (
          <Card
            key={item.title}
            className="rounded-2xl border-border/70 bg-card/85 shadow-elevated backdrop-blur-[var(--glass-blur)] transition-[box-shadow] hover:shadow-glow"
          >
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-semibold tabular-nums">{item.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-12">
        <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated backdrop-blur-[var(--glass-blur)] lg:col-span-7">
          <CardHeader className="pb-0">
            <CardTitle className="font-display text-lg">AI usage curve</CardTitle>
            <CardDescription>Billable units from `ai.chat` events (UTC calendar days, trailing window)</CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-2">
            <TokenUsageChart
              series={usageSeries}
              emptyMessage="No AI completions recorded in this window. Call POST /api/v1/ai/completions."
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated backdrop-blur-[var(--glass-blur)] lg:col-span-5">
          <CardHeader className="pb-0">
            <CardTitle className="font-display text-lg">Latest workflow runs</CardTitle>
            <CardDescription>Most recent executions for your first workspace</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No runs returned — enqueue a run from the Workflows tooling or APIs when definitions exist.
              </p>
            ) : null}
            {recentRuns.slice(0, 8).map((run) => (
              <div
                key={run.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/35 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-muted-foreground">{run.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(run.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <Badge variant="outline" className={`shrink-0 capitalize ${runStatusTone(run.status)}`}>
                  {run.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
        </>
      )}
    </motion.div>
  );
}
