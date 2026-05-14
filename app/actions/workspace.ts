"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { slugify } from "@/lib/slug";
import { createClientUnsafe } from "@/lib/supabase/server";

export async function createOrganizationFromOnboarding(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const customSlugRaw = String(formData.get("slug") ?? "").trim();

  const supabase = await createClientUnsafe();

  if (!supabase) {
    redirect("/auth/login?error=config");
  }

  if (!name) {
    redirect("/onboarding?error=Organization%20name%20is%20required");
  }

  const slug = customSlugRaw ? slugify(customSlugRaw) : slugify(name);

  const { error } = await supabase.rpc("create_organization_with_admin", {
    org_name: name,
    org_slug: slug,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/onboarding");
  redirect("/onboarding");
}
