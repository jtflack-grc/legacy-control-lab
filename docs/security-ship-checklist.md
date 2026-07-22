# Security ship checklist (Community Edition 1.0)

Legacy Control Lab is a local, single-operator training range. It is not a production or multi-tenant service. Use this checklist before publishing a Community Edition release.

## Threat model

See [SECURITY.md](../SECURITY.md). The supported deployment assumes:

- one operator on a trusted workstation;
- synthetic data and public training passwords only;
- HTTP and websockify published to host loopback;
- synthetic QShell/PASE mode;
- no exposure to an untrusted LAN or the public internet.

## Controls and public verification

| Risk | Community Edition control | Public verification |
|------|---------------------------|---------------------|
| Unauthorized mission mutation | Session token required for mission mutations; attempts bind to user and system | Sign on through the green screen before using mission actions; confirm unauthenticated mutation attempts are rejected |
| Credential exposure | Production config omits lane passwords; documented passwords are training-only | Inspect `/api/lab/config` and confirm no changed user password is returned |
| Resource exhaustion | Mutating API JSON bodies are capped at 64 KB | Inspect the request-body limit in `src/lab/httpServer.ts` |
| Host command execution | `LCL_QSH_MODE=synthetic` is the default; unsafe host-mode binding is refused | Inspect `docker-compose.yml` and `src/ibmi-runtime/pase/qshMode.ts` |
| LAN exposure | Host publishes ports 8080 and 6080 on `127.0.0.1` only | Run `docker compose config` and inspect the published addresses |
| Path traversal | Static-file paths are constrained to their configured roots | Inspect the static-file handling in `src/lab/httpServer.ts` |
| Dependency vulnerabilities | Production dependencies are checked at high severity | Run `npm run check:audit` |
| Accidental release leakage | Shipped hygiene check scans for local paths and likely secrets | Run `npm run check:release-hygiene` |

## Automated checks included in Community Edition

Install dependencies and run the shipped checks:

```powershell
npm ci
npm run build
npm run check:release-hygiene
npm run check:audit
```

Build and exercise the release package:

```powershell
docker compose down -v
docker compose up -d --build
curl.exe -f http://127.0.0.1:8080/api/health
curl.exe -f http://127.0.0.1:8080/api/lab/config
docker compose logs --tail 100
```

The GitHub Actions workflow at `.github/workflows/ci.yml` independently builds the Docker image and checks health, configuration, the lab page, and websockify reachability.

## Configuration review

- [ ] `docker compose config` shows host mappings for 8080 and 6080 on `127.0.0.1`.
- [ ] `LCL_QSH_MODE` remains `synthetic`.
- [ ] No real credentials, hostnames, customer identifiers, or production data are present.
- [ ] Generated databases, reports, evidence packets, and scorebooks remain excluded from Git.
- [ ] `NOTICE` and `docs/licensing.md` accompany the GPL-3.0 IronTerm source.
- [ ] The latest **CI / docker-smoke** workflow is green.

## Manual security smoke

- [ ] `DEMO` / `TRAIN` can complete the unscored demo but cannot obtain real authority.
- [ ] `AUDIT` / `TRAIN` can use mission actions only after green-screen sign-on.
- [ ] `IONGRC` / `IONGRC` exposes synthetic article-practice content only.
- [ ] `QSECOFR` / `TRAIN` changes synthetic state only.
- [ ] A changed training password is not exposed through public configuration or unauthenticated coach responses.
- [ ] Stopping and removing the Docker volume erases generated lab state as documented.

## Deliberate limitations

These are accepted for the supported local threat model:

- public training passwords;
- no TLS on loopback connections;
- no multi-user or tenant isolation;
- no rate limiting;
- selected unauthenticated read-only catalog and briefing endpoints;
- CSP allowances required by the current local UI.

Do not deploy Community Edition as an internet-facing service without a separate architecture and security review.
