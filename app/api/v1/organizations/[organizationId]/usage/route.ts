import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { requireOrganizationMembership } from "@/lib/api/workspace-access";
import { utcMonthStartIso } from "@/lib/usage/monthly-ai-units";

function utcDayStartIso(daysAgo: number): string {
  const now = new Date();
  const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 0, 0, 0, 0);
  return new Date(utc).toISOString();
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ organizationId: string }> }
) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const { organizationId } = await ctx.params;

  const gate = await requireOrganizationMembership(session.supabase, session.userId, organizationId);

  if (!gate.ok) {
    return gate.response;
  }

  const seriesStart = utcDayStartIso(6);
  const monthlyStart = utcMonthStartIso();

  const [{ data: monthlyRows, error: mErr }, { data: seriesRows, error: sErr }] = await Promise.all([
    session.supabase
      .from("usage_events")
      .select("quantity,created_at")
      .eq("organization_id", organizationId)
      .eq("event_type", "ai.chat")
      .gte("created_at", monthlyStart)
      .order("created_at", { ascending: true })
      .limit(20_000),
    session.supabase
      .from("usage_events")
      .select("quantity,created_at")
      .eq("organization_id", organizationId)
      .eq("event_type", "ai.chat")
      .gte("created_at", seriesStart)
      .order("created_at", { ascending: true })
      .limit(20_000),
  ]);

  if (mErr || sErr) {
    return NextResponse.json({ error: mErr?.message ?? sErr?.message }, { status: 500 });
  }

  let monthTotal = BigInt(0);

  for (const row of monthlyRows ?? []) {
    monthTotal += BigInt(Number(row.quantity) || 0);
  }

  const byDay = new Map<string, number>();

  for (const row of seriesRows ?? []) {
    const created = row.created_at?.slice(0, 10);

    if (!created) {
      continue;
    }

    const qty = Number(row.quantity) || 0;
    byDay.set(created, (byDay.get(created) ?? 0) + qty);
  }

  const series = [...byDay.entries()].map(([day, tokens]) => ({ day, tokens })).sort((a, b) => a.day.localeCompare(b.day));

  const limitRaw = process.env.AI_USAGE_MONTHLY_LIMIT_UNITS?.trim();
  const monthlyLimit =
    limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) > 0 ? Number(limitRaw) : null : null;

  return NextResponse.json({
    monthly: {
      billable_units: monthTotal.toString(),
      period_start: monthlyStart,
      limit_units: monthlyLimit,
    },
    series,
  });
}
