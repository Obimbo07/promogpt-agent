import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { authDisabledDevOnly } from "@/lib/auth/session";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workflows",
  "/agents",
  "/analytics",
  "/settings",
  "/onboarding",
];

/**
 * Next.js 16 **proxy** (replaces deprecated middleware) — refresh auth cookies and guard workspace routes.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function proxy(request: NextRequest) {
  const cfg = getSupabasePublicConfig();

  let response = NextResponse.next({ request });

  if (!cfg.ok) {
    return response;
  }

  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  if (error && process.env.NODE_ENV === "development") {
    console.warn("[promogpt-agent] proxy getClaims:", error.message);
  }

  const isAuthed = Boolean(data?.claims?.sub && typeof data.claims.sub === "string");
  const pathname = request.nextUrl.pathname;

  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const isAuthRoute = pathname.startsWith("/auth");

  if (
    cfg.ok &&
    !authDisabledDevOnly() &&
    isProtected &&
    !isAuthRoute &&
    !isAuthed
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (cfg.ok && isAuthed && pathname === "/auth/login") {
    const nextParam = request.nextUrl.searchParams.get("next") || "/dashboard";
    if (nextParam.startsWith("/")) {
      return NextResponse.redirect(new URL(nextParam, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
