# Security Policy

## Scope

Legacy Control Lab is a **local, synthetic IBM i-style training runtime**. It is not IBM i, not affiliated with IBM, and not intended for production data or production system administration.

## Threat model

| Assumption | Implication |
|------------|-------------|
| Single operator on a trusted workstation | No multi-tenant isolation |
| Loopback bind by default (`127.0.0.1`) | Do not expose to untrusted networks without review |
| Training passwords are public (`TRAIN`, `IONGRC`) | Never load real credentials into scenario packs |
| Coach/mission APIs use session tokens | Sign on in the green screen before mutating missions |

## Controls in this release

- **Bind addresses** default to loopback for HTTP, TN5250, and websockify (`HTTP_BIND_HOST`, `TN5250_BIND_HOST`, `WEBSOCKIFY_BIND_HOST`).
- Docker Compose publishes **only** `127.0.0.1:8080` and `127.0.0.1:6080` on the host.
- **`LCL_QSH_MODE=synthetic`** by default; host shell requires loopback binds for HTTP, TN5250, **and** websockify.
- **`X-Lab-Session-Token`** required for mission start/restart, evidence, findings, score preview, coach-context, and mission progress.
- Mission attempt APIs bind the attempt to both **user** and **system**.
- Production `/api/lab/config` omits lane passwords; unauthenticated mission tips use public training defaults only (never a post-`CHGPWD` secret).
- Production `/api/lab/session` returns `sessionToken` only with a valid token header or browser `Sec-Fetch-Site: same-origin` (not Referer).
- **HTTP security headers** including CSP (`unsafe-inline` retained for the lab UI; WebSocket connect limited to localhost/127.0.0.1).
- **64 KB** JSON body limit on mutating APIs.
- Static file serving rejects path traversal via `path.relative` root checks.
- **`npm run check:audit`** (`--omit=dev --audit-level=high`) checks runtime dependencies.

## Documented limits (not bugs)

These are intentional for a single-user local training range:

- Public training passwords (`TRAIN`, `IONGRC`)
- No TLS on loopback HTTP / WebSocket / TN5250
- No rate limiting
- Websockify has no application-layer auth when bound to loopback
- Unauthenticated GETs for mission briefings, demo/i on GRC content, health, and catalogs
- CSP allows `script-src 'unsafe-inline'` for the current lab UI
- MIT application code ships IronTerm (GPL-3.0) as a separate browser terminal — see [NOTICE](NOTICE)

## Misconfiguration that raises risk

- Publishing Docker ports on `0.0.0.0` instead of `127.0.0.1`
- Setting `LCL_QSH_MODE=host` while any of HTTP / TN5250 / websockify listen beyond loopback (the runtime refuses this and falls back to synthetic)
- Loading real enterprise credentials into scenario packs or `.env`

## Reporting

If you discover a security issue in this repository (for example, unsafe defaults that could affect users running the lab locally), please open a [GitHub issue](https://github.com/jtflack-grc/legacy-control-lab/issues) with reproduction steps. Do not submit real credentials, production system names, or customer data.

## What we will not accept as in-scope

- Findings against real IBM i systems
- Requests to add exploit or attack tooling
- Reports that assume this project is a production emulator
- Reports that training passwords `TRAIN` / `IONGRC` are “hardcoded secrets”

## Safe use

- Run locally or in an isolated container (`docker compose` publishes `127.0.0.1:8080` and `127.0.0.1:6080` only)
- Set `HTTP_BIND_HOST=0.0.0.0` only when you understand the risk (Compose already uses it *inside* the container so Docker can publish; the host mapping stays loopback)
- Do not place production secrets in `.env` or scenario packs
