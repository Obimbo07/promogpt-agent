import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSessionUser } from "@/lib/api/guards";

const patchSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  jobTitle: z.string().max(120).optional().nullable(),
  onboardingCompleted: z.boolean().optional(),
});

export async function GET() {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const { data, error } = await session.supabase
    .from("profiles")
    .select("display_name, job_title, onboarding_completed_at, updated_at")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data
      ? {
          displayName: data.display_name,
          jobTitle: data.job_title,
          onboardingCompletedAt: data.onboarding_completed_at,
          updatedAt: data.updated_at,
        }
      : null,
  });
}

export async function PATCH(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return session.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const onboarding_completed_at =
    parsed.data.onboardingCompleted === true ? now : undefined;

  const payload = {
    user_id: session.userId,
    display_name: parsed.data.displayName,
    job_title: parsed.data.jobTitle === undefined ? undefined : parsed.data.jobTitle,
    onboarding_completed_at,
    updated_at: now,
  };

  const cleaned = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await session.supabase
    .from("profiles")
    .upsert(cleaned, { onConflict: "user_id" })
    .select("display_name, job_title, onboarding_completed_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data
      ? {
          displayName: data.display_name,
          jobTitle: data.job_title,
          onboardingCompletedAt: data.onboarding_completed_at,
          updatedAt: data.updated_at,
        }
      : null,
  });
}
