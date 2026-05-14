/**
 * Resolved Supabase client URL + anon/publishable key for browser/server cookie flows.
 */

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicConfig():
  | { ok: true; url: string; anonKey: string }
  | { ok: false; reason: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    return { ok: false, reason: "NEXT_PUBLIC_SUPABASE_URL is unset" };
  }

  if (!anonKey) {
    return {
      ok: false,
      reason:
        "Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    };
  }

  return { ok: true, url, anonKey };
}
