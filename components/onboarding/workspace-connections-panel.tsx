"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  ClockIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  Plug2Icon,
  SendIcon,
  UnplugIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { CONNECTOR_REGISTRY } from "@/lib/connectors/registry";
import { badgeVariants } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type CatalogEntry = { id: string; displayName: string; capabilities: string[] };

type ConnectionRow = {
  id?: string;
  provider?: string | null;
  displayName?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown>;
  connectedAt?: string | null;
};

const CORE_CHANNEL_IDS = new Set(["x", "telegram", "instagram", "facebook", "tiktok", "linkedin"]);

function fallbackCatalogFromRegistry(): CatalogEntry[] {
  return CONNECTOR_REGISTRY.filter((c) => CORE_CHANNEL_IDS.has(c.id)).map((c) => ({
    id: c.id,
    displayName: c.displayName,
    capabilities: [...c.capabilities],
  }));
}

function formatRelativeConnect(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) {
    return "just now";
  }
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const nowY = new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== nowY ? "numeric" : undefined,
  });
}

function capabilityLabel(cap: string) {
  switch (cap) {
    case "publish":
      return "Publish";
    case "schedule":
      return "Schedule";
    case "analytics":
      return "Analytics";
    default:
      return cap;
  }
}

function ProviderMark({ providerId }: { providerId: string }) {
  const base =
    "flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 shadow-xs";

  if (providerId === "instagram") {
    return (
      <div
        className={cn(
          base,
          "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] text-white"
        )}
        aria-hidden
      >
        <svg className="size-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 5.9a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Zm4.65-6.52a.84.84 0 1 1-1.68 0 .84.84 0 0 1 1.68 0ZM16.1 3H7.9A4.9 4.9 0 0 0 3 7.9v8.2A4.9 4.9 0 0 0 7.9 21h8.2a4.9 4.9 0 0 0 4.9-4.9V7.9A4.9 4.9 0 0 0 16.1 3Zm3.4 13.1a3.4 3.4 0 0 1-3.4 3.4H7.9a3.4 3.4 0 0 1-3.4-3.4V7.9a3.4 3.4 0 0 1 3.4-3.4h8.2a3.4 3.4 0 0 1 3.4 3.4v8.2Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  if (providerId === "facebook") {
    return (
      <div
        className={cn(base, "border-transparent bg-[#0866FF] text-white")}
        aria-hidden
      >
        <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 11h2.5l.5-3H14V6.1c0-.9.3-1.5 1.5-1.5H17V2h-2.5C12 2 11 3.6 11 5.5V8H9v3h2v7h3v-7Z" />
        </svg>
      </div>
    );
  }

  if (providerId === "x") {
    return (
      <div className={cn(base, "border-transparent bg-foreground text-background")} aria-hidden>
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="m4 4 5.65 8.3L4 20h2.74l3.68-5.11L13.4 20H20l-5.83-8.56L20 4h-2.74l-3.36 4.65L10.6 4H4Z" />
        </svg>
      </div>
    );
  }

  if (providerId === "telegram") {
    return (
      <div
        className={cn(base, "border-transparent bg-[#229ED9] text-white")}
        aria-hidden
      >
        <SendIcon className="size-5" strokeWidth={2.25} />
      </div>
    );
  }

  if (providerId === "tiktok") {
    return (
      <div className={cn(base, "border-transparent bg-black text-white")} aria-hidden>
        <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.59 10.856c-1.547-.053-2.97-.523-4.18-1.31v5.498A5.59 5.59 0 1 1 9.82 9.454a5.7 5.7 0 0 1 .785.054V12.7a2.83 2.83 0 0 0-.785-.11 2.793 2.793 0 1 0 2.793 2.724v-9.45a7.95 7.95 0 0 0 4.737 1.54V8.58a4.8 4.8 0 0 1-2.786-.724z" />
        </svg>
      </div>
    );
  }

  if (providerId === "linkedin") {
    return (
      <div className={cn(base, "border-transparent bg-[#0A66C2] text-white")} aria-hidden>
        <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn(base, "bg-muted text-muted-foreground")} aria-hidden>
      <Plug2Icon className="size-5" />
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const chip = (variant: "default" | "secondary" | "destructive" | "outline", children: ReactNode) => (
    <span
      className={cn(
        badgeVariants({ variant }),
        "inline-flex h-auto min-h-6 max-w-full shrink-0 items-center gap-1 overflow-visible py-1 pl-1.5 pr-2 font-normal whitespace-normal [&>svg]:size-3.5 [&>svg]:shrink-0",
        variant === "outline" && "text-muted-foreground"
      )}
    >
      {children}
    </span>
  );

  const s = status ?? "disconnected";
  if (s === "connected") {
    return (
      chip(
        "default",
        <>
          <CheckCircle2Icon className="opacity-90" aria-hidden />
          Connected
        </>
      )
    );
  }
  if (s === "pending") {
    return (
      chip(
        "secondary",
        <>
          <ClockIcon className="opacity-80" aria-hidden />
          Waiting
        </>
      )
    );
  }
  if (s === "error") {
    return (
      chip(
        "destructive",
        <>
          <AlertCircleIcon aria-hidden />
          Error
        </>
      )
    );
  }
  return (
    chip(
      "outline",
      <>
        <CircleDashedIcon aria-hidden />
        Not linked
      </>
    )
  );
}

export function WorkspaceConnectionsPanel(props: {
  workspaceId: string;
  onNotice: (message: string | null) => void;
}) {
  const router = useRouter();
  const { workspaceId, onNotice } = props;

  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(() => Boolean(props.workspaceId));
  const firstListLoadRef = useRef(true);

  const showDevDemo = process.env.NODE_ENV === "development";

  const refresh = useCallback(
    async (opts?: { preserveNotice?: boolean }) => {
      if (!workspaceId) {
        setCatalog([]);
        setConnections([]);
        setBootstrapping(false);
        return;
      }

      const isFirstFetch = firstListLoadRef.current;
      if (isFirstFetch) {
        setBootstrapping(true);
      }

      const res = await fetch(`/api/v1/workspaces/${workspaceId}/connections`, {
        credentials: "include",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (isFirstFetch) {
          setBootstrapping(false);
          firstListLoadRef.current = false;
        }
        onNotice(typeof json.error === "string" ? json.error : "Could not load connections");
        return;
      }

      setCatalog(json.catalog ?? []);
      setConnections(json.connections ?? []);
      if (isFirstFetch) {
        setBootstrapping(false);
        firstListLoadRef.current = false;
      }
      if (!opts?.preserveNotice) {
        onNotice(null);
      }
    },
    [workspaceId, onNotice]
  );

  useEffect(() => {
    firstListLoadRef.current = true;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, refresh]);

  useEffect(() => {
    function onOAuthMessage(ev: MessageEvent) {
      const d = ev.data as {
        source?: unknown;
        workspaceId?: unknown;
        ok?: unknown;
        notice?: unknown;
        error?: unknown;
      };
      if (!d || d.source !== "promogpt-oauth") {
        return;
      }
      if (typeof d.workspaceId !== "string" || d.workspaceId !== workspaceId) {
        return;
      }
      void refresh({ preserveNotice: true }).then(() => {
        router.refresh();
        if (d.ok === true) {
          const n = typeof d.notice === "string" ? d.notice : null;
      onNotice(n ?? "Channel connected.");
        } else {
          const err = typeof d.error === "string" ? d.error : null;
          onNotice(err ?? "OAuth failed.");
        }
      });
    }

    window.addEventListener("message", onOAuthMessage);
    return () => window.removeEventListener("message", onOAuthMessage);
  }, [workspaceId, onNotice, refresh, router]);

  async function connectProvider(provider: string, stub?: boolean) {
    if (!workspaceId) {
      onNotice("Select or create a workspace first.");
      return;
    }

    setBusy(stub ? `${provider}:stub` : provider);
    onNotice(null);

    const res = await fetch(`/api/v1/workspaces/${workspaceId}/connections`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stub ? { provider, stubComplete: true } : { provider }),
    });

    const json = await res.json().catch(() => ({}));

    setBusy(null);

    if (!res.ok) {
      onNotice(typeof json.error === "string" ? json.error : "Connection flow failed");
      return;
    }

    const initiation = json.initiation as
      | { kind?: string; authorizationUrl?: string; instructions?: string }
      | undefined;

    const usesOAuthPopup =
      provider === "instagram" ||
      provider === "facebook" ||
      provider === "tiktok" ||
      provider === "linkedin";

    if (initiation?.kind === "oauth_redirect" && initiation.authorizationUrl) {
      window.open(initiation.authorizationUrl, "_blank", "noopener,noreferrer");
      onNotice(
        usesOAuthPopup
          ? "Finish signing in with the provider in the new tab. This page updates when you are done."
          : "Complete consent in the provider window. This page will update when the flow finishes."
      );
    } else if (initiation?.kind === "stub") {
      onNotice("Demo connection saved for local testing.");
    } else if (initiation?.kind === "manual_setup" && initiation.instructions) {
      onNotice(initiation.instructions);
    } else {
      onNotice("Follow the instructions saved on this connection.");
    }

    await refresh();
    router.refresh();
  }

  async function disconnect(provider: string) {
    if (!workspaceId) {
      return;
    }

    setBusy(`del-${provider}`);
    onNotice(null);

    const res = await fetch(`/api/v1/workspaces/${workspaceId}/connections/${provider}`, {
      method: "DELETE",
      credentials: "include",
    });

    setBusy(null);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      onNotice(typeof json.error === "string" ? json.error : "Disconnect failed");
      return;
    }

    onNotice("Connection removed.");
    await refresh();
    router.refresh();
  }

  function connectionFor(providerId: string) {
    return connections.find((c) => c.provider === providerId);
  }

  /** Renders immediately if the API is slow or returns an empty catalog (matches server registry). */
  const displayCatalog = catalog.length > 0 ? catalog : fallbackCatalogFromRegistry();

  return (
    <Card className="rounded-2xl border-border/80 shadow-elevated">
        <CardHeader className="space-y-1.5 pb-2">
          <CardTitle className="font-display text-xl tracking-tight">Channels</CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            Link networks to this workspace so PromoGPT can publish and read analytics. Start with TikTok, then
            Facebook and Instagram (Meta) in a separate tab; other providers use the same connect pattern.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {bootstrapping ?
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex gap-3">
                  <Skeleton className="size-11 shrink-0 rounded-2xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
                    <Skeleton className="h-4 w-2/5 rounded-md" />
                    <Skeleton className="h-3 w-full max-w-[180px] rounded-md" />
                  </div>
                  <Skeleton className="h-5 w-24 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ))
          : !workspaceId ?
            <div className="col-span-full rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              Select or create a workspace above — channel connections are stored per workspace.
            </div>
          : displayCatalog.map((entry) => {
              const row = connectionFor(entry.id);
              const status = row?.status ?? "disconnected";
              const rel = formatRelativeConnect(row?.connectedAt ?? undefined);
              const meta = row?.metadata ?? {};
              const missingIg = meta.missing_instagram_business === true;
              const errHint =
                typeof meta.last_error === "string" ? (meta.last_error as string).slice(0, 160) : null;

              const isBusyConnect = busy === entry.id;
              const isBusyStub = busy === `${entry.id}:stub`;
              const isBusyDel = busy === `del-${entry.id}`;

              const primaryCta =
                status === "connected" ? "Reconnect"
                : status === "pending" ? "Resume"
                : "Connect";

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "group flex flex-col gap-3 rounded-2xl border p-4 transition-[border-color,box-shadow]",
                    status === "connected" ?
                      "border-primary/25 bg-gradient-to-b from-primary/[0.06] to-transparent shadow-sm"
                    : "border-border/70 bg-card/70 shadow-xs hover:border-border hover:shadow-sm"
                  )}
                >
                  <div className="flex gap-3">
                    <ProviderMark providerId={entry.id} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-display text-base font-semibold leading-tight">{entry.displayName}</p>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.capabilities.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                          >
                            {capabilityLabel(c)}
                          </span>
                        ))}
                      </div>
                      {status === "connected" && rel ?
                        <p className="text-xs text-muted-foreground">Linked {rel}</p>
                      : null}
                      {status === "pending" ?
                        <p className="text-xs text-muted-foreground">
                          Waiting for you to finish the provider login.
                        </p>
                      : null}
                    </div>
                  </div>

                  {status === "connected" && missingIg && entry.id === "instagram" ?
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-xs leading-snug text-amber-950 dark:text-amber-100">
                      No Instagram Business account found on your Pages. Connect a Business or Creator Instagram to
                      your Facebook Page, then use Reconnect.
                    </div>
                  : null}

                  {status === "error" && errHint ?
                    <div className="rounded-lg border border-destructive/35 bg-destructive/[0.06] px-3 py-2 text-xs leading-snug text-destructive">
                      {errHint}
                      {errHint.length >= 160 ? "…" : ""}
                    </div>
                  : null}

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <Button
                      type="button"
                      size="sm"
                      className="min-w-[7.5rem] rounded-lg"
                      disabled={!workspaceId || isBusyConnect || isBusyStub}
                      onClick={() => void connectProvider(entry.id)}
                    >
                      {isBusyConnect ?
                        <>
                          <Loader2Icon className="mr-1.5 size-4 animate-spin" aria-hidden />
                          Working…
                        </>
                      : (
                        primaryCta
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: "outline", size: "icon-sm" }),
                          "shrink-0 rounded-lg border-border/70"
                        )}
                        disabled={!workspaceId}
                        aria-label="More actions"
                      >
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={!workspaceId || !row || isBusyDel}
                          onClick={() => void disconnect(entry.id)}
                        >
                          {isBusyDel ?
                            <Loader2Icon className="size-4 animate-spin" />
                          : (
                            <UnplugIcon className="size-4" />
                          )}
                          Remove connection
                        </DropdownMenuItem>
                        {showDevDemo ?
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!workspaceId || isBusyStub}
                              onClick={() => void connectProvider(entry.id, true)}
                            >
                              Try demo (dev)
                            </DropdownMenuItem>
                          </>
                        : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>
  );
}
