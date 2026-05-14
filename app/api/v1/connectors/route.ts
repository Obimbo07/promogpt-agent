import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/api/guards";
import { CONNECTOR_REGISTRY } from "@/lib/connectors/registry";

/** Read-only connector catalog scaffold (OAuth implementations land per provider — see roadmap). */

export async function GET() {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const connectors = CONNECTOR_REGISTRY.map((c) => ({
    id: c.id,
    displayName: c.displayName,
    capabilities: c.capabilities,
  }));

  return NextResponse.json({ connectors }, { headers: noStoreHeaders() });
}

function noStoreHeaders() {
  return { "cache-control": "no-store" } as HeadersInit;
}
