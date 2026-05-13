# Deployment models

## 1. Hosted SaaS

PromoGPT-Agent runs as a managed service.

**Best for**

- Startups and fast-moving teams.
- Creators.
- Agencies and SMEs that prefer not to operate infrastructure.

**Typical inclusion**

- Onboarding flows.
- Managed infrastructure and orchestration.
- Subscription billing hooks.
- Product analytics dashboards (as shipped in product).

Compliance, SSO, and custom contracts escalate toward Enterprise / self-hosted.

---

## 2. Self-hosted

Customers operate PromoGPT-Agent in their cloud or datacenter.

**Best for**

- Enterprises, governments, regulated industries, telecom, finance.

**Platforms**

- AWS, GCP, Azure, private cloud, on-premises.

**Packaging**

- Docker Compose for quick proofs and staging.
- Kubernetes and Helm charts for production and scale.

Architectural anchors: see [architecture](./architecture.md).
