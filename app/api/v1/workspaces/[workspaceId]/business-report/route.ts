import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { gatherBusinessReportFacts } from "@/lib/reports/gather-business-report-facts";

/** Structured snapshot: onboarding profile + org/workspace + connectors + latest social pulls. */
export async function GET(_request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const gathered = await gatherBusinessReportFacts({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId,
  });

  if (!gathered.ok) {
    return NextResponse.json({ error: gathered.error }, { status: 500 });
  }

  return NextResponse.json({ facts: gathered.facts });
}
