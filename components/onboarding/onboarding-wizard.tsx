"use client";

import { useCallback, useState } from "react";

import { useRouter } from "next/navigation";

import { BusinessSnapshotReport } from "@/components/onboarding/business-snapshot-report";
import { WorkspaceConnectionsPanel } from "@/components/onboarding/workspace-connections-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type Org = { id: string; name: string; slug: string };
type Ws = { id: string; name: string; slug: string; organizationId: string };

export function OnboardingWizard(props: {
  organizations: Org[];
  workspaces: Ws[];
  initialProfile: {
    displayName: string | null;
    jobTitle: string | null;
    onboardingCompletedAt: string | null;
  } | null;
}) {
  const router = useRouter();
  const { organizations, workspaces } = props;

  const [selectedOrgId, setSelectedOrgId] = useState(() => organizations[0]?.id ?? "");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  const [pickedWorkspaceId, setPickedWorkspaceId] = useState(() => workspaces[0]?.id ?? "");
  const resolvedWorkspaceId = pickedWorkspaceId || workspaces[0]?.id || "";

  const [displayName, setDisplayName] = useState(props.initialProfile?.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(props.initialProfile?.jobTitle ?? "");

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const emitNotice = useCallback((message: string | null) => {
    setStatusMsg(message);
  }, []);

  async function saveProfile(markComplete: boolean) {
    setBusy("profile");
    setStatusMsg(null);

    const res = await fetch("/api/v1/me/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName.trim() || undefined,
        jobTitle: jobTitle.trim() ? jobTitle.trim() : null,
        onboardingCompleted: markComplete ? true : undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));

    setBusy(null);

    if (!res.ok) {
      setStatusMsg(typeof json.error === "string" ? json.error : "Profile save failed");
      return;
    }

    setStatusMsg(markComplete ? "Profile marked complete." : "Profile saved.");
    router.refresh();
  }

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedOrgId || !workspaceName.trim()) {
      setStatusMsg("Pick an organization and workspace name.");
      return;
    }

    setBusy("workspace");

    const res = await fetch("/api/v1/workspaces", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: selectedOrgId,
        name: workspaceName.trim(),
        slug: workspaceSlug.trim() || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));

    setBusy(null);

    if (!res.ok) {
      setStatusMsg(typeof json.error === "string" ? json.error : "Workspace creation failed");
      return;
    }

    const id = json.workspaceId as string | undefined;

    if (id) {
      setPickedWorkspaceId(id);
      setWorkspaceName("");
      setWorkspaceSlug("");
      setStatusMsg("Workspace created.");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Finish onboarding</h1>
        <p className="mt-2 text-muted-foreground">
          Complete your profile and link TikTok or Meta for this workspace. Connections persist in Postgres via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">connector_accounts</code>; analytics snapshots appear after you pull from socials (Analytics + business report below).
        </p>
      </div>

      {statusMsg ? (
        <p className="rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-foreground">
          {statusMsg}
        </p>
      ) : null}

      <Card className="rounded-2xl border-border/80 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-lg">Profile</CardTitle>
          <CardDescription>Shown to teammates and used for attribution in workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Display name
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex Rivera" />
          </label>
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Role / title (optional)
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Head of Growth" />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              className="rounded-xl"
              disabled={busy === "profile"}
              onClick={() => void saveProfile(false)}
            >
              Save profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              disabled={busy === "profile"}
              onClick={() => void saveProfile(true)}
            >
              Mark onboarding complete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80 shadow-elevated">
        <CardHeader>
          <CardTitle className="font-display text-lg">Workspace</CardTitle>
          <CardDescription>
            Social connections are scoped per workspace inside your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {workspaces.length > 0 ? (
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active workspace
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={pickedWorkspaceId || workspaces[0]?.id || ""}
                onChange={(e) => setPickedWorkspaceId(e.target.value)}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.slug})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create your first workspace for this organization — downstream connectors attach here.
            </p>
          )}

          <Separator />

          <form className="space-y-4" onSubmit={(e) => void createWorkspace(e)}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create workspace</p>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Organization
              <select
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace name
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Growth HQ"
              />
            </label>
            <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace slug (optional)
              <Input value={workspaceSlug} onChange={(e) => setWorkspaceSlug(e.target.value)} placeholder="growth-hq" />
            </label>
            <Button type="submit" className="rounded-xl" disabled={busy === "workspace"}>
              Create workspace
            </Button>
          </form>
        </CardContent>
      </Card>

      <WorkspaceConnectionsPanel workspaceId={resolvedWorkspaceId} onNotice={emitNotice} />

      <BusinessSnapshotReport workspaceId={resolvedWorkspaceId} />

      <div className="flex justify-end">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
