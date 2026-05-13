# PromoGPT-Agent documentation

Canonical product and engineering reference for this repository.

| Document | Purpose |
| --- | --- |
| [system-overview](./system-overview.md) | Vision, positioning, problems solved, narrative scope |
| [architecture](./architecture.md) | Target technical stack, components, planned monorepo layout |
| [roadmap](./roadmap.md) | V1/V2/V3 objectives and phased capabilities |
| [deployment-models](./deployment-models.md) | Hosted SaaS vs self-hosted deployment |
| [pricing-and-revenue](./pricing-and-revenue.md) | Tiers, AI billing options, revenue streams |
| [monorepo-migration](./monorepo-migration.md) | How we evolve from root Next.js app toward Turborepo |
| [development/workflow](./development/workflow.md) | Day-to-day process, PR quality gates, tooling |
| [checklists/feature-delivery](./checklists/feature-delivery.md) | Reusable checklist for features and fixes |
| [checklists/v1-foundations](./checklists/v1-foundations.md) | V1 foundational work backlog in checklist form |

The application code currently lives at the repository root (`app/`, Next.js App Router). That layout is documented as **`apps/web` equivalent** until the monorepo migration in [monorepo-migration](./monorepo-migration.md).
