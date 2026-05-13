"use client";

import { motion } from "framer-motion";

import { TokenUsageChart } from "@/components/dashboard/token-usage-chart";
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

const agents = [
  { name: "Brand voice", phase: "active" as const, detail: "Copy variants live" },
  { name: "Creative remix", phase: "optimizing" as const, detail: "A/B scoring" },
  { name: "Deploy bot", phase: "processing" as const, detail: "3 channels" },
];

function phaseBadgeClasses(phase: (typeof agents)[number]["phase"]) {
  if (phase === "active") {
    return "border-accent-success/50 bg-accent-success/15 text-accent-success shadow-[0_0_14px_color-mix(in_srgb,var(--accent-success)_35%,transparent)]";
  }
  if (phase === "optimizing") {
    return "border-accent-secondary/50 bg-accent-secondary/15 text-accent-secondary shadow-[0_0_14px_color-mix(in_srgb,var(--accent-secondary)_30%,transparent)]";
  }
  return "border-border bg-muted text-muted-foreground";
}

export function DashboardView() {
  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <motion.div variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-3xl font-bold tracking-tight md:text-4xl">Mission readiness</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Pulse on campaigns, workflows, agents, and token consumption — streamed for operators who ship.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={phaseBadgeClasses("active")}>Runtime healthy</Badge>
          <Badge
            variant="outline"
            className="rounded-lg border-accent-primary/40 bg-accent-primary/10 text-accent-primary"
          >
            Automation · 94
          </Badge>
          <Badge variant="outline" className="rounded-lg border-accent-energy/35 text-accent-energy">
            3 deployments queued
          </Badge>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Active workflows",
            value: "18",
            detail: "+4 vs last sprint",
          },
          {
            title: "AI token burst",
            value: "842k",
            detail: "24h throughput",
          },
          {
            title: "Deployments",
            value: "Live",
            detail: "Last push 04:12 UTC",
          },
        ].map((item) => (
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
            <CardTitle className="font-display text-lg">Usage surge</CardTitle>
            <CardDescription>Realtime token throughput by day</CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-2">
            <TokenUsageChart />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-card/85 shadow-elevated backdrop-blur-[var(--glass-blur)] lg:col-span-5">
          <CardHeader className="pb-0">
            <CardTitle className="font-display text-lg">Agent choreography</CardTitle>
            <CardDescription>Operational signals from your fleet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/35 p-3"
              >
                <div>
                  <p className="font-medium leading-tight">{agent.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{agent.detail}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 rounded-lg text-[0.65rem] font-semibold uppercase tracking-wide capitalize ${phaseBadgeClasses(agent.phase)}`}
                >
                  {agent.phase}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
