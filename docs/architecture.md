# Architecture

This document captures the **intended architecture** for PromoGPT-Agent. Not all layers exist in this repository yet; see [roadmap](./roadmap.md) and [monorepo-migration](./monorepo-migration.md).

## Layered view

### Presentation

- Next.js with TypeScript and Tailwind CSS.
- Turborepo monorepo for multiple apps (`web`, `dashboard`, docs site, marketing site) once migrated.

### API and backend

- Next.js Route Handlers / API routes where appropriate for V1 cohesion.
- **Supabase** for auth, Postgres, realtime where applicable.
- **PostgreSQL** with **pgvector** for embeddings and retrieval (aligned with V2 memory).

### Workflow and runtime

- **Trigger.dev** (target) for durable jobs, retries, queues, scheduled and event-triggered workflows.
- Event-driven orchestration coordinating approvals, integrations, and AI steps.

### AI infrastructure

- **LiteLLM** for multi-provider routing (OpenAI, Anthropic, Gemini, custom endpoints).
- **LangGraph** for structured agent workflows.
- **OpenTelemetry** and **Langfuse** for traces, evaluation, and cost visibility.

### Deployment

- Docker images and Compose for self-host quick starts.
- Kubernetes and Helm for scale and enterprise rollout.
- CI/CD pipelines for build, test, and release discipline.

## Target monorepo layout

```txt
/apps
  /web              # Primary product UI (currently: repo-root Next.js app)
  /dashboard        # Operational / analytics dashboards (future split)
  /docs             # Documentation site (optional app)
  /marketing-site   # Public marketing site (optional app)

/packages
  /agent-runtime    # Execution environment for agents
  /workflow-engine  # Definitions, DAGs, approvals, triggers
  /connectors       # Social platforms, CRM, webhooks
  /ai-providers     # LiteLLM/config, provider adapters
  /memory           # Vector + durable context (pgvector-backed)
  /analytics        # Engagement, usage, dashboards data layer
  /permissions      # RBAC, org/workspace scoping
  /sdk              # TypeScript (and potentially other) client SDKs
  /ui               # Shared design system components
  /config           # ESLint, TSConfig, Tailwind presets
```

Naming and boundaries will evolve as the first packages ship; this tree is the **north star**, not a hard requirement before V1 scaffolding.

### Public SDK versus internal automation tooling

`/packages/sdk` denotes the **PromoGPT-Agent product API SDK** consumed by partner apps and integrations. Internal scripts, bots, or CI that drive coding agents programmatically stay separate; use the toolchain appropriate to that automation (Cursor’s automation surfaces are unrelated to PromoGPT-Agent’s REST/SDK contract unless we explicitly integrate them).

## Security and tenancy (north star)

- Organizations/workspaces isolate data.
- RBAC overlays API and dashboard actions.
- Enterprise track adds SAML/SSO, SCIM, audit logs, governance (see [roadmap](./roadmap.md)).

## Observability

- Standardize on OpenTelemetry for traces and correlate with Langfuse for LLM-centric debugging and billing attribution where needed.
