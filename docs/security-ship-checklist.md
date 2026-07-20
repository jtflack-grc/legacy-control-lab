# Security ship checklist (v1.0 public)

Local training range — not production multi-tenant. Use this before `git push` to a public GitHub repo.

## Threat model (read first)

See [SECURITY.md](../SECURITY.md). Assumptions: single operator, loopback bind, public training passwords, synthetic data only.

## OWASP API Security Top 10 (relevant subset)

| Risk | Control | Verify |
|------|---------|--------|
| Broken object level auth | `X-Lab-Session-Token` on mission mutations and live coach/progress reads; attempts bound to user **and** system | `npm test` — `tests/httpSecurity.test.ts`, `tests/missionFindingsApi.test.ts` |
| Broken authentication | Token issued after TN5250 sign-on; production session token via header or `Sec-Fetch-Site: same-origin` (not Referer) | Manual + `tests/httpSecurity.test.ts` |
| Broken object property auth | Session token gated; config omits passwords; mission tips use public TRAIN/IONGRC only | `tests/httpSecurity.test.ts` |
| Unrestricted resource consumption | 64 KB JSON body cap on mutating APIs | `tests/missionFindingsApi.test.ts` |
| Security misconfiguration | Loopback bind, `LCL_QSH_MODE=synthetic`, Docker maps `127.0.0.1:8080` | `.env.example`, `docker-compose.yml` |
| Unsafe consumption of APIs | Path traversal guard on static files | `serveStaticFile` in `httpServer.ts` |
| Improper inventory management | `npm run check:audit` (high severity) | preflight |

## OWASP ASVS (local subset)

| Area | Status |
|------|--------|
| V3 Session management | In-memory lab tokens, 90s stale, timing-safe compare |
| V14 HTTP security headers | CSP, nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy |
| V4 Access control | Mutations require session token |
| V13 API | No secrets in production `/api/lab/config` passwords |

## MITRE ATT&CK (training context)

| Technique | Mitigation |
|-----------|------------|
| Credential access from API | Passwords redacted in production config; training passwords documented |
| Command execution | `LCL_QSH_MODE=synthetic` default; host mode requires loopback bind |
| Lateral movement via LAN | Default `HTTP_BIND_HOST=127.0.0.1` |

## CWE hygiene

| CWE | Mitigation |
|-----|------------|
| Path traversal | Static file root check |
| Timing attacks on tokens | `timingSafeEqual` in `sessionRegistry.ts` |
| Dependency CVEs | `npm run check:audit` |

## Automated gates

```bash
npm run check:release-hygiene
npm run check:audit
npm test
npm run build
```

Docker:

```bash
docker compose down -v
docker compose up --build
curl -sf http://127.0.0.1:8080/api/health
```

## Manual smoke (all four lanes)

- [ ] `DEMO` / `TRAIN` → Five-Minute Demo → SUBMITMSN → demo-complete card
- [ ] `AUDIT` / `TRAIN` → WRKUSRPRF → coach panel
- [ ] `IONGRC` / `IONGRC` → Main Menu + i on GRC coach (no failed sign-on)
- [ ] `QSECOFR` / `TRAIN` → CHGUSRPRF OLDVENDOR → DSPEVDDIFF
- [ ] Sign-on row 24: `(C) COPYRIGHT LCL IONGRC. 1974, 2026.`
- [ ] Mission API returns 401 without green-screen sign-on (try curl without token)

