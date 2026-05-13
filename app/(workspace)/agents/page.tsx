import { BotIcon, CpuIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const fleet = [
  {
    title: "Launch orchestrator",
    role: "Coordinates multi-channel bursts",
    state: "deployed",
  },
  {
    title: "Insight miner",
    role: "Social listening + anomalies",
    state: "learning",
  },
  {
    title: "Budget guardrail",
    role: "Spend pacing + alerting",
    state: "active",
  },
] as const;

export default function AgentsPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border border-accent-primary/35 bg-accent-primary/10 shadow-glow">
            <BotIcon className="size-6 text-accent-primary" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">AI agents</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Specialized operators with statuses, chaining, and live optimization loops.
            </p>
          </div>
        </div>
        <Button className="gap-2 rounded-xl bg-gradient-to-r from-accent-primary to-violet-500 text-white shadow-glow hover:brightness-110">
          <CpuIcon className="size-4" />
          Provision agent
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {fleet.map((agent) => (
          <Card
            key={agent.title}
            className="rounded-2xl border-border/70 bg-card/85 shadow-elevated backdrop-blur-[var(--glass-blur)]"
          >
            <CardHeader>
              <Badge
                variant="outline"
                className="mb-3 w-fit rounded-lg border-accent-secondary/35 text-accent-secondary capitalize"
              >
                {agent.state}
              </Badge>
              <CardTitle className="font-display leading-tight">{agent.title}</CardTitle>
              <CardDescription>{agent.role}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end pb-6">
              <Button variant="outline" size="sm" className="rounded-lg">
                Open debugger
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
