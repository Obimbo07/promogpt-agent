"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

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

type CalEvent = {
  id: string;
  title: string;
  body: string | null;
  starts_at: string;
  channel: string | null;
  status: string;
  source: string;
  workflow_run_id: string | null;
};

function monthMatrix(view: Date): { date: Date; inMonth: boolean }[] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, 1 - (startPad - i));
    cells.push({ date: d, inMonth: false });
  }
  for (let dom = 1; dom <= daysInMonth; dom++) {
    cells.push({ date: new Date(year, month, dom), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1]!.date;
    const next = new Date(lastCell);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }
  return cells;
}

function keyDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ContentCalendar() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [loadingWs, setLoadingWs] = useState(true);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newStartsLocal, setNewStartsLocal] = useState("");
  const [newChannel, setNewChannel] = useState<string>("instagram");
  const [newBody, setNewBody] = useState("");
  const [saving, setSaving] = useState(false);

  const cells = useMemo(() => monthMatrix(viewMonth), [viewMonth]);

  const rangeIso = useMemo(() => {
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1, 0, 0, 0);
    const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0, 23, 59, 59);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [viewMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.starts_at);
      const k = keyDay(d);
      const arr = map.get(k) ?? [];
      arr.push(ev);
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const loadEvents = useCallback(async () => {
    if (!workspaceId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    const qs = new URLSearchParams({
      from: rangeIso.from,
      to: rangeIso.to,
    });
    const res = await fetch(
      `/api/v1/workspaces/${workspaceId}/calendar/events?${qs.toString()}`,
      { credentials: "include" }
    );
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setNotice(typeof json.error === "string" ? json.error : "Could not load calendar");
      return;
    }
    setNotice(null);
    setEvents(Array.isArray(json.events) ? json.events : []);
  }, [workspaceId, rangeIso.from, rangeIso.to]);

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
      void loadEvents();
    });
  }, [loadEvents]);

  function shiftMonth(delta: number) {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  async function createEvent() {
    if (!workspaceId || !newTitle.trim()) {
      return;
    }
    let startsIso = "";
    if (newStartsLocal) {
      const loc = new Date(newStartsLocal);
      startsIso = Number.isNaN(loc.getTime()) ? "" : loc.toISOString();
    } else if (selectedDay) {
      startsIso = new Date(`${selectedDay}T12:00:00`).toISOString();
    } else {
      startsIso = new Date().toISOString();
    }
    const parsed = new Date(startsIso);
    if (Number.isNaN(parsed.getTime())) {
      setNotice("Invalid date/time.");
      return;
    }
    setSaving(true);
    setNotice(null);
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/calendar/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        starts_at: parsed.toISOString(),
        channel: newChannel,
        body: newBody.trim() || undefined,
        status: "scheduled",
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setNotice(typeof json.error === "string" ? json.error : "Could not schedule");
      return;
    }
    setNewTitle("");
    setNewBody("");
    await loadEvents();
  }

  async function confirmProposed(ev: CalEvent) {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/calendar/events/${ev.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "scheduled" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setNotice(typeof json.error === "string" ? json.error : "Could not confirm slot");
      return;
    }
    await loadEvents();
  }

  async function cancelEvent(ev: CalEvent) {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/calendar/events/${ev.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setNotice(typeof json.error === "string" ? json.error : "Could not cancel");
      return;
    }
    await loadEvents();
  }

  async function deleteEvent(ev: CalEvent) {
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/calendar/events/${ev.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setNotice(typeof json.error === "string" ? json.error : "Could not delete");
      return;
    }
    await loadEvents();
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const selectedEvents =
    selectedDay ? (eventsByDay.get(selectedDay) ?? []).filter((e) => e.status !== "cancelled") : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
          <select
            className={cn(
              "h-9 min-w-[220px] rounded-xl border border-input bg-background px-3 text-sm",
              "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            )}
            value={workspaceId}
            disabled={loadingWs || workspaces.length === 0}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            <option value="">{loadingWs ? "Loading…" : "Select workspace"}</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/15 px-2 py-1">
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => shiftMonth(-1)}>
            <ChevronLeftIcon className="size-4" aria-hidden />
          </Button>
          <p className="min-w-[140px] text-center text-sm font-medium tabular-nums">
            {viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-lg" onClick={() => shiftMonth(1)}>
            <ChevronRightIcon className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {notice ?
        <p className="text-sm rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-muted-foreground">{notice}</p>
      : null}

      <Card className="rounded-2xl border-border/70 bg-card/90 shadow-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg">Month view</CardTitle>
          <CardDescription>
            Slots persist per workspace. Agent proposals appear as{" "}
            <Badge variant="outline" className="mx-1 align-middle">
              proposed
            </Badge>
            until an editor confirms them. Google Calendar sync will attach via external ids later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ?
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Loading events…
            </div>
          : null}

          <div className="grid grid-cols-7 gap-px rounded-xl border border-border/60 bg-border/40">
            {weekdayLabels.map((d) => (
              <div key={d} className="bg-muted/40 px-1 py-2 text-center text-[0.65rem] font-semibold uppercase">
                {d}
              </div>
            ))}
            {cells.map(({ date, inMonth }) => {
              const k = keyDay(date);
              const dayEvents = (eventsByDay.get(k) ?? []).filter((e) => e.status !== "cancelled");
              const selected = selectedDay === k;

              return (
                <button
                  key={`${k}-${inMonth}`}
                  type="button"
                  onClick={() => setSelectedDay(k)}
                  className={cn(
                    "min-h-[92px] bg-background px-1 py-1 text-left text-xs transition-colors hover:bg-muted/30",
                    !inMonth && "text-muted-foreground/45",
                    selected && "ring-2 ring-inset ring-accent-primary/60"
                  )}
                >
                  <span className="font-medium tabular-nums">{date.getDate()}</span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[0.65rem] leading-tight",
                          ev.status === "proposed" ? "bg-amber-500/15 text-amber-950 dark:text-amber-50"
                          : ev.source === "agent" ? "bg-primary/10 text-primary"
                          : "bg-muted text-foreground"
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 ?
                      <span className="text-[0.65rem] text-muted-foreground">+{dayEvents.length - 3}</span>
                    : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <p className="text-sm font-medium">
                {selectedDay ? `Day ${selectedDay}` : "Pick a day"}
              </p>
              <ul className="space-y-2 text-sm">
                {selectedEvents.map((ev) => (
                  <li key={ev.id} className="rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{ev.title}</span>
                      <Badge variant="outline" className="capitalize">
                        {ev.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ev.starts_at).toLocaleString()}
                      {ev.channel ? ` · ${ev.channel}` : ""}
                      {ev.source === "agent" ? " · agent" : ""}
                    </p>
                    {ev.body ?
                      <p className="mt-1 text-xs text-muted-foreground">{ev.body}</p>
                    : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ev.status === "proposed" ?
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="rounded-lg"
                          onClick={() => void confirmProposed(ev)}
                        >
                          Confirm
                        </Button>
                      : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => void cancelEvent(ev)}
                      >
                        Cancel slot
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => void deleteEvent(ev)}
                      >
                        <TrashIcon className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
                {selectedDay && selectedEvents.length === 0 ?
                  <li className="text-sm text-muted-foreground">No active events this day.</li>
                : null}
              </ul>
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
              <p className="text-sm font-medium">Schedule a post</p>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground" htmlFor="cal-title">
                  Title
                </label>
                <Input
                  id="cal-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Launch teaser — IG carousel"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground" htmlFor="cal-start">
                    Local start
                  </label>
                  <Input
                    id="cal-start"
                    type="datetime-local"
                    value={newStartsLocal}
                    onChange={(e) => setNewStartsLocal(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Channel</span>
                  <select
                    className="h-9 w-full rounded-xl border border-input bg-background px-2 text-sm"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                  >
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="facebook">Facebook Page</option>
                    <option value="mixed">Mixed</option>
                    <option value="internal">Internal</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground" htmlFor="cal-body">
                  Draft / notes
                </label>
                <textarea
                  id="cal-body"
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  rows={4}
                  className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Caption ideas, CTA, link…"
                />
              </div>
              <Button
                type="button"
                className="rounded-xl"
                disabled={saving || !workspaceId || !newTitle.trim()}
                onClick={() => void createEvent()}
              >
                {saving ?
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                : <>
                    <PlusIcon className="mr-2 size-4" aria-hidden />
                    Add to calendar
                  </>
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
