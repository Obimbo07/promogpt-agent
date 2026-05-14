# Social integrations layer

PromoGPT-Agent stores **workspace-scoped social connections** in Postgres (`connector_accounts`) and routes provider-specific behaviour through **`lib/integrations/social/`**.

This doc reflects the **current repository wiring** (not a future-only sketch).

## Data model

| Surface | Purpose |
| --- | --- |
| `profiles` | Per-user display fields + optional `onboarding_completed_at`. |
| `connector_accounts` | One row per `(workspace_id, provider)` with lifecycle fields (`status`, `metadata`, timestamps). **`credentials_ref` is server-only** — never returned by REST. |

Apply migrations under `supabase/migrations/` (including `20260215120000_profiles_and_social_connections.sql`).

## TypeScript integration adapters

Files live under `lib/integrations/social/`:

- `types.ts` — adapter contracts + provider ids (`x`, `telegram`, `instagram`, `facebook`, `tiktok`, `linkedin`).
- `adapters/*.ts` — OAuth URLs / manual Telegram; env keys: `META_APP_*`, `TIKTOK_*`, `LINKEDIN_*` (X still placeholder).
- `registry.ts` — `getSocialAdapter`, `listCoreSocialAdapters`.
- `service.ts` — stub for scheduled pulls (`pullConnectorSnapshot`) — implement once tokens live in your vault/KMS pattern.

The catalog exposed to UI/SDK merges these adapters with optional stub connectors in `lib/connectors/registry.ts`.

## REST API

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/v1/me/profile` | Current user profile row (nullable until first save). |
| `PATCH` | `/api/v1/me/profile` | Upserts `{ displayName?, jobTitle?, onboardingCompleted? }`. |
| `GET` | `/api/v1/workspaces/:workspaceId/connections` | Catalog slice + sanitized connections for the workspace. |
| `POST` | `/api/v1/workspaces/:workspaceId/connections` | Starts OAuth/manual flow (`pending` row). Body `{ provider }`. Optional `{ stubComplete: true }` when server allows demo inserts (see env docs). |
| `GET` | `/auth/callback/meta` | Meta OAuth — exchanges `code`, closes popup (`postMessage`: `promogpt-oauth`). |
| `GET` | `/auth/callback/tiktok` | TikTok Login Kit — exchanges `code`, stores tokens in `credentials_ref`. |
| `GET` | `/auth/callback/linkedin` | LinkedIn OAuth 2.0 — exchanges `code`, stores tokens in `credentials_ref`. |
| `DELETE` | `/api/v1/workspaces/:workspaceId/connections/:provider` | Removes the connection row (editors/admins). |

RBAC mirrors other workspace APIs: viewers read; editors/admins mutate.

## Onboarding UX

`/onboarding` walks users through organization creation (when needed), profile completion, workspace selection/creation, and six core social connectors (X, Telegram, Instagram, Facebook, TikTok, LinkedIn) with live persistence.

## Next engineering steps

1. Wire X (Twitter) OAuth2 with PKCE and a dedicated callback route (currently placeholders).
2. Harden `credentials_ref`: encrypt/KMS-backed storage vs JSON today.
3. Implement `pullConnectorSnapshot` + Trigger.dev schedules for analytics ingestion.
