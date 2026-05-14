import { logApiEvent } from "@/lib/observability/request-context";
import { createAdminClient } from "@/lib/supabase/admin";

import type { JobDispatcher, JobName, JobPayload } from "./types";

/**
 * Development placeholder: promote runs to `running` then `succeeded` when service role is present.
 * Swap for Trigger.dev when configured.
 */
export function createInMemoryJobDispatcher(): JobDispatcher {
  return {
    async enqueue<K extends JobName>(name: K, payload: JobPayload[K]) {
      const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      if (name === "workflow.run") {
        const p = payload as JobPayload["workflow.run"];
        queueMicrotask(() => runWorkflowStub(jobId, p));
      }

      return { jobId };
    },
  };
}

async function runWorkflowStub(
  jobId: string,
  p: JobPayload["workflow.run"]
) {
  const admin = createAdminClient();
  if (!admin) {
    logApiEvent({
      event: "job.workflow.runskipped",
      reason: "missing_service_role",
      workflowRunId: p.workflowRunId,
      jobId,
    });
    return;
  }

  await admin.from("workflow_runs").update({ status: "running" }).eq("id", p.workflowRunId);

  await new Promise((r) => setTimeout(r, 250));

  await admin
    .from("workflow_runs")
    .update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
    })
    .eq("id", p.workflowRunId);

  logApiEvent({
    event: "job.workflow.runcompleted_stub",
    jobId,
    workflowRunId: p.workflowRunId,
  });
}
