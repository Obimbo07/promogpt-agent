import { createClientUnsafe } from "@/lib/supabase/server";

/** Uses verified JWT verification via `auth.getClaims` (recommended for SSR auth decisions). */
export async function getVerifiedUserSub(): Promise<
  string | undefined
> {
  const supabase = await createClientUnsafe();
  if (!supabase) {
    return undefined;
  }

  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;

  return typeof sub === "string" ? sub : undefined;
}

export function authDisabledDevOnly() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.AUTH_DISABLED === "true"
  );
}
