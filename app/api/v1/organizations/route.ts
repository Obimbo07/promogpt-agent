import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).optional(),
});

export async function GET() {
  const session = await requireSessionUser();

  if (!session.ok) {
    return session.response;
  }

  const { supabase } = session;

  const { data: memberships, error: memErr } = await supabase
    .from("organization_memberships")
    .select("role, organization_id");

  if (memErr || !memberships?.length) {
    return NextResponse.json({ organizations: [] });
  }

  const ids = memberships.map((m) => m.organization_id);

  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .select("*")
    .in("id", ids);

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 });
  }

  const roleOf = Object.fromEntries(
    memberships.map((m) => [m.organization_id, m.role])
  );

  const organizations =
    orgs?.map((o) => ({
      ...o,
      membership_role: roleOf[o.id as keyof typeof roleOf],
    })) ?? [];

  return NextResponse.json({ organizations });
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

  const { data, error } = await session.supabase.rpc("create_organization_with_admin", {
    org_name: parsed.data.name,
    org_slug: slug,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ organizationId: data });
}
