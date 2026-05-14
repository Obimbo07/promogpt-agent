import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(2).optional(),
});

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const orgId = new URL(request.url).searchParams.get("organization_id");

  let builder = session.supabase.from("workspaces").select("*");
  if (orgId) {
    builder = builder.eq("organization_id", orgId);
  }

  const { data, error } = await builder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspaces: data ?? [] });
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

  const slug = parsed.data.slug ?? slugify(parsed.data.name);

  const { data, error } = await session.supabase.rpc("create_workspace_for_org", {
    p_org_id: parsed.data.organizationId,
    p_name: parsed.data.name,
    p_slug: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const workspaceId = typeof data === "string" ? data : `${data}`;

  return NextResponse.json({ workspaceId });
}
