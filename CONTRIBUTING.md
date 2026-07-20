# Contributing

Thank you for improving **Legacy Control Lab** (Community Edition).

## Guidelines

- Prefer Docker-first documentation for new users
- Keep the terminal IBM i-realistic — coaching belongs in the side panel or docs
- Label lab-native commands honestly (`implementationLevel: lab_native`)
- Do not add exploit guidance or live-system attack procedures
- Do not commit `node_modules`, `dist`, `*.db`, `.env`, or generated reports

## Local Docker

```powershell
docker compose up -d --build
```

Open **http://localhost:8080/lab/**

## Questions

See [docs/troubleshooting.md](docs/troubleshooting.md), [docs/docker.md](docs/docker.md), and [docs/command-fidelity.md](docs/command-fidelity.md).
