import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { editorCapable, requireWorkspaceMembership } from "@/lib/api/workspace-access";

const postSchema = z.object({
  title: z.string().min(1).max(500),
  starts_at: z.string().min(8),
  ends_at: z.string().optional(),
  body: z.string().max(12000).optional(),
  channel: z.enum(["tiktok", "instagram", "facebook", "mixed", "internal"]).optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
  time_zone: z.string().max(80).optional(),
});

/** List / create editorial calendar events (manual scheduling + agent proposals). */
export async function GET(request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { workspaceId } = await ctx.params;

  const gate = await requireWorkspaceMembership(session.supabase, session.userId, workspaceId);

  if (!gate.ok) {
    return gate.response;
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Query params `from` and `to` (ISO timestamps) are required" }, { status: 400 });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Invalid from/to datetime" }, { status: 400 });
  }

  const statusFilter = url.searchParams.get("status");

  let qb = session.supabase
    .from("workspace_calendar_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("starts_at", fromDate.toISOString())
    .lte("starts_at", toDate.toISOString())
    .order("starts_at", { ascending: true });

  if (statusFilter && statusFilter !== "all") {
    qb = qb.eq("status", statusFilter);
  }

  const { data, error } = await qb;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request, ctx: { params: Promise<{ workspaceId: string }> }) {
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

  const raw = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.starts_at);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
  }

  let endsAt: string | null = null;
  if (parsed.data.ends_at) {
    const e = new Date(parsed.data.ends_at);
    endsAt = Number.isNaN(e.getTime()) ? null : e.toISOString();
  }

  const status = parsed.data.status ?? "scheduled";

  const { data: row, error } = await session.supabase
    .from("workspace_calendar_events")
    .insert({
      workspace_id: workspaceId,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt,
      time_zone: parsed.data.time_zone?.trim() || "UTC",
      channel: parsed.data.channel ?? null,
      status,
      source: "manual",
      created_by: session.userId,
      metadata: { v: 1 },
    })
    .select("*")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 400 });
  }

  return NextResponse.json({ event: row });
}
