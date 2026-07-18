# Troubleshooting

Prefer Docker for first run. See [docker.md](./docker.md) and [quickstart.md](./quickstart.md).

## Docker setup

| Problem | Fix |
|---------|-----|
| Docker not running | Start Docker Desktop; wait for **Engine running** |
| `docker` not recognized | Restart Windows, start Docker Desktop, open a **new** PowerShell window |
| Port already in use | `docker compose down` · change host port in `docker-compose.yml` |
| Stale volume data | `docker compose down -v` then `docker compose up -d --build` |
| Rebuild after code change | `docker compose up -d --build` |
| Blank / disconnected terminal | Confirm ports **8080** and **6080** are published; open `http://localhost:8080/lab/` |
| Health never becomes ready | `docker compose logs --tail 100` · wait for first build (3–5 minutes) |

## Health check

```powershell
curl.exe http://127.0.0.1:8080/api/health
```

Expect JSON with a healthy status when the lab is up.

## Still stuck?

1. `docker compose ps`
2. `docker compose logs --tail 200`
3. `docker compose down -v` then `docker compose up -d --build`
4. See [SECURITY.md](../SECURITY.md) if you suspect a local security misconfiguration
