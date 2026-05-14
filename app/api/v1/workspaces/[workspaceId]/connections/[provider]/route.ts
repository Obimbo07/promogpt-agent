import { NextResponse } from "next/server";

import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { requireSessionUser } from "@/lib/api/guards";

const allowed = new Set(["x", "telegram", "instagram", "facebook", "tiktok", "linkedin"]);

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ workspaceId: string; provider: string }> }
) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId, provider } = await ctx.params;

  if (!allowed.has(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const { error } = await session.supabase
    .from("connector_accounts")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
