import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  body: z.string().max(12000).nullable().optional(),
  channel: z.enum(["tiktok", "instagram", "facebook", "mixed", "internal"]).nullable().optional(),
  status: z.enum(["draft", "proposed", "scheduled", "completed", "cancelled"]).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ workspaceId: string; eventId: string }> }
) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId, eventId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) {
    patch.title = parsed.data.title;
  }
  if (parsed.data.body !== undefined) {
    patch.body = parsed.data.body;
  }
  if (parsed.data.channel !== undefined) {
    patch.channel = parsed.data.channel;
  }
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
  }
  if (parsed.data.starts_at !== undefined) {
    const d = new Date(parsed.data.starts_at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
    }
    patch.starts_at = d.toISOString();
  }
  if (parsed.data.ends_at !== undefined) {
    if (parsed.data.ends_at === null) {
      patch.ends_at = null;
    } else {
      const e = new Date(parsed.data.ends_at);
      if (Number.isNaN(e.getTime())) {
        return NextResponse.json({ error: "Invalid ends_at" }, { status: 400 });
      }
      patch.ends_at = e.toISOString();
    }
  }

  const { data: row, error } = await session.supabase
    .from("workspace_calendar_events")
    .update(patch)
    .eq("id", eventId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({ event: row });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ workspaceId: string; eventId: string }> }
) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId, eventId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  if (!editorCapable(gate.role)) {
    return NextResponse.json({ error: "Editors or admins required" }, { status: 403 });
  }

  const { error } = await session.supabase
    .from("workspace_calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("workspace_id", workspaceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
