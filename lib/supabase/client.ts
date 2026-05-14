"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export function createClient() {
  const parsed = getSupabasePublicConfig();
  if (!parsed.ok) {
    throw new Error(parsed.reason);
  }

  return createBrowserClient(parsed.url, parsed.anonKey);
}
