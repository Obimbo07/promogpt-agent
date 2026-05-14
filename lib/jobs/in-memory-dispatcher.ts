import { logApiEvent } from "@/lib/observability/request-context";
import { createAdminClient } from "@/lib/supabase/admin";

import { processWorkflowRunById } from "./workflow-processor";
import type { JobDispatcher, JobName, JobPayload } from "./types";

/**
 * Immediately processes runs when the service-role client is configured; otherwise no-ops.
 * Supabase / Vercel cron should call `POST /api/internal/cron/workflow-runs` to drain pending rows in serverless churn.
 */
export function createInMemoryJobDispatcher(): JobDispatcher {
  return {
    async enqueue<K extends JobName>(name: K, payload: JobPayload[K]) {
      const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      if (name === "workflow.run") {
        const p = payload as JobPayload["workflow.run"];
        const admin = createAdminClient();

        if (!admin) {
          logApiEvent({
            event: "job.workflow.deferred",
            reason: "missing_service_role",
            workflowRunId: p.workflowRunId,
            jobId,
          });
        } else {
          void processWorkflowRunById(admin, p.workflowRunId).catch((err) => {
            logApiEvent({
              event: "job.workflow.processor_error",
              workflowRunId: p.workflowRunId,
              jobId,
              error: err instanceof Error ? err.message : "unknown",
            });
          });
        }
      }

      return { jobId };
    },
  };
}
