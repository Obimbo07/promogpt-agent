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

- [ ] LiteLLM (or interim router) abstraction with provider adapters.
- [ ] Credential storage pattern for BYO keys (encryption at rest design).
- [ ] Observability hooks: request IDs correlated with traces and Langfuse-compatible events where applicable.

### Social connectors

- [ ] Connector interface in code (capabilities: post, schedule, fetch analytics).
- [ ] OAuth/token refresh strategy per provider.
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
