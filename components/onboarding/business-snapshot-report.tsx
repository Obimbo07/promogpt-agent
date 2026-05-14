"use client";

import Link from "next/link";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { startTransition, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Facts = {
  generatedAt: string;
  viewer: { displayName: string | null; jobTitle: string | null; onboardingCompletedAt: string | null };
  workspace: { id: string; name: string; slug: string; organizationId: string };
  organization: { id: string; name: string; slug: string };
  social: {
    connectors: Array<{
      provider: string;
      status: string | null;
      displayName: string | null;
      connectedAt: string | null;
    }>;
    latestSnapshots: Array<{
      provider: string;
      headline: string;
      kpis: Array<{ label: string; value: string }>;
      capturedAt: string;
      syncStatus: string | null;
      error: string | null;
    }>;
  };
};

export function BusinessSnapshotReport(props: { workspaceId: string }) {
  const { workspaceId } = props;
  const [facts, setFacts] = useState<Facts | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      startTransition(() => {
        setLoading(true);
        setError(null);
      });

      const res = await fetch(`/api/v1/workspaces/${workspaceId}/business-report`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));

      if (cancelled) {
        return;
      }

      startTransition(() => {
        setLoading(false);
        if (!res.ok) {
          setFacts(null);
          setError(typeof json.error === "string" ? json.error : "Could not load report");
          return;
        }
        setFacts(json.facts as Facts);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function refreshFacts() {
    if (!workspaceId) {
      return;
    }

    startTransition(() => {
      setLoading(true);
      setError(null);
    });

    const res = await fetch(`/api/v1/workspaces/${workspaceId}/business-report`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));

    startTransition(() => {
      setLoading(false);
      if (!res.ok) {
        setFacts(null);
        setError(typeof json.error === "string" ? json.error : "Could not load report");
        return;
      }
      setFacts(json.facts as Facts);
    });
  }

  async function generateNarrative(model: "fast-agent" | "multimodal-lite") {
    if (!workspaceId) {
      return;
    }
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/v1/workspaces/${workspaceId}/business-report/narrative`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    const json = await res.json().catch(() => ({}));
    setGenerating(false);
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "AI narrative failed");
      return;
    }
    setNarrative(typeof json.narrativeMarkdown === "string" ? json.narrativeMarkdown : null);
    if (json.facts) {
      setFacts(json.facts as Facts);
    }
  }

  if (!workspaceId) {
    return null;
  }

  return (
    <Card className="rounded-2xl border-border/80 shadow-elevated">
      <CardHeader>
        <CardTitle className="font-display text-lg">Business snapshot report</CardTitle>
        <CardDescription>
          Pulls your onboarding profile, workspace/org labels, connector status, and the latest analytics snapshots
          (after you run a social pull from{" "}
          <Link href="/analytics" className="text-accent-primary underline underline-offset-2 hover:text-accent-primary">
            Analytics
          </Link>
          ).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="rounded-xl" disabled={loading} onClick={() => void refreshFacts()}>
            {loading ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                Refresh facts
              </>
            ) : (
              "Refresh facts"
            )}
          </Button>
          <Button
            type="button"
            className="rounded-xl gap-2"
            disabled={generating || !facts}
            onClick={() => void generateNarrative("fast-agent")}
          >
            {generating ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : <SparklesIcon className="size-4" aria-hidden />}
            AI summary (Groq)
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-xl gap-2"
            disabled={generating || !facts}
            onClick={() => void generateNarrative("multimodal-lite")}
          >
            AI summary (Gemini)
          </Button>
        </div>

        {error ? (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : null}

        {!facts && !loading ? (
          <p className="text-sm text-muted-foreground">Report data unavailable.</p>
        ) : null}

        {facts ? (
          <>
            <section className="space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identity</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>
                  Profile:{" "}
                  <span className="text-foreground">
                    {facts.viewer.displayName?.trim() || "—"}
                    {facts.viewer.jobTitle ? ` · ${facts.viewer.jobTitle}` : ""}
                  </span>
                </li>
                <li>
                  Onboarding marked complete:{" "}
                  <span className="text-foreground">{facts.viewer.onboardingCompletedAt ? "Yes" : "Not yet"}</span>
                </li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-2 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li className="text-foreground">{facts.workspace.name}</li>
                <li>
                  Org: <span className="text-foreground">{facts.organization.name}</span> ({facts.organization.slug})
                </li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Social connectors</p>
              {facts.social.connectors.length === 0 ? (
                <p className="text-muted-foreground">No connector rows yet — connect TikTok or Meta above.</p>
              ) : (
                <ul className="space-y-2">
                  {facts.social.connectors.map((c) => (
                    <li key={c.provider} className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
                      <span className="font-medium capitalize">{c.provider}</span>
                      <span className="text-muted-foreground"> · </span>
                      <span>{c.status ?? "unknown"}</span>
                      {c.connectedAt ? (
                        <>
                          <span className="text-muted-foreground"> · connected </span>
                          {new Date(c.connectedAt).toLocaleDateString()}
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Separator />

            <section className="space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Latest pulled metrics (per channel)
              </p>
              {facts.social.latestSnapshots.length === 0 ? (
                <p className="text-muted-foreground">
                  No snapshots yet — open Analytics and run &quot;Pull from socials&quot; after connecting TikTok/Meta.
                </p>
              ) : (
                <div className="space-y-4">
                  {facts.social.latestSnapshots.map((snap) => (
                    <div key={snap.provider} className="rounded-xl border border-border/70 bg-muted/15 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold capitalize">{snap.provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(snap.capturedAt).toLocaleString()} · {snap.syncStatus ?? "unknown"}
                        </p>
                      </div>
                      <p className="mt-2 text-sm">{snap.headline}</p>
                      {snap.error ? <p className="mt-2 text-xs text-destructive">{snap.error}</p> : null}
                      {snap.kpis.length > 0 ? (
                        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                          {snap.kpis.map((k) => (
                            <li key={`${snap.provider}-${k.label}`} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{k.label}:</span> {k.value}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs text-muted-foreground">Facts generated at {new Date(facts.generatedAt).toLocaleString()}.</p>
          </>
        ) : null}

        {narrative ? (
          <>
            <Separator />
            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI narrative</p>
              <div className="prose prose-sm max-w-none rounded-xl border border-border/70 bg-muted/15 p-4 dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm">{narrative}</pre>
              </div>
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
