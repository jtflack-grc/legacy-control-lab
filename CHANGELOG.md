# Changelog

## [1.1.0] — 2026-10-11

### Added

- **Shipped Profile Assurance** and `CLAIMS-011 — The Profile That Shouldn't Exist`.
- Scenario-bounded Q-profile baseline with compliant, misconfigured, and provenance-ambiguous examples.
- Lab-only `ANZSHPRF` analysis helper with explicit claim-boundary language.
- Indirect discovery path from `DSPJOB` option 13 through the library list and QSYS `*USRPRF` objects.
- Non-secret `password_configured` assurance state so the lab can model interactive sign-on exposure without publishing synthetic credentials.
- Baseline restoration for deleted synthetic profiles so remediation exercises remain repeatable.

### Changed

- `ANZDFTPWD` no longer treats `PASSWORD(*NONE)` as a defect.
- Direct `DSPUSRPRF` command-line use is restricted for `LMTCPB(*YES)` profiles; profile information may still be reached through modeled navigation paths.
- `CLAIMS-007` now separates command restriction, information exposure, and authority enforcement.
- `CHGUSRPRF ... PASSWORD(*NONE)` clears interactive password state and records non-secret before/after evidence.
- User-profile detail displays `*SET` / `*NONE` rather than password content.

### Claim boundary

- `ANZSHPRF` is an LCL helper, not an IBM CL command.
- The CLAIMS400 supplied-profile baseline is deliberately scenario-specific, not an exhaustive cross-release IBM inventory.
- Implementation was written independently; no GPL Web3270 source was copied.

### Notes

- Synthetic training runtime only — not IBM i, not affiliated with IBM.
- Public training credentials remain limited to the documented training identities.


## [1.0.0] — 2026-07-20

### Added

- Community Edition packaging: Docker-first runtime distribution on GitHub
- Install docs for Windows Home / WSL 2 virtualization and ZIP (no-Git) path
- Command fidelity honesty guide (`docs/command-fidelity.md`)
- Licensing note for MIT host + GPL IronTerm (`docs/licensing.md`)
- README five-minute preview, architecture diagram, and product screenshots
- Docker smoke-test GitHub Actions workflow

### Changed

- Default install path is `docker compose up -d --build`
- Coach panels: understand first, act second across all training lanes
- Lab-native commands such as `WRKFINDING` marked `implementationLevel: lab_native`
- Brand mark links to the maintainer page

### Notes

- Synthetic training runtime only — not IBM i, not affiliated with IBM
- Public training passwords: `DEMO`/`TRAIN`, `AUDIT`/`TRAIN`, `IONGRC`/`IONGRC`, `QSECOFR`/`TRAIN`

## [0.8.0] — 2026-06-09

### Added

- Brand assets, tagline, and launcher wordmark
- Structured coach guidance for auditor and operator lanes
- Security policy, trademark notice, and Docker packaging foundation

### Changed

- README and launcher presentation
- Scenario-backed reports and command-catalog coverage
- Synthetic evidence workflows and training-lane navigation

### Notes

- Synthetic training runtime only — not IBM i, not affiliated with IBM
- Training credentials use non-production synthetic profiles
