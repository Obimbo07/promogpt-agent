import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { createInMemoryJobDispatcher } from "@/lib/jobs/in-memory-dispatcher";

const dispatcher = createInMemoryJobDispatcher();

const createSchema = z.object({
  workflowDefinitionId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

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
