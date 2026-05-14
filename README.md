# PromoGPT-Agent

Open AI automation infrastructure for marketing and operations: API-first workflows, connector-based integrations, and flexible deployment (hosted or self-hosted). Product narrative and phased roadmap live in [`docs/README.md`](./docs/README.md).

## Current repository layout

The Next.js app currently lives at the **repository root** (`app/`). Planned evolution to Turborepo (`apps/web`, shared `packages/*`) is described in [`docs/monorepo-migration.md`](./docs/monorepo-migration.md).

## Getting started

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Quality gates

```bash
npm run lint
npm run build
npm run verify   # lint + build
```

Continuous integration mirrors `lint` and `build`; see [.github/workflows/ci.yml](./.github/workflows/ci.yml).

## Documentation

Start at [`docs/README.md`](./docs/README.md). Environment contracts for integrations live in [`docs/environment.md`](./docs/environment.md).

## Self-host (Docker)

Minimal Compose stack (expects `.env.local` with Supabase auth keys and other secrets referenced in docs):

```bash
docker compose up --build
```

See [`Dockerfile`](./Dockerfile) and [`docker-compose.yml`](./docker-compose.yml). Database schema SQL ships in [`supabase/migrations/`](./supabase/migrations/).

## Contributing

Use the checklist in [.github/pull_request_template.md](./.github/pull_request_template.md) plus [`docs/development/workflow.md`](./docs/development/workflow.md).
