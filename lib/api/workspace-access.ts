import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type OrgRole = "viewer" | "editor" | "admin";

export async function requireOrganizationMembership(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<
  | { ok: true; role: OrgRole }
  | { ok: false; response: NextResponse }
> {
  const { data: membership, error: memErr } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr || !membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, role: membership.role as OrgRole };
}

export async function requireWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<
  | {
      ok: true;
      role: OrgRole;
      workspace: { id: string; organization_id: string };
    }
  | { ok: false; response: NextResponse }
> {
  const { data: workspaceRow, error: wsErr } = await supabase
    .from("workspaces")
    .select("id, organization_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (wsErr || !workspaceRow) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Workspace not found" }, { status: 404 }),
    };
  }

  const { data: membership, error: memErr } = await supabase
    .from("organization_memberships")
    .select("role")
    .eq("organization_id", workspaceRow.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr || !membership) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const role = membership.role as OrgRole;

  return {
    ok: true,
    role,
    workspace: workspaceRow,
  };
}

export function editorCapable(role: OrgRole) {
  return role === "admin" || role === "editor";
}
