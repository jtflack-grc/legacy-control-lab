# Public release checklist

Operational definition of **public-release ready** for Legacy Control Lab
Community Edition. This is a measured portfolio crown jewel — not a company
launch or a reason to jeopardize a day job.

## Gate (must be true)

- [ ] Repo is intentional Community Edition (runtime Docker package)
- [ ] `package.json` version matches CHANGELOG and intended git tag
- [ ] IronTerm GPL + MIT NOTICE / licensing docs reviewed
- [ ] Command fidelity honesty doc published (`docs/command-fidelity.md`)
- [ ] README shows what you get (screenshots + five-minute preview)
- [ ] Docker install path works without Git (ZIP) and with Git
- [ ] `docker-smoke` CI green on `main`
- [ ] No `.env`, databases, or security-saves in the public tree

## Release actions

1. Tag `vX.Y.Z` on `main` (example: `v1.0.0`)
2. GitHub Release with short notes (what it is / what it is not / lanes)
3. Confirm README screenshots render on GitHub
4. LinkedIn post (personal brand / i on GRC) — optional same day
5. Portfolio / hiring packet link to the public repo

## Explicit non-goals for v1 public

- No paid support commitment
- No cloud-hosted shared demo
- No claim of IBM affiliation or production IBM i replacement
- No obligation to answer every GitHub issue same-day

## After public

- Monitor Issues lightly
- Keep Community Edition runtime-focused; deep tooling stays private/maintainer-side unless deliberately promoted
