# Development workflow

How we evolve PromoGPT-Agent with predictable quality and aligned scope.

## Daily loop

1. Sync `main` (or agreed default branch) and create a short-lived branch (`feat/`, `fix/`, `docs/`, `chore/`).
2. Run `npm run verify` locally before pushing if you touched code or deps.
3. Open a PR; complete the checklist in `.github/pull_request_template.md`.

## Quality gates

| Gate | Command / location | Purpose |
| --- | --- | --- |
| Lint | `npm run lint` | Style and static correctness (ESLint) |
| Production build | `npm run build` | Typecheck and bundle validation |
| Combined | `npm run verify` | Single local pre-push step |

Continuous integration runs `lint` and `build` on pushes and PRs (see `.github/workflows/ci.yml`).

## Documentation updates

Any change that materially affects product scope, billing, deployments, security posture, or public API surface **should ship with doc updates** in `docs/` in the same PR or a stacked follow-up the same sprint.

Roadmap checkpoints: [roadmap](../roadmap.md) and [checklists/v1-foundations](../checklists/v1-foundations.md).

## Scope discipline

- Prefer small PRs with a single coherent intent.
- **Do not** expand scope (“while we’re here” refactors) unless necessary for correctness or mandated by lint.
- Breaking API changes require versioning notes in PR description and backlog consideration for SDK consumers once the public SDK lands.

## Secret and credential handling

- Never commit secrets. Use `.env.local` locally and platform secret stores in CI/production.
- For future BYO-key flows (roadmap): document key storage and envelope encryption separately when implemented.
