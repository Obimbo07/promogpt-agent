# V1 foundations checklist

Engineering-oriented checklist derived from the V1 product slice in [roadmap](../roadmap.md). Use as backlog columns or epics rather than mandatory single-issue completion.

### Repository and platform

- [ ] Monorepo migration plan tracked; first shared `packages/config` extraction when duplication justifies cost.
- [ ] CI enforcing `npm run lint` and `npm run build` on default branch and PRs.
- [ ] Environment contract documented (`README` / `docs/environment.md` when schemas exist).

### Identity and tenancy

- [ ] Auth provider integrated (Supabase Auth target baseline).
- [ ] Organizations / workspaces model in schema and APIs.
- [ ] RBAC primitives for viewer / editor / admin (expand as product requires).

### Billing and metering

- [ ] Stripe products and pricing tables aligned with [pricing tier framing](../pricing-and-revenue.md).
- [ ] Webhooks for subscription lifecycle (created, renewed, canceled, failed payment).
- [ ] Usage counters for workflows and AI calls (dual path: BYO vs managed).
- [ ] Admin or user-visible usage dashboard stubs.

### AI layer

- [ ] **`@promogpt/ai-gateway`** wired into Route Handlers with logical aliases + usage metering hooks ([roadmap sequencing](../roadmap.md): **Groq → Gemini first**).
- [ ] **Groq (P0):** `fast-agent` path, `GROQ_API_KEY`, error handling, timeouts, and basic usage accounting for `POST /api/v1/ai/completions`.
- [ ] **Gemini (P0):** `multimodal-lite` path, `GEMINI_API_KEY`, same quality bar as Groq (errors, quotas, logging).
- [ ] **Defer until P0 green:** hardening `premium-agent` / OpenAI, `reasoning-agent` / Anthropic, `value-agent` / DeepSeek, and `compat:*` proxies beyond smoke config.
- [ ] Credential storage pattern for BYO keys (encryption at rest design).
- [ ] Observability hooks: request IDs correlated with traces and Langfuse-compatible events where applicable.

### Social connectors

- [ ] Connector interface + integration adapters (`lib/integrations/social`) with Postgres-backed connection rows.
- [ ] OAuth/token refresh strategy per provider (callbacks + KMS-backed refs).
- [ ] Analytics snapshots + pull jobs for supported providers; optional **Supabase Edge/pg_cron** schedule (`supabase/functions/social-analytics-cron`, `POST /api/internal/cron/social-analytics`).
- [ ] Rate-limit handling and backoff per provider nuances.

### Workflows

- [ ] Workflow definition storage and versioning.
- [ ] Durable executor integration (Trigger.dev or interim queue) with retries and dead-letter semantics.
- [ ] Approval gates and audit trail for human-in-the-loop flows.

### API and integrations

- [ ] REST surface for workspaces, workflows, connectors, executions.
- [ ] Webhook ingestion for external events where needed.
- [ ] Public SDK scaffolding (package path TBD — see [architecture](../architecture.md)).

### Dashboard

- [ ] Shell navigation for accounts, workflows, analytics, billing, AI usage (can start read-only stubs).
- [ ] Role-aware views tied to RBAC.

### Deployment

- [ ] Production Dockerfile and Compose stack for minimal self-hosted happy path.
- [ ] Hosted reference deployment runbook kept next to infra code when added.
