# Changelog

## [1.0.0] — 2026-07-20

### Added

- Community Edition packaging: Docker-first runtime distribution on GitHub
- Install docs for Windows Home / WSL 2 virtualization and ZIP (no-Git) path
- Command fidelity honesty guide (`docs/command-fidelity.md`)
- Licensing note for MIT host + GPL IronTerm (`docs/licensing.md`)
- Public release checklist (`docs/public-release-checklist.md`)
- README five-minute preview, architecture diagram, and product screenshots
- docker-smoke GitHub Actions workflow

### Changed

- Default install path is `docker compose up -d --build` (not the PowerShell helper)
- Coach panels: understand first, act second (demo / i on GRC / auditor / operator)
- Lab-native commands (for example `WRKFINDING`) marked `implementationLevel: lab_native`
- Brand mark links to maintainer LinkedIn

### Notes

- Synthetic training runtime only — not IBM i, not affiliated with IBM
- Public training passwords: `DEMO`/`TRAIN`, `AUDIT`/`TRAIN`, `IONGRC`/`IONGRC`, `QSECOFR`/`TRAIN`

## [0.8.0] — 2026-06-09

### Added

- Phase 8 signature polish: brand assets, tagline lock, launcher wordmark
- Structured coach insights (auditor + operator lanes)
- Automated screenshot capture (`npm run capture:screenshots`)
- Architecture doc set and portfolio case study
- Launch package markdown (`launch/linkedin/`, video scripts)
- `npm run copy:audit` and `npm run release:candidate`
- SECURITY.md, NOTICE, GitHub issue/PR templates

### Changed

- README: tagline, two-lane story, screenshot embeds
- Example reports aligned with GENRPT title-block pattern
- CI: `validate:range` and `command:coverage` steps

### Notes

- Synthetic training runtime only — not IBM i, not affiliated with IBM
- Credentials: `AUDIT`/`TRAIN`, `QSECOFR`/`TRAIN`
