/**
 * Scheduled social analytics pull — thin forwarder.
 *
 * **Why:** Your ingestion lives in Next (`pullAllConnectedAnalytics`): TikTok/Meta calls,
 * transforms, snapshot upserts, and job rows stay in one place (Node + reuse).
 *
 * **Flow:** Cron (Supabase scheduled functions / Dashboard) invokes this Edge Function →
 * it POSTs to your deployed app `/api/internal/cron/social-analytics` with a shared bearer secret.
 *
 * **Secrets** (Dashboard → Project → Edge Functions → Secrets):
 * - `CRON_GATE_SECRET` — random string checked against `x-cron-gate` header. Store the same value
 *   in Vault for `pg_cron`/`pg_net` jobs so arbitrary callers cannot drive pulls (your anon JWT is public).
 * - `ANALYTICS_CRON_SECRET` — same value as Next `ANALYTICS_CRON_SECRET` in `.env` / hosting env.
 * - `APP_CRON_TARGET_URL` — public origin, e.g. `https://app.example.com` (no trailing slash).
 *
 * **Optional body** forwarded as JSON:
 * `{ "workspaceIds": ["uuid", ...] }` — omit to pull every workspace with a connected FB/IG/TikTok connector.
 *
 * Deploy: `supabase functions deploy social-analytics-cron`
 * Serve locally: `supabase functions serve social-analytics-cron`
 *
 * **Troubleshooting 401:** `sb_error_code: UNAUTHORIZED_NO_AUTH_HEADER` means Supabase blocked the request
 * *before this code ran* (missing JWT). Either add `Authorization: Bearer …` below, or redeploy after
 * `verify_jwt = false` with: `supabase functions deploy social-analytics-cron --no-verify-jwt`
 * (otherwise Dashboard may keep JWT enforcement on older deployments).
 *
 * **Example schedule** (hosted): enable `pg_cron` + `pg_net`; Vault secrets:
 * - Full invoke URL e.g. `https://<project-ref>.supabase.co/functions/v1/social-analytics-cron`
 * - `cron_gate_secret` (same as Edge secret `CRON_GATE_SECRET`)
 * - `publishable_key` — **Supabase publishable or legacy anon JWT** ([schedule guide](https://supabase.com/docs/guides/functions/schedule-functions))
 *
 * ```
 * select cron.schedule(
 *   'social-analytics-hourly',
 *   '15 * * * *',
 *   $$
 *   select net.http_post(
 *     url := (select decrypted_secret from vault.decrypted_secrets where name = 'social_analytics_cron_url'),
 *     headers := jsonb_build_object(
 *       'Content-Type', 'application/json',
 *       'Authorization',
 *         'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
 *       'x-cron-gate',
 *         (select decrypted_secret from vault.decrypted_secrets where name = 'cron_gate_secret')
 *     ),
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 * ```
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const gate = Deno.env.get("CRON_GATE_SECRET")?.trim();
  const headerGate = (req.headers.get("x-cron-gate") ?? "").trim();

  // Anon JWT is public in the browser; do not rely on verify_jwt alone for cron routes.
  if (!gate || headerGate !== gate) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const cronSecret = Deno.env.get("ANALYTICS_CRON_SECRET");
  const appBase = Deno.env.get("APP_CRON_TARGET_URL");

  if (!cronSecret?.trim() || !appBase?.trim()) {
    console.error("Missing ANALYTICS_CRON_SECRET or APP_CRON_TARGET_URL");
    return jsonResponse({ error: "Function misconfigured" }, 500);
  }

  let bodyPayload: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      const raw = await req.text();
      if (raw.length > 0) {
        bodyPayload = JSON.parse(raw) as Record<string, unknown>;
      }
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
  }

  const normalizedBase = appBase.replace(/\/$/, "");
  const res = await fetch(`${normalizedBase}/api/internal/cron/social-analytics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = { error: "Upstream returned non-JSON", status: res.status };
  }

  return jsonResponse(payload, res.status);
});
