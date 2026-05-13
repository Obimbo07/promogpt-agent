# Monorepo migration

Today this repository ships a **single Next.js application at the repository root** (`package.json`, `app/`, `next.config.ts`). The product vision places that app under `apps/web` inside a Turborepo monorepo.

## Current state vs target

| Aspect | Current | Target |
| --- | --- | --- |
| App location | Root | `apps/web` |
| Shared packages | None | `packages/*` |
| Builds | Single `npm run build` | Turborepo tasks across apps/packages |

## Migration principles

1. **Do not flip layout until packages exist** — Moving `app/` prematurely adds churn without unlocking shared libraries.
2. **Introduce `packages/config` first** — Centralize ESLint, TypeScript base, Tailwind presets to prove the workspace toolchain.
3. **Move `apps/web` in one cohesive change** — Update paths for `next.config`, Tailwind/content globs, and CI matrix in a single branch.
4. **Keep CI green at each step** — `npm run verify` must pass before and after structural moves.

## Suggested sequencing

1. Add npm workspaces (`"workspaces": ["apps/*", "packages/*"]`) once `apps/` and `packages/` have at least one real member each.
2. Add Turborepo with a minimal pipeline: lint and build `web`.
3. Extract shared UI primitives to `packages/ui` when duplication appears.
4. Extract `workflow-engine`, `connectors`, and `sdk` boundaries as APIs stabilize (post–V1 core).

Until then, documentation and checklists reference logical package names (`@promogpt/workflow-engine`, etc.) **as plans** rather than npm scope facts.
