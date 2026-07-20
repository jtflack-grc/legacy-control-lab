# Community Edition

This GitHub repository is the **Community Edition** of Legacy Control Lab: a
**Docker-first runtime distribution**.

## What ships

- Application source (`src/`, `public/`)
- Docker build/run files
- Seed data required to run the four training lanes
- IronTerm browser terminal (`external/IronTerm-main/`, GPL-3.0)
- Install/security docs: Docker quickstart, troubleshooting, command fidelity,
  licensing, and this Community Edition note

## What does not ship

- Full local authoring tooling under most of `scripts/`
- Deep internal fidelity / portfolio / launch marketing docs
- Screenshot capture tooling and `examples/`
- The full automated test suite (CI here is docker-smoke only)

Those remain in the maintainer workspace. Community Edition is meant to
**clone → `docker compose up -d --build` → train**, not to rebuild the entire
development toolbox.

## Versioning

Community Edition releases follow the `package.json` / git tag version
(currently **1.0.0**).
