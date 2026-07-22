# Public release checklist

Use this checklist before making Legacy Control Lab Community Edition public or creating a release tag.

## Repository boundary

- [ ] Community Edition contains the runtime source, Docker files, seed data, public assets, and user documentation.
- [ ] Internal tests, authoring utilities, capture tooling, planning notes, and generated runtime data are excluded.
- [ ] Every command advertised in `package.json` resolves to a file that ships in the repository.
- [ ] No local paths, credentials, customer data, or private planning notes are present.
- [ ] `LICENSE`, `NOTICE`, and `docs/licensing.md` accurately describe the MIT host and GPL-3.0 IronTerm component.

## Automated checks

Run from the repository root:

```powershell
npm ci
npm run build
npm run check:release-hygiene
npm run check:audit
docker compose build
docker compose up -d
curl.exe -f http://127.0.0.1:8080/api/health
docker compose down
```

- [ ] The latest GitHub Actions **CI / docker-smoke** workflow is green on `main`.
- [ ] The Docker image builds without a local `.env`, database, or generated report directory.
- [ ] The health endpoint returns a successful response.
- [ ] The lab UI opens at `http://localhost:8080/lab/`.
- [ ] Ports 8080 and 6080 remain published to `127.0.0.1` only.

## Installation acceptance

- [ ] Download ZIP path works without Git or Node installed on the host.
- [ ] Windows Home / WSL 2 instructions are understandable on a clean machine.
- [ ] A new user can identify when Docker Desktop is ready.
- [ ] A new user can build, open, and complete the Five-Minute Demo without developer assistance.
- [ ] Physical and virtual function-key guidance is sufficient.

## Four-lane smoke test

- [ ] `DEMO` / `TRAIN`: complete the Five-Minute Demo.
- [ ] `AUDIT` / `TRAIN`: open a scored governance mission and collect evidence.
- [ ] `IONGRC` / `IONGRC`: open the practice desk and follow an article path.
- [ ] `QSECOFR` / `TRAIN`: perform a synthetic privileged change and review its evidence.
- [ ] Change Lane, restart, persistent volume, and `docker compose down -v` reset behavior work as documented.

## Public presentation

- [ ] README screenshots match the current interface.
- [ ] README version matches `package.json` and `CHANGELOG.md`.
- [ ] Command-fidelity labels distinguish stateful, display, cataloged, and lab-native behavior.
- [ ] The i on GRC brand link opens the intended maintainer page.
- [ ] Documentation links resolve inside the Community Edition repository.
- [ ] The repository description, topics, and About link are set.
- [ ] Final release tag and launch announcement are intentionally deferred until all checks above pass.
