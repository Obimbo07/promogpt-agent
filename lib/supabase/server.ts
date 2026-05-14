import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

/** Per-request Supabase client (App Router Server Components / Route Handlers / Server Actions). */
export async function createClient() {
  const parsed = getSupabasePublicConfig();
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }

  const cookieStore = await cookies();

  return createServerClient(parsed.url, parsed.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot always set cookies; proxy handles refresh writes.
        }
      },
    },
  });
}

/** Returns null when Supabase env is incomplete (marketing-only / misconfigured installs). */
export async function createClientUnsafe() {
  const parsed = getSupabasePublicConfig();
  if (!parsed.ok) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(parsed.url, parsed.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          //
        }
      },
    },
  });
}
