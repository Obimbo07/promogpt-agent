import { CalendarIcon } from "lucide-react";

import { ContentCalendar } from "@/components/calendar/content-calendar";

export default function CalendarPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="flex size-12 items-center justify-center rounded-xl border border-accent-primary/35 bg-accent-primary/10 shadow-glow">
          <CalendarIcon className="size-6 text-accent-primary" aria-hidden />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Content calendar</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Plan posts per workspace, confirm agent-proposed slots, and keep history alongside workflow runs. External
            Google Calendar mirrors will reuse the reserved external provider columns—wire-up comes next.
          </p>
        </div>
      </div>

      <ContentCalendar />
    </section>
  );
}
