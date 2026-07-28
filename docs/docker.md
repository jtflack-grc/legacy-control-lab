# Install with Docker Desktop

This is the recommended way to run Legacy Control Lab. Docker Desktop puts the
lab and everything it needs in an isolated container. You do **not** need Node,
Python, an IBM i, or developer tools.

> New to Docker? Think of Docker Desktop as the program that runs the lab, and
> `docker compose` as the Start button described in text.

## Windows: step-by-step

### 1. Install and start Docker Desktop

1. Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).
2. Run the installer. Keep **Use WSL 2 instead of Hyper-V** selected when offered.
3. Restart Windows if the installer asks.
4. Open **Docker Desktop** from the Windows Start menu.
5. Accept its terms if prompted.
6. Wait until Docker Desktop says **Engine running**. Do not continue while it
   says Starting or Stopped.

Docker Desktop may ask you to install or update WSL. Follow its prompt, restart
Windows if requested, then open Docker Desktop again.

### 2. Get Legacy Control Lab

Choose one method:

**GitHub ZIP (no Git required)**

1. On the GitHub repository page, select **Code → Download ZIP**.
2. Open your Downloads folder.
3. Right-click the ZIP and select **Extract All**.
4. Open the extracted `legacy-control-lab-main` folder (GitHub names ZIP extracts
   with a `-main` suffix on the default branch).

**Git (if already installed)**

```powershell
git clone https://github.com/jtflack-grc/legacy-control-lab.git
cd legacy-control-lab
```

Do not run the lab from inside the ZIP preview. Extract it first.

### 3. Open PowerShell in the lab folder

In File Explorer:

1. Open the extracted `legacy-control-lab-main` folder (or `legacy-control-lab` if you cloned).
2. Click the address bar.
3. Type `powershell` and press **Enter**.

A blue or black PowerShell window opens in the correct folder.

### 4. Check Docker

Run:

```powershell
docker version
docker compose version
```

Both commands should print version information. If Windows says `docker is not
recognized`, close PowerShell and Docker Desktop, restart Windows, open Docker
Desktop, wait for **Engine running**, and open a new PowerShell window.

If the command can find Docker but cannot connect to the engine, Docker Desktop
is not fully started yet.

### 5. Start the lab

```powershell
docker compose up -d --build
```

The first build commonly takes **3–5 minutes** and downloads a Linux base image.
Later starts are faster. You may see harmless Docker Desktop warnings (for example
about `blkio throttle`); those are noise if the command finishes and the
container starts.

Then open **http://localhost:8080/lab/**

### 6. Confirm the install

Run:

```powershell
docker compose ps
```

The `lab` service should say **Up**. Then try:

1. Select **Five-Minute Demo**.
2. Sign on as `DEMO` / `TRAIN`.
3. Complete the demo and run `SUBMITMSN`.
4. Confirm the completion message and automatic sign-off countdown.
5. Return to the launcher and try `IONGRC` / `IONGRC`.

Other training profiles:

| Path | User | Password |
|------|------|----------|
| Five-Minute Demo | `DEMO` | `TRAIN` |
| i on GRC | `IONGRC` | `IONGRC` |
| Auditor | `AUDIT` | `TRAIN` |
| Privileged operator | `QSECOFR` | `TRAIN` |

These are public training passwords, not real credentials.

## Everyday use

Open Docker Desktop first, wait for **Engine running**, then open PowerShell in
the lab folder.

Start:

```powershell
docker compose up -d
```

Open:

```text
http://localhost:8080/lab/
```

Stop:

```powershell
docker compose down
```

Stopping keeps your lab progress. To erase all progress and start fresh:

```powershell
docker compose down -v
docker compose up -d --build
```

The `-v` command deletes the lab's Docker data volume. Use it only when you
intend to reset the lab.

## Updates

If installed with Git:

```powershell
git pull
docker compose up -d --build
```

If installed from a ZIP, download and extract the new release to a new folder,
then run the install helper there.

## Image contents

The image bakes in scenario JSON, command catalog, **i on GRC corpus** (`data/grc-corpus/`), article packs (`data/grc-packs/`), QOpenSys seed (`data/qopensys-seed/`), and scenario packs (`data/packs/`). Runtime SQLite and reports live on the `lab-data` volume.

## What runs inside the container

| Port | Service |
|------|---------|
| 8080 | Lab UI, coach APIs, IronTerm static files (**published** on host loopback) |
| 6080 | websockify (browser WebSocket → TN5250 TCP) (**published** on host loopback) |
| 8023 | TN5250 host (internal only; bridged via 6080) |

