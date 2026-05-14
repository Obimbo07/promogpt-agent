import Link from "next/link";
import { BotIcon } from "lucide-react";

import { AgentsWorkspacePanel } from "@/components/agents/agents-workspace-panel";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
              Marketing agents are Supabase-backed workflows. Install them per workspace, run jobs, and read Markdown
              output from each workflow run—grounded in your social pulls and post-level metrics.
            </p>
          </div>
        </div>
        <Link href="/workflows" className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
          Workflow runs
        </Link>
      </div>

      <AgentsWorkspacePanel />
    </section>
  );
}
