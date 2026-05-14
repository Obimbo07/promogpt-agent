import { NextResponse } from "next/server";

import { createClientUnsafe } from "@/lib/supabase/server";

export async function requireSessionUser(): Promise<
  | { ok: true; userId: string; supabase: NonNullable<Awaited<ReturnType<typeof createClientUnsafe>>> }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClientUnsafe();

  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase client unavailable (missing public env)." },
        { status: 503 }
      ),
    };
  }

  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;

  if (error || !sub || typeof sub !== "string") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: sub, supabase };
}