## Data persistence

`docker-compose.yml` mounts a named volume `lab-data` at `/app/data`:

- SQLite database: `claims400.db` (scenario + mission attempts)
- Mission reports: `data/reports/` (Markdown + JSON after SUBMITMSN)

## Environment variables

See [.env.example](../.env.example). Compose sets production defaults (`DEV_FRAME_LOG=false`).

| Variable | Default in container |
|----------|----------------------|
| `HTTP_PORT` | 8080 |
| `WEBSOCKIFY_PORT` | 6080 |
| `TN5250_PORT` | 8023 |
| `DATABASE_PATH` | `/app/data/claims400.db` |
| `SYSTEM_NAME` | CLAIMS400 |
| `SCENARIO_ID` | claims400 |
| `LCL_REALISM_MODE` | standard (`dense` loads extra jobs and source members) |
| `LIVE_HOST_JOBS` | false (`true` overlays WRKACTJOB with Linux `ps` rows mapped to IBM i job names) |
| `HTTP_BIND_HOST` | Compose: `0.0.0.0` (needed so Docker can publish; host map stays `127.0.0.1`) |
| `TN5250_BIND_HOST` | `127.0.0.1` (internal; not published) |
| `WEBSOCKIFY_BIND_HOST` | Compose: `0.0.0.0` (needed so Docker can publish port 6080) |

## PASE / QSH

`STRQSH` and `QSH` use **synthetic mode by default** (`LCL_QSH_MODE=synthetic`): `ls`, `pwd`, `cat`, and `cd` run against the partition `/qopensys` mirror only — no host shell passthrough.

**Local-only:** Compose binds ports 8080 and 6080 to `127.0.0.1`. Do not change
those host bindings or expose this container on a public network.

| `LCL_QSH_MODE` | Behavior |
|----------------|----------|
| `synthetic` (default) | Partition-local `/qopensys` mirror via Node `fs` |
| `host` | POSIX passthrough via `/bin/sh` — **only when HTTP and TN5250 bind to loopback**; otherwise auto-downgrades to `synthetic` |
| `disabled` | STRQSH returns a message; no shell |

## Security defaults

- Compose publishes **127.0.0.1:8080** and **127.0.0.1:6080** only — do not expose them on a public network.
- Coach/mission mutating APIs require **`X-Lab-Session-Token`** (issued when the green-screen session heartbeats; the lab UI sends it automatically).
- HTTP responses include baseline security headers (`nosniff`, `X-Frame-Options`, CSP, `Referrer-Policy`, `Permissions-Policy`).
- Source maintainers can run `npm run check:audit` to check production dependencies at high severity.
- Training passwords (`TRAIN`, `IONGRC`) are public by design — never load real credentials.

## Image size

Multi-stage build targets ~90MB. Catalog and scenario data are JSON under `data/` — no large binaries in the image.

## Troubleshooting

### `docker` is not recognized

Restart Windows after installing Docker Desktop. Start Docker Desktop, wait for
**Engine running**, then open a new PowerShell window.

### Docker cannot connect to the engine

Open Docker Desktop and wait for it to finish starting. If it remains stuck,
use Docker Desktop's **Troubleshoot** menu or restart Windows.

### Build fails on better-sqlite3 / Python

The image compiles `better-sqlite3` in the Docker **build** stage, then copies
that binary into the final image. Rebuild with a clean slate:

```powershell
docker compose build --no-cache
docker compose up -d
```

### Port already in use

Another program is using port 8080 or 6080. Stop another copy of the lab:

```powershell
docker compose down
```

Also stop any developer copy started with `npm run dev`.

### Blank terminal or disconnected

- Open **http://localhost:8080/lab/**, not an HTML file on disk.
- Use `localhost`, not another computer's IP address.
- Confirm both ports are published:

```powershell
docker compose ps
```

The Ports column should include `127.0.0.1:8080->8080` and
`127.0.0.1:6080->6080`.

### See what went wrong

```powershell
docker compose logs --tail 100
```

Copy that output when filing an issue.

### Clean rebuild

This removes the saved lab state and rebuilds everything:

```powershell
docker compose down -v
docker compose up -d --build
```

### Remove the lab completely

```powershell
docker compose down -v --rmi local
```

You can then delete the extracted project folder. Docker Desktop itself remains
installed.
