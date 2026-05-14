import { NextResponse } from "next/server";

import { createClientUnsafe } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClientUnsafe();
  const url = new URL("/", request.url);

  if (!supabase) {
    return NextResponse.redirect(url);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/login", request.url));
}
