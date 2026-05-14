import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OrgCreateCard } from "@/components/onboarding/org-create-card";
import { createClientUnsafe } from "@/lib/supabase/server";

async function loadOrgContext(
  supabase: NonNullable<Awaited<ReturnType<typeof createClientUnsafe>>>,
  userId: string
) {
  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId);

  const orgIds = memberships?.map((m) => m.organization_id).filter(Boolean) ?? [];

  if (orgIds.length === 0) {
    return { organizations: [], workspaces: [] as Array<{ id: string; name: string; slug: string; organizationId: string }> };
  }

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id,name,slug")
    .in("id", orgIds);

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id,name,slug,organization_id")
    .in("organization_id", orgIds);

  return {
    organizations: organizations ?? [],
    workspaces:
      workspaces?.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        organizationId: w.organization_id,
      })) ?? [],
  };
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const supabase = await createClientUnsafe();

  if (!supabase) {
    redirect("/auth/login?error=config");
  }

  const { data: claims, error: claimsErr } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (claimsErr || !userId || typeof userId !== "string") {
    redirect("/auth/login");
  }

  const ctx = await loadOrgContext(supabase, userId);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, job_title, onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  const initialProfile = profileRow
    ? {
        displayName: profileRow.display_name,
        jobTitle: profileRow.job_title,
        onboardingCompletedAt: profileRow.onboarding_completed_at,
      }
    : null;

  const params = (await searchParams) ?? {};

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {ctx.organizations.length === 0 ? (
        <OrgCreateCard error={params.error} />
      ) : (
        <OnboardingWizard
          organizations={ctx.organizations}
          workspaces={ctx.workspaces}
          initialProfile={initialProfile}
        />
      )}
    </div>
  );
}
