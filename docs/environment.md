# Environment variables

Start from **`.env.example`** in the repo root (copy to `.env.local`). Do not commit secrets.

## Required for authenticated product flows

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://xxxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Recommended: Supabase publishable (`sb_publishable_…`) client key. ([API keys docs](https://supabase.com/docs/guides/api/api-keys)). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon key fallback; used if publishable key is unset. |

## Server-only Supabase

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Recommended: Supabase secret (`sb_secret_…`) for trusted server writes (Stripe webhooks). |
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy service role JWT; used if secret key unset. |

## Optional developer escape hatch

| Variable | Purpose |
| --- | --- |
| `AUTH_DISABLED` | When `true` and `NODE_ENV=development`, workspace UI skips auth redirect (local UI only; **never** in production). |

## Public app origin (recommended for OAuth and links)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public site origin without trailing slash, e.g. `https://app.example.com` or `http://localhost:3000`. **Use this for Meta/Instagram/Facebook OAuth** so `{NEXT_PUBLIC_APP_URL}/auth/callback/meta` matches the redirect URI in Meta Developer Portal. If unset, the server falls back to the incoming request origin. |

## AI gateway (TypeScript, `@promogpt/ai-gateway`)

The HTTP route `POST /api/v1/ai/completions` defaults `model` to **`fast-agent`**, which maps to **Groq** (`llama-3.3-70b-versatile`). Set the keys for whichever logical aliases / vendor models you use.

**Logical aliases** (preferred in product UX): `fast-agent`, `premium-agent`, `reasoning-agent`, `multimodal-lite`, `value-agent` → concrete provider + vendor model (see `packages/ai-gateway/src/model-registry.ts`).

**Vendor-style ids:** Callers may pass opaque model strings (e.g. `gpt-4o-mini`, `claude-3-5-haiku-latest`, `gemini-2.0-flash`); the gateway infers the provider where possible.

**OpenAI-compatible proxy:** Use model id **`compat:<remote-model>`** (e.g. `compat:gpt-4o-mini`). That routes through `openai_compat` using the variables below — suitable for LiteLLM, OpenRouter, or any `/v1/chat/completions`-compatible deployment.

### Provider keys (set as needed)

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Required for **`fast-agent`** / Groq `llama-*` / Mixtral-style ids routed to Groq. |
| `OPENAI_API_KEY` | OpenAI-backed paths (`premium-agent`, inferred `gpt-*` / `o1` / `o3`). |
| `OPENAI_BASE_URL` | Optional OpenAI-compat base (`/v1` suffix); default `https://api.openai.com/v1`. |
| `ANTHROPIC_API_KEY` | Anthropic Messages API (`reasoning-agent`, inferred `claude-*`). |
| `GEMINI_API_KEY` | Google Gemini (`multimodal-lite`, inferred `gemini-*`). |
| `DEEPSEEK_API_KEY` | DeepSeek OpenAI-compat API (`value-agent`, inferred `deepseek*`). |

### OpenAI-compat / LiteLLM / OpenRouter (optional)

| Variable | Purpose |
| --- | --- |
| `OPENAI_COMPAT_BASE_URL` | Base URL for a proxy exposing `/chat/completions` (include `/v1` if applicable). |
| `OPENAI_COMPAT_API_KEY` | Bearer for that proxy. |
| `LITELLM_BASE_URL` | **Legacy alias** for `OPENAI_COMPAT_BASE_URL` (LiteLLM). |
| `LITELLM_API_KEY` | **Legacy alias** for `OPENAI_COMPAT_API_KEY`. |
| `OPENROUTER_API_KEY` | **Fallback** bearer if `OPENAI_COMPAT_API_KEY` is unset (same compat routing). |

Observability (optional hooks used in code stubs):

| Variable | Purpose |
| --- | --- |
| `LANGFUSE_PUBLIC_KEY` | Optional Langfuse ingestion (future wired). |
| `LANGFUSE_SECRET_KEY` | Optional Langfuse secret. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional OTLP endpoint for traces. |

## Stripe

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe API (`sk_live_…` / `sk_test_…`). |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js / Checkout client key when you add Checkout UI (`pk_test_…`). |
| `STRIPE_PRICE_ID_PRO` | Example price ID for Checkout sessions (`price_…`). |

## Social connectors (demo / staging)

| Variable | Purpose |
| --- | --- |
| `META_APP_ID` | Facebook / Instagram (Meta) Login **app id**. |
| `META_APP_SECRET` | Meta app **secret** — server only; used to exchange OAuth codes and mint long-lived user tokens. |
| `META_GRAPH_API_VERSION` | Optional Graph API version segment (default `v21.0`), e.g. `v22.0`. |
| `META_OAUTH_DIALOG_VERSION` | Optional Facebook OAuth dialog URL version segment (default `v21.0`). |
| `TIKTOK_CLIENT_KEY` | TikTok Developer **client key** (Login Kit authorize URL). |
| `TIKTOK_CLIENT_SECRET` | TikTok app **client secret** — server only; token exchange at `open.tiktokapis.com`. |
| `LINKEDIN_CLIENT_ID` | LinkedIn app **Client ID**. |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn app **Client secret** — server only. |
| `CONNECTOR_STUB_ALLOW` | When `true`, allows `{ stubComplete: true }` on `POST /api/v1/workspaces/:workspaceId/connections` so demos can persist synthetic **connected** rows without OAuth. **Development** permits stubs automatically without this flag. |

Register redirect URIs (exact match):

- Meta: `{NEXT_PUBLIC_APP_URL}/auth/callback/meta`
- TikTok: `{NEXT_PUBLIC_APP_URL}/auth/callback/tiktok`
- LinkedIn: `{NEXT_PUBLIC_APP_URL}/auth/callback/linkedin`

Details: [`docs/integrations-social.md`](./integrations-social.md).

## Durable jobs (future Trigger.dev — see [`docs/architecture.md`](./architecture.md))

| Variable | Purpose |
| --- | --- |
| `TRIGGER_API_KEY` | Reserved for Trigger.dev prod secret. |
| `TRIGGER_API_URL` | Reserved base URL override. |

## Docker / self-host

| Variable | Purpose |
| --- | --- |
| `HOSTNAME` | Next.js standalone bind (often `0.0.0.0` in containers). |
| `PORT` | Listen port (Compose uses `3000`). |

---

Apply database objects with the SQL in `supabase/migrations/` against your Supabase project (SQL editor or `supabase db push` when using the CLI).
