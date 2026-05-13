# Roadmap

Phased objectives for PromoGPT-Agent. Use [checklists/v1-foundations](./checklists/v1-foundations.md) to operationalize near-term engineering work.

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

- OpenAI, Anthropic, Gemini, custom endpoints behind **LiteLLM** abstraction.

**Social integrations**

- LinkedIn, X/Twitter, Facebook, Instagram, TikTok, YouTube.
- Posting, scheduling, analytics ingestion where APIs allow.

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
