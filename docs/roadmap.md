# Roadmap

Phased objectives for PromoGPT-Agent. Use [checklists/v1-foundations](./checklists/v1-foundations.md) to operationalize near-term engineering work.

**Current V1 focus:** finish the **AI gateway** on **Groq** and **Gemini** first (`fast-agent`, `multimodal-lite`, env + metering), then widen to other vendors. In parallel, **social analytics** (connected channels, snapshots, optional Supabase Edge/pg_cron pulls) stays on the near-term path ([integrations-social](./integrations-social.md)).

---

## Vision snapshot

Become the **open infrastructure layer for AI-native marketing and business automation**: autonomous workflow runtime, scalable orchestration, reusable agents, embeddable automation, and enterprise-grade deployment flexibility.

---

## Problems in scope

1. **AI provider lock-in** — support BYO keys, multiple providers, and host flexibility.
2. **Closed SaaS ecosystems** — open-core, plugins, APIs, SDKs, self-hosting.
3. **Fragmented marketing ops** — one orchestration layer for scheduling, analytics, creation, approvals.
4. **Weak autonomous execution** — durable workflows, agents, approvals, memory, events, pipelines.

Narrative detail: [system-overview](./system-overview.md).

---

## V1 — Completion path (engineering order)

Rough order to **close V1**, not a waterfall: some items can overlap, but **do not** broaden to every AI vendor until Groq + Gemini are production-grade in the app (keys, errors, quotas, observability).

### 1. AI gateway — Groq then Gemini (blocker for “V1 AI done”)

| Priority | Scope | Notes |
| --- | --- | --- |
| **P0** | **Groq** — `GROQ_API_KEY`, **`fast-agent`** → `llama-3.3-70b-versatile` (`@promogpt/ai-gateway`) | Default completions path; stabilize `POST /api/v1/ai/completions`, usage hooks, user-facing errors |
| **P0** | **Gemini** — `GEMINI_API_KEY`, **`multimodal-lite`** → `gemini-2.0-flash` | Second primary provider; validates multi-vendor routing before more SKUs |
| **Later (post V1 AI core)** | OpenAI, Anthropic, DeepSeek, `compat:*` / OpenAI-compatible proxies | Already modelled in gateway; bring up **after** Groq + Gemini are verified in staging and quota story is clear |

Deferred providers stay in the registry for future toggles; **V1 product QA** concentrates on Groq + Gemini.

### 2. Identity, orgs, and dashboard shell

Keep onboarding, workspaces, RBAC, and navigation aligned with checklist items in [checklists/v1-foundations](./checklists/v1-foundations.md).

### 3. Social connectors (breadth scoped to V1)

OAuth + persistence patterns for prioritized networks; analytics pull for connected accounts (snapshots jobs, optional scheduled Edge/pg_cron). Full breadth (YouTube, X, Telegram, LinkedIn parity) tracks behind **stable Meta + TikTok + dashboard**.

### 4. Billing and metering foundations

Stripe path + AI/workflow counters; can trail **Groq/Gemini** once inference path is stable.

### 5. Workflows executor

Definitions + durable runs (Trigger.dev or interim queue) after AI and connectors have happy-path smoke coverage.

---

## V1 — Core marketing automation platform

**Goal:** Foundational AI-powered marketing automation.

### Scope

**Identity and orgs**

- User onboarding.
- Organizations / workspaces.
- Role-based permissions baseline.

**Subscription and billing**

- Monthly and annual subscriptions.
- Usage metering and token tracking foundations.
- Stripe integration.
- AI usage quotas and guardrails.

**AI providers**

- **V1 must-have:** **Groq** + **Gemini** via **`@promogpt/ai-gateway`** (logical aliases `fast-agent`, `multimodal-lite`; vendor ids `groq`, `gemini`). Environment contract: [`environment`](./environment.md).
- **V1 stretch / post-core:** OpenAI / Anthropic / DeepSeek and optional **`compat:*`** OpenAI-compatible proxies once Groq + Gemini are validated in product flows.

**Social integrations**

- LinkedIn, X/Twitter, Telegram, Facebook, Instagram, TikTok, YouTube (product breadth).
- **Shipped scaffolding:** X, Telegram, Instagram, Facebook adapters under `lib/integrations/social` with REST persistence (`connector_accounts`). OAuth callbacks + token vault remain to wire per provider policy.

**Workflow engine**

- Scheduled workflows.
- Approval workflows.
- Automation pipelines with retries and durable execution (Trigger.dev-aligned).

**Content generation**

- Posts, captions, hashtags, campaign ideas, content calendars.

**Dashboard**

- Analytics, connected accounts, workflows, billing, AI usage, subscriptions.

**Platform surfaces**

- REST APIs, SDK, webhooks for integrations.

**Deployment**

- Hosted cloud path plus Docker-based self-hosting.

---

## V2 — Autonomous intelligence and media automation

**Goal:** Multi-agent system with richer memory and media.

- Multi-agent orchestration (strategist, analytics, research, copywriter, media).
- Persistent memory with vector embeddings (brand, audience, history).
- Video generation pipelines (generation, voiceover, captions, short-form workflows).
- Visual workflow builder (drag-and-drop graphs, approvals, triggers).
- Plugin marketplace for integrations, workflows, agents.
- Embedded widgets for third-party SaaS.

---

## V3 — Enterprise AI infrastructure platform

**Goal:** Full enterprise readiness and broader verticals.

- SAML SSO, SCIM, advanced RBAC, audit logs, governance.
- White-label deployments (branding, domains, agency-style multi-client).
- Distributed runtime (edge workers, hybrid cloud, regional runtimes).
- Kubernetes, Helm, autoscaling, deep observability.
- Expansion beyond marketing: sales, support, ecommerce, enterprise copilots.

---

## Long-term

Standard **open-layer** posture for AI-native automation across startups, agencies, enterprises, self-hosted footprints, developer ecosystems, and AI-powered SaaS products.
