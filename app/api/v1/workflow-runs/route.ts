import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { createInMemoryJobDispatcher } from "@/lib/jobs/in-memory-dispatcher";

const dispatcher = createInMemoryJobDispatcher();

const createSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const workspaceId = new URL(request.url).searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id query required" }, { status: 400 });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 150);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const { data: defs, error: defErr } = await session.supabase
    .from("workflow_definitions")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (defErr) {
    return NextResponse.json({ error: defErr.message }, { status: 500 });
  }

  const ids = (defs ?? []).map((d) => d.id);

  if (!ids.length) {
    return NextResponse.json({ runs: [], limit, offset: 0, hasMore: false });
  }

  const workflowDefinitionId = new URL(request.url).searchParams.get("workflow_definition_id");

  let qb = session.supabase
    .from("workflow_runs")
    .select(
      "id, workflow_definition_id, status, triggered_by, payload, output, error_message, created_at, completed_at"
    )
    .in("workflow_definition_id", ids);

  if (workflowDefinitionId && ids.includes(workflowDefinitionId)) {
    qb = qb.eq("workflow_definition_id", workflowDefinitionId);
  }

  const { data: runs, error: runErr } = await qb
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }

  const list = runs ?? [];
  const defIds = [...new Set(list.map((r) => r.workflow_definition_id))];
  let defMap: Record<string, { id: string; name: string; slug: string }> = {};

  if (defIds.length > 0) {
    const { data: defRows } = await session.supabase
      .from("workflow_definitions")
      .select("id, name, slug")
      .in("id", defIds);

    defMap = Object.fromEntries((defRows ?? []).map((d) => [d.id, d]));
  }

  const enriched = list.map((r) => ({
    ...r,
    workflow_definition: defMap[r.workflow_definition_id] ?? null,
  }));

  return NextResponse.json({
    runs: enriched,
    limit,
    offset,
    hasMore: list.length === limit,
  });
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const raw = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: defRow, error: defErr } = await session.supabase
    .from("workflow_definitions")
    .select("workspace_id")
    .eq("id", parsed.data.workflowDefinitionId)
    .maybeSingle();

  if (defErr || !defRow?.workspace_id) {
    return NextResponse.json({ error: "Workflow definition not found" }, { status: 404 });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, defRow.workspace_id);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required to run workflows" }, { status: 403 });
  }

  const { data: run, error } = await session.supabase
    .from("workflow_runs")
    .insert({
      workflow_definition_id: parsed.data.workflowDefinitionId,
      status: "pending",
      triggered_by: session.userId,
      payload: parsed.data.payload ?? {},
    })
    .select("*")
    .single();

  if (error || !run) {
    return NextResponse.json({ error: error?.message ?? "failed" }, { status: 400 });
  }

  const { jobId } = await dispatcher.enqueue("workflow.run", {
    workflowRunId: run.id,
    workflowDefinitionId: parsed.data.workflowDefinitionId,
  });

  return NextResponse.json({
    run,
    job: { jobId },
  });
}
