import type { SupabaseClient } from "@supabase/supabase-js";

/** Start of UTC month for consistent metering regardless of viewer TZ. */
export function utcMonthStartIso(): string {
  const now = new Date();
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
  return new Date(d).toISOString();
}

/**
 * Approximate rollup of `billable units` logged for ai.chat rows this UTC month.
 * V1 pagination cap — sufficient until high-volume metering moves to aggregate SQL/RPC.
 */
export async function sumOrgMonthlyAiChatUnits(args: {
  supabase: SupabaseClient;
  organizationId: string;
}): Promise<{ total: bigint; capped: boolean }> {
  const { supabase, organizationId } = args;
  const cap = 20_000;
  let offset = 0;
  let total = BigInt(0);

  while (offset < cap) {
    const pageSize = Math.min(2000, cap - offset);
    const { data, error } = await supabase
      .from("usage_events")
      .select("quantity")
      .eq("organization_id", organizationId)
      .eq("event_type", "ai.chat")
      .gte("created_at", utcMonthStartIso())
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      total += BigInt(Number(row.quantity) || 0);
    }

    offset += rows.length;

    if (rows.length < pageSize) {
      break;
    }
  }

  return { total, capped: offset >= cap };
}
