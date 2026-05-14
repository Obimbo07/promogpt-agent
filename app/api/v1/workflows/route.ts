import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(2).optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const workspaceId = new URL(request.url).searchParams.get("workspace_id");

  if (!workspaceId) {
    return NextResponse.json({ error: "workspace_id query required" }, { status: 400 });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const { data, error } = await session.supabase
    .from("workflow_definitions")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workflows: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, parsed.data.workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const slug = parsed.data.slug ?? slugify(parsed.data.name);

  const { data, error } = await session.supabase
    .from("workflow_definitions")
    .insert({
      workspace_id: parsed.data.workspaceId,
      name: parsed.data.name,
      slug,
      definition: parsed.data.definition ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "failed" }, { status: 400 });
  }

  return NextResponse.json({ workflow: data });
}
