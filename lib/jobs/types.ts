/**
 * Durable execution adapter — production target is Trigger.dev (see docs/architecture.md).
 * V1 ships an in-process async stub so API routes can enqueue without external infra.
 */

export type JobName = "workflow.run";

export type WorkflowRunJobPayload = {
  workflowRunId: string;
  workflowDefinitionId: string;
};

export type JobPayload = {
  "workflow.run": WorkflowRunJobPayload;
};

export type JobDispatcher = {
  enqueue<K extends JobName>(
    name: K,
    payload: JobPayload[K]
  ): Promise<{ jobId: string }>;
};
