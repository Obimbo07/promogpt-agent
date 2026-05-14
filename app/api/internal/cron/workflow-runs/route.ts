import { NextResponse } from "next/server";

import { authorizeInternalCronRequest } from "@/lib/api/internal-cron";
import { processPendingWorkflowRuns } from "@/lib/jobs/workflow-processor";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Drains queued workflow runs (`pending`). Secure with INTERNAL_CRON_SECRET / ANALYTICS_CRON_SECRET.
 */
export async function POST(request: Request) {
  if (!authorizeInternalCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY missing" },
      { status: 500 }
    );
  }

  const summary = await processPendingWorkflowRuns(admin, { batchSize: 25 });

  return NextResponse.json({ ok: true, ...summary });
}
