/**
 * Bearer shared by Supabase cron / pg_net → `/api/internal/cron/*` routes.
 */
export function internalCronSecrets(): string[] {
  const a = process.env.INTERNAL_CRON_SECRET?.trim();
  const b = process.env.ANALYTICS_CRON_SECRET?.trim();
  const out = [a, b].filter(Boolean) as string[];
  return [...new Set(out)];
}

export function authorizeInternalCronRequest(request: Request): boolean {
  const secrets = internalCronSecrets();
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  return secrets.some((s) => s.length > 0 && bearer === s);
}
