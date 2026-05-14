import type { SupabaseClient } from "@supabase/supabase-js";

import { executeAgentWorkflow } from "@/lib/agents/execute-agent-workflow";
import { AGENT_WORKFLOW_SLUGS } from "@/lib/agents/catalog";
import { insertAgentCalendarSlots } from "@/lib/calendar/insert-agent-calendar-slots";
import { logApiEvent } from "@/lib/observability/request-context";

function isAgentWorkflowSlug(slug: string, definition: Record<string, unknown>): boolean {
  if (typeof definition.kind === "string" && definition.kind.startsWith("promogpt.agent.")) {
    return true;
  }
  return AGENT_WORKFLOW_SLUGS.includes(slug as (typeof AGENT_WORKFLOW_SLUGS)[number]);
}

/**
 * Advances `workflow_runs` from pending → succeeded.
 * Agent workflows (`promogpt.agent.*`) run AI workloads; other definitions remain lightweight stubs.
 * Invoked from in-memory dispatcher + `/api/internal/cron/workflow-runs`.
 */
export async function processWorkflowRunById(admin: SupabaseClient, workflowRunId: string) {
  const { error: runErr } = await admin.from("workflow_runs").update({ status: "running" }).eq("id", workflowRunId);

  if (runErr) {
    logApiEvent({ event: "workflow.run_update_failed", workflowRunId, error: runErr.message });
    return;
  }

  const { data: runRow, error: loadErr } = await admin
    .from("workflow_runs")
    .select("id, payload, triggered_by, workflow_definition_id")
    .eq("id", workflowRunId)
    .maybeSingle();

  if (loadErr || !runRow) {
    logApiEvent({ event: "workflow.run_load_failed", workflowRunId, error: loadErr?.message ?? "missing row" });
    await admin
      .from("workflow_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: loadErr?.message ?? "Run not found",
      })
      .eq("id", workflowRunId);
    return;
  }

  const { data: defRow, error: defErr } = await admin
    .from("workflow_definitions")
    .select("id, slug, workspace_id, definition")
    .eq("id", runRow.workflow_definition_id)
    .maybeSingle();

  if (defErr || !defRow) {
    const msg = defErr?.message ?? "Definition missing";
    await admin
      .from("workflow_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: msg,
      })
      .eq("id", workflowRunId);
    return;
  }

  const defJson = (defRow.definition ?? {}) as Record<string, unknown>;

  try {
    if (isAgentWorkflowSlug(defRow.slug, defJson)) {
      const result = await executeAgentWorkflow({
        admin,
        workflowRun: {
          id: runRow.id,
          payload: (runRow.payload ?? {}) as Record<string, unknown>,
          triggered_by: runRow.triggered_by,
        },
        definition: {
          slug: defRow.slug,
          workspace_id: defRow.workspace_id,
          definition: defJson,
        },
      });

      const { calendar_slots, ...persistOutput } = result;

      const { error: doneErr } = await admin
        .from("workflow_runs")
        .update({
          status: "succeeded",
          completed_at: new Date().toISOString(),
          output: persistOutput as unknown as Record<string, unknown>,
          error_message: null,
        })
        .eq("id", workflowRunId);

      if (doneErr) {
        logApiEvent({ event: "workflow.run_finalize_failed", workflowRunId, error: doneErr.message });
        await admin
          .from("workflow_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: doneErr.message,
          })
          .eq("id", workflowRunId);
        return;
      }

      if (calendar_slots?.length) {
        const { inserted } = await insertAgentCalendarSlots({
          admin,
          workspaceId: defRow.workspace_id,
          workflowRunId,
          createdBy: runRow.triggered_by,
          slots: calendar_slots,
        });
        logApiEvent({
          event: "workflow.calendar_slots_inserted",
          workflowRunId,
          inserted,
        });
      }

      logApiEvent({ event: "workflow.run_agent_ok", workflowRunId, kind: result.kind });
      return;
    }

    await new Promise((r) => setTimeout(r, 200));

    const { error: doneErr } = await admin
      .from("workflow_runs")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
        output: {
          v: 1,
          kind: "promogpt.stub",
          title: "Stub workflow",
          markdown: "_No AI workload attached to this definition._",
        },
        error_message: null,
      })
      .eq("id", workflowRunId);

    if (doneErr) {
      logApiEvent({ event: "workflow.run_finalize_failed", workflowRunId, error: doneErr.message });
      await admin
        .from("workflow_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: doneErr.message,
        })
        .eq("id", workflowRunId);
      return;
    }

    logApiEvent({ event: "workflow.run_completed_stub", workflowRunId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown workflow error";
    logApiEvent({ event: "workflow.run_failed", workflowRunId, error: message });
    await admin
      .from("workflow_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 4000),
      })
      .eq("id", workflowRunId);
  }
}

export async function processPendingWorkflowRuns(
  admin: SupabaseClient,
  opts?: { batchSize?: number }
): Promise<{ processed: number }> {
  const batchSize = opts?.batchSize ?? 25;
  const { data: pending, error } = await admin
    .from("workflow_runs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error || !pending?.length) {
    return { processed: 0 };
  }

  for (const row of pending) {
    await processWorkflowRunById(admin, row.id);
  }

  return { processed: pending.length };
}
