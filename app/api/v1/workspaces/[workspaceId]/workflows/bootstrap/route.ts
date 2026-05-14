import { NextResponse } from "next/server";

import { AGENT_WORKFLOW_CATALOG } from "@/lib/agents/catalog";
import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";

/**
 * Installs default marketing agent workflow definitions for a workspace (idempotent per slug).
 */
export async function POST(_request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const inserted: Array<{ id: string; slug: string; name: string }> = [];
  const skipped: string[] = [];

  for (const entry of AGENT_WORKFLOW_CATALOG) {
    const { data: existing } = await session.supabase
      .from("workflow_definitions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("slug", entry.slug)
      .maybeSingle();

    if (existing?.id) {
      skipped.push(entry.slug);
      continue;
    }

    const { data: row, error } = await session.supabase
      .from("workflow_definitions")
      .insert({
        workspace_id: workspaceId,
        name: entry.name,
        slug: entry.slug,
        definition: {
          ...entry.definition,
          description: entry.description,
        },
      })
      .select("id, slug, name")
      .single();

    if (error || !row) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
    }

    inserted.push({ id: row.id, slug: row.slug, name: row.name });
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skippedSlugs: skipped,
  });
}
