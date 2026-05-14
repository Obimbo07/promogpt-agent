import type { SupabaseClient } from "@supabase/supabase-js";

export type SocialConnectorFact = {
  provider: string;
  status: string | null;
  displayName: string | null;
  connectedAt: string | null;
  updatedAt: string | null;
};

export type SocialSnapshotFact = {
  provider: string;
  headline: string;
  kpis: Array<{ label: string; value: string }>;
  capturedAt: string;
  syncStatus: string | null;
  error: string | null;
};

export type BusinessReportFacts = {
  generatedAt: string;
  viewer: {
    displayName: string | null;
    jobTitle: string | null;
    onboardingCompletedAt: string | null;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    organizationId: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  social: {
    connectors: SocialConnectorFact[];
    latestSnapshots: SocialSnapshotFact[];
  };
};

function snapshotFactsFromRows(
  rows: Array<{
    provider: string;
    captured_at: string;
    sync_status: string | null;
    metrics: unknown;
    error: string | null;
  }>
): SocialSnapshotFact[] {
  const latestByProvider = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByProvider.has(row.provider)) {
      latestByProvider.set(row.provider, row);
    }
  }

  return [...latestByProvider.values()].map((row) => {
    const metrics = row.metrics as {
      display?: { headline?: string; kpis?: Array<{ label: string; value: string }> };
    };
    const headline =
      typeof metrics?.display?.headline === "string" ? metrics.display.headline : "Snapshot";
    const kpis =
      Array.isArray(metrics?.display?.kpis) ?
        metrics.display!.kpis!.filter(
          (k): k is { label: string; value: string } =>
            typeof k?.label === "string" && typeof k?.value === "string"
        )
      : [];

    return {
      provider: row.provider,
      headline,
      kpis,
      capturedAt: row.captured_at,
      syncStatus: row.sync_status,
      error: row.error,
    };
  });
}

export async function gatherBusinessReportFacts(args: {
  supabase: SupabaseClient;
  userId: string;
  workspaceId: string;
}): Promise<{ ok: true; facts: BusinessReportFacts } | { ok: false; error: string }> {
  const { supabase, userId, workspaceId } = args;

  const [{ data: wsRow, error: wsErr }, { data: profile, error: profErr }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id,name,slug,organization_id, organizations(id,name,slug)")
      .eq("id", workspaceId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, job_title, onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (wsErr) {
    return { ok: false, error: wsErr.message };
  }

  if (!wsRow?.organization_id) {
    return { ok: false, error: "Workspace not found" };
  }

  if (profErr) {
    return { ok: false, error: profErr.message };
  }

  const orgRaw = wsRow.organizations as { id?: string; name?: string; slug?: string } | { id?: string; name?: string; slug?: string }[] | null;

  const orgJoin = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  const [{ data: connectors, error: connErr }, { data: snaps, error: snapErr }] = await Promise.all([
    supabase
      .from("connector_accounts")
      .select("provider,status,display_name,connected_at,updated_at")
      .eq("workspace_id", workspaceId),
    supabase
      .from("workspace_social_analytics_snapshots")
      .select("provider, captured_at, sync_status, metrics, error")
      .eq("workspace_id", workspaceId)
      .order("captured_at", { ascending: false })
      .limit(120),
  ]);

  if (connErr || snapErr) {
    return { ok: false, error: connErr?.message ?? snapErr?.message ?? "Lookup failed" };
  }

  const connectorFacts: SocialConnectorFact[] = (connectors ?? []).map((c) => ({
    provider: c.provider,
    status: c.status,
    displayName: c.display_name,
    connectedAt: c.connected_at,
    updatedAt: c.updated_at,
  }));

  const latestSnapshots = snapshotFactsFromRows(snaps ?? []);

  const facts: BusinessReportFacts = {
    generatedAt: new Date().toISOString(),
    viewer: {
      displayName: profile?.display_name ?? null,
      jobTitle: profile?.job_title ?? null,
      onboardingCompletedAt: profile?.onboarding_completed_at ?? null,
    },
    workspace: {
      id: wsRow.id,
      name: wsRow.name,
      slug: wsRow.slug,
      organizationId: wsRow.organization_id,
    },
    organization: {
      id: orgJoin?.id ?? wsRow.organization_id,
      name: typeof orgJoin?.name === "string" ? orgJoin.name : "Organization",
      slug: typeof orgJoin?.slug === "string" ? orgJoin.slug : "",
    },
    social: {
      connectors: connectorFacts,
      latestSnapshots,
    },
  };

  return { ok: true, facts };
}
