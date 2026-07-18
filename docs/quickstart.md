# Quickstart

## Recommended: Docker

**Requirements:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) only.

1. Install and open Docker Desktop.
2. Wait until Docker Desktop says **Engine running**.
3. Clone the repository:

```powershell
git clone https://github.com/jtflack-grc/legacy-control-lab.git
cd legacy-control-lab
```

4. Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

The first build takes **3–5 minutes**. The helper opens
**http://localhost:8080/lab/** when the lab is healthy.

No Git? On GitHub select **Code → Download ZIP**, extract it, open the extracted
folder, click File Explorer's address bar, type `powershell`, and press Enter.

Full beginner instructions and everyday start/stop: [docker.md](./docker.md).

## First visit

The launcher opens on the **Five-Minute Demo** (crawl). Use **Skip intro** to reach skill paths:

| Door | User | Password |
|------|------|----------|
| Five-Minute Demo | `DEMO` | `TRAIN` |
| Practice i on GRC | `IONGRC` | `IONGRC` |
| Prove the control (auditor) | `AUDIT` | `TRAIN` |
| Red Team | `APCLERK` | `TRAIN` |
| Operate privileged | `QSECOFR` | `TRAIN` |

These are public training passwords.

### Demo-friendly Docker env (optional)

In `docker-compose.yml` under `environment:`:

```yaml
LCL_DEMO_MODE: "true"
LCL_RESET_ON_START: "true"
LCL_SHOW_QUICKSTART: "true"
```

## First-run checklist

1. Confirm `docker compose ps` shows the `lab` service as **Up**
2. Choose a lane in the launcher
3. Sign on in the 5250 terminal (credentials on the lane card)
4. Follow the coach panel

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `docker` is not recognized | Restart Windows, start Docker Desktop, wait for **Engine running**, then open a new PowerShell window |
| Cannot connect to Docker engine | Docker Desktop is not fully started; open it and wait |
| Blank/disconnected terminal | Check `docker compose ps` publishes both ports 8080 and 6080; use `http://localhost:8080/lab/` |
| Port 8080 in use | `docker compose down` or change the host port mapping in `docker-compose.yml` |
| Stale lab state | `docker compose down -v` then `docker compose up -d --build` |

More: [troubleshooting.md](./troubleshooting.md)
