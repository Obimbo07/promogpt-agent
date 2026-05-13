# Feature delivery checklist

Copy into a PR description or tracker issue before requesting review.

## Specification

- [ ] Problem statement and acceptance criteria documented (ticket or PR body).
- [ ] UX / API impacts identified; breaking changes flagged.
- [ ] Security considerations noted (auth, tenancy, secrets, scopes).

## Implementation

- [ ] Changes limited to what's required for acceptance criteria.
- [ ] Naming and patterns match adjacent code unless establishing a intentional new convention.
- [ ] Error paths handled with clear messages suitable for dashboard or logs (no silent failures).

## Verification

- [ ] `npm run verify` passes locally where applicable.
- [ ] Screenshots or short screen recording attached for UI changes.
- [ ] Manual test notes listed for integrations or infra-affecting PRs.

## Documentation

- [ ] `docs/` updated if behaviour, roadmap slice, billing, deployment, or public contract changed.
- [ ] README or onboarding steps updated if `npm install` / env vars / ports changed.

## Release considerations

- [ ] Migration or rollout steps spelled out when schema or infra changes ship.
- [ ] Feature flags or backwards compatibility called out explicitly.
