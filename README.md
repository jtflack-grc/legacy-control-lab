# Legacy Control Lab

**Control evidence, from the green screen out.**

A local **training range** — not a toy quiz, not a cloud platform — where GRC, audit, and IBM i security learners practice collecting control evidence the way it actually appears: on a 5250-style green screen, with coach guidance beside it.

**For:** IT auditors, GRC practitioners, IBM i / midrange security learners, and managers who want to see system-shaped judgment.  
**Not for:** replacing a real IBM i LPAR, production operations, exploit practice, or “dashboard GRC” coursework that never touches a system.

Runs on your machine with Docker. **No IBM i required. No cloud required. No Node install required.**

![Launcher](public/assets/screenshots/01-launcher.png)

## What you will experience in five minutes

1. Open the lab and pick **Five-Minute Demo**.
2. Sign on as `DEMO` / `TRAIN` on the green screen.
3. Read **why the step matters**, then run the command the coach shows.
4. Inspect synthetic profiles, authority, or journal-style evidence on `CLAIMS400`.
5. Finish the demo path (`SUBMITMSN`) — then try Prove, Practice, or Operate.

You leave knowing what control evidence feels like from the green screen out — not another framework slideshow.

| Lane | User | Password |
|------|------|----------|
| Five-Minute Demo | `DEMO` | `TRAIN` |
| i on GRC | `IONGRC` | `IONGRC` |
| Prove (auditor) | `AUDIT` | `TRAIN` |
| Operate privileged | `QSECOFR` | `TRAIN` |

These are public training passwords, not real credentials.

![Demo coach + terminal](public/assets/screenshots/02-demo-coach.png)

## Agent Authority in the same lab

**LCL is the environment. Agent Authority governs an agent interacting with that environment.** Human users work through the 5250-style terminal, while the deterministic demonstration agent uses six structured MCP tools. Both paths reach the same synthetic `CLAIMS400` state, and ordinary LCL state-change, audit and job-log records remain authoritative.

The guided scenario pack tells five complementary stories without requiring protocol knowledge:

| Scenario | Governance lesson |
|---|---|
| AA-001 — The Message Says It's Approved | Data is not authority |
| AA-002 — More Access Than Necessary | Exact approval and least privilege |
| AA-003 — The System Changed | Approval is bound to starting state |
| AA-004 — Investigate Before Acting | Proportional autonomy: safe reads, governed writes |
| AA-005 — Outside the Boundary | Delegation boundaries and default denial |

The flagship `AA-001` path works as follows:

1. The agent observes an operational message. The message is data, not permission.
2. It requests one exact change: `APCLERK → PAYROLL/PAYMST → *USE`.
3. Policy holds the privilege change for a separately authenticated human decision.
4. `QSECOFR` reviews the request in Authority Desk; the agent cannot approve itself.
5. If approved, `MCPAGENT` executes once against ordinary LCL state.
6. The terminal confirms the authority, and the rail explains the resulting audit, job-log, receipt and independently verified proof evidence.

The standard Compose quick start enables this local deterministic path by default. Set `LCL_AGENT_AUTHORITY_ENABLED=false` before starting Compose to hide Agent Authority while leaving ordinary LCL unchanged. No model, API key, cloud service or IBM i is involved.

![Agent Authority guided rail](public/assets/screenshots/03-agent-authority-overview.png)

![Pending request awaiting a human decision](public/assets/screenshots/04-agent-authority-pending.png)

![Completed Agent Authority evidence](public/assets/screenshots/05-agent-authority-complete.png)

Walkthrough detail: [docs/agent-authority-guide.md](docs/agent-authority-guide.md).

## Credibility check (for IBM i folks)

After the demo, poke commands you already know. Training depth varies by design:

| Try | What you should feel |
|-----|----------------------|
| `WRKUSRPRF`, `DSPOBJAUT`, `DSPSYSVAL` | Familiar inquiry patterns on synthetic data |
| `DSPJRN` / job-log style review | Evidence trail for access and change |
| Privileged change as `QSECOFR` | Side effects in audit/job-log style output |
| `WRKFINDING`, `SUBMITMSN` | **Lab-only** — not IBM CL; mission/coach tooling |

Honest labels: [docs/command-fidelity.md](docs/command-fidelity.md). This is a **synthetic training partition**, not a substitute for a live system.

## Community Edition

This repository is **Community Edition 1.0.0**: a Docker-first **local training artifact** you can clone, run, and revisit. It is not a SaaS product, shared hosted demo, or “GRC platform.”

See [docs/community-edition.md](docs/community-edition.md).

## Requirements

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows or Mac)

Git is optional. The Download ZIP path needs only Docker Desktop.

### Windows Home or virtualization disabled

Docker Desktop can run this lab on **Windows 11 Home or Pro** with the **WSL 2** backend. Hyper-V is not required for these Linux containers.

Before installing Docker Desktop:

1. Open **Task Manager → Performance → CPU** and check **Virtualization**.
2. If it says **Disabled**, enable **Virtualization Technology** / **Intel VT-x** / **AMD-V** / **SVM** in BIOS/UEFI, save, and restart.
3. Open **PowerShell as Administrator** and run:

```powershell
wsl --install
```

4. Restart when prompted.
5. Install Docker Desktop with the **WSL 2 backend**.
6. Wait for **Engine running** before continuing.

Microsoft: [Install WSL](https://learn.microsoft.com/windows/wsl/install) · Docker: [Windows install](https://docs.docker.com/desktop/setup/install/windows-install/)

## Quick start — no Git required

1. Install and open **Docker Desktop**; wait for **Engine running**.
2. On this GitHub repository, select **Code → Download ZIP**.
3. Extract completely (do not run from inside the ZIP preview).
4. Open the extracted `legacy-control-lab-main` folder.
5. Click the File Explorer address bar, type `powershell`, press **Enter**.
6. Start:

```powershell
docker compose up -d --build
```

First build often takes **3–5 minutes**. Then open **http://localhost:8080/lab/**.

### Keyboard and function keys

IBM i-style keys such as **F3**, **F4**, and **F12** matter here. On many laptops the function row is media-first. If a physical key does nothing useful, use the **virtual function-key buttons in the terminal** — no Fn-lock change required.

## Alternative — clone with Git

```powershell
git clone https://github.com/jtflack-grc/legacy-control-lab.git
cd legacy-control-lab
docker compose up -d --build
```

More detail: [docs/docker.md](docs/docker.md) · [docs/quickstart.md](docs/quickstart.md) · [SECURITY.md](SECURITY.md)

## How it runs (local only)

```mermaid
flowchart LR
  browser[Browser lab UI]
  coach[Coach panel]
  iron[IronTerm 5250 client]
  api[Lab host]
  db[(SQLite seed + runtime)]
  tn[TN5250 + websockify]

  browser --> coach
  browser --> iron
  iron --> tn
  tn --> api
  coach --> api
  api --> db
```

Everything stays on your machine. No shared cloud demo.

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

- Not IBM i, DB2 for i, or an IBM product — and not affiliated with IBM
- Not a production emulator, service tools, or a live LPAR replacement
- Not an exploit lab
- Not a hosted multi-tenant “platform”

## Ports

| Service | Port |
|---------|------|
| Lab UI | 8080 |
| websockify bridge | 6080 |
| TN5250 TCP host (internal) | 8023 |

## Version

**1.0.0** Community Edition — [CHANGELOG.md](CHANGELOG.md).

## License

[LICENSE](LICENSE) (MIT). Browser terminal: IronTerm (GPL-3.0) in `external/IronTerm-main/` — [NOTICE](NOTICE) · [docs/licensing.md](docs/licensing.md).
