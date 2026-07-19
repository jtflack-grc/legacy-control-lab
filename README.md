# Legacy Control Lab

**Control evidence, from the green screen out.**

A local **IBM i-style governance and security range** for learning how control evidence, privileged access, object authority, audit journals, job logs, spooled files, system values, and QSECOFR-like authority work in legacy environments.

Run it locally. **No IBM i required. No cloud required. No Node install required** (Docker path).

## Requirements

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows or Mac)

Git is optional. The Download ZIP instructions below require only Docker Desktop.

## Quick start — no Git required

1. Install and open **Docker Desktop**; wait for **Engine running**.
2. On this GitHub repository, select **Code → Download ZIP**.
3. Extract the downloaded ZIP completely. Do not run the lab from inside the ZIP preview.
4. Open the extracted `legacy-control-lab-main` folder in File Explorer.
5. Click the File Explorer address bar, type `powershell`, and press **Enter**.
6. Start the lab:

```powershell
docker compose up -d --build
```

The first build may take **3–5 minutes**. Then open **http://localhost:8080/lab/**.

## Alternative — clone with Git

If Git is already installed:

```powershell
git clone https://github.com/jtflack-grc/legacy-control-lab.git
cd legacy-control-lab
docker compose up -d --build
```

| Lane | User | Password |
|------|------|----------|
| Five-Minute Demo | `DEMO` | `TRAIN` |
| i on GRC | `IONGRC` | `IONGRC` |
| Prove (auditor) | `AUDIT` | `TRAIN` |
| Operate privileged | `QSECOFR` | `TRAIN` |

These are public training passwords, not real credentials.

New to Docker? Follow the [step-by-step Docker Desktop install guide](docs/docker.md).  
Also: [docs/quickstart.md](docs/quickstart.md) · [SECURITY.md](SECURITY.md)

## Crawl, walk, run

| Stage | What you pick | Sign-on |
|-------|---------------|---------|
| **Crawl** | Five-Minute Demo | `DEMO` / `TRAIN` |
| **Walk — Prove** | Governance, Blue Team, or Red Team | `AUDIT` / `TRAIN` or `APCLERK` / `TRAIN` |
| **Walk — Practice** | i on GRC articles | `IONGRC` / `IONGRC` |
| **Run** | Operate privileged | `QSECOFR` / `TRAIN` |

## Everyday commands

```powershell
docker compose up -d          # start
docker compose down           # stop (keeps progress)
docker compose down -v        # stop and erase lab data volume
docker compose logs --tail 100
```

## What this is not

- Not IBM i, DB2 for i, or an IBM product
- Not affiliated with IBM
- Not a production emulator or real service tools
- Not an exploit lab

## Ports

| Service | Port |
|---------|------|
| Lab UI | 8080 |
| websockify bridge | 6080 |
| TN5250 TCP host (internal) | 8023 |

## License

See [LICENSE](LICENSE) (MIT). Browser terminal uses IronTerm (GPL-3.0) under `external/IronTerm-main/` — see [NOTICE](NOTICE).
