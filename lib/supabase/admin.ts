import { createClient } from "@supabase/supabase-js";

/**
 * Bypasses Row Level Security. Only call from verified server routes after authz checks or webhooks.
 * Prefers SUPABASE_SECRET_KEY (new naming) then legacy SERVICE_ROLE JWT.
 */

export function createAdminClient() {
  const parsedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!parsedUrl || !serviceKey) {
    return null;
  }

  return createClient(parsedUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
