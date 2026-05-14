import type { SupabaseClient } from "@supabase/supabase-js";

import type { CalendarSlotParsed } from "@/lib/calendar/slots-from-agent-text";

/**
 * Persist agent-proposed editorial slots linked to the workflow run that produced them.
 */
export async function insertAgentCalendarSlots(args: {
  admin: SupabaseClient;
  workspaceId: string;
  workflowRunId: string;
  createdBy: string | null;
  slots: CalendarSlotParsed[];
}): Promise<{ inserted: number }> {
  const slice = args.slots.slice(0, 25);
  let inserted = 0;

  for (const slot of slice) {
    const startsAt = new Date(slot.starts_at);
    if (Number.isNaN(startsAt.getTime())) {
      continue;
    }

    const { error } = await args.admin.from("workspace_calendar_events").insert({
      workspace_id: args.workspaceId,
      title: slot.title.slice(0, 500),
      body: slot.notes ?? null,
      starts_at: startsAt.toISOString(),
      ends_at: null,
      channel: slot.channel,
      status: "proposed",
      source: "agent",
      workflow_run_id: args.workflowRunId,
      metadata: { agent_kind: "promogpt.agent.schedule", v: 1 },
      created_by: args.createdBy,
    });

    if (!error) {
      inserted += 1;
    }
  }

  return { inserted };
}
