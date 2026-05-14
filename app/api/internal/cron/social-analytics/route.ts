import { NextResponse } from "next/server";
import { z } from "zod";

import { pullAllConnectedAnalytics } from "@/lib/integrations/social/analytics-pull";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  workspaceIds: z.array(z.string().uuid()).optional(),
});

/**
 * Automated social analytics pulls (cron, Supabase Edge Function, etc.).
 * Secure with ANALYTICS_CRON_SECRET via `Authorization: Bearer <secret>`.
 * Uses the service-role Supabase client so it ignores RLS the same way as trusted server routes.
 */
export async function POST(request: Request) {
  const secret = process.env.ANALYTICS_CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!secret || bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 }
    );
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let workspaceIds = parsed.data.workspaceIds;

  if (!workspaceIds || workspaceIds.length === 0) {
    const { data, error } = await admin
      .from("connector_accounts")
      .select("workspace_id")
      .eq("status", "connected")
      .in("provider", ["facebook", "instagram", "tiktok"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    workspaceIds = [...new Set((data ?? []).map((r) => r.workspace_id).filter(Boolean))];
  }

  const summaries: Array<{
    workspaceId: string;
    pulled: number;
    failures: number;
    jobId: string | null;
  }> = [];

  for (const workspaceId of workspaceIds) {
    const { jobId, results } = await pullAllConnectedAnalytics({
      supabase: admin,
      workspaceId,
    });
    summaries.push({
      workspaceId,
      pulled: results.filter((r) => r.ok).length,
      failures: results.filter((r) => !r.ok).length,
      jobId,
    });
  }

  return NextResponse.json({
    ok: true,
    workspacesProcessed: workspaceIds.length,
    summaries,
  });
}
