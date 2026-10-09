# Jev assurance experiment

This track asks one bounded question: how do Jev's typed judgments move when the represented evidence boundary changes while the IBM i subject, target and question set remain fixed?

The experiment evaluates three synthetic `CLAIMS400` state packages for `JSMITH` and `PAYLIB/PAYMST`:

1. direct private authority only;
2. the effective identity, object and adopted-authority paths;
3. the same authority paths plus QAUDJRN activity and time context.

Every request includes the same Noul, Choice and Score questions. The exporter preserves the complete request and response, model identity, token usage, elapsed time, known exclusions, and SHA-256 values over each request, response and final package.

Run a live experiment:

```bash
npm run build
TYPESAFE_API_KEY=... npm run jev:assurance
```

Use the deterministic fixture only for tests and interface development:

```bash
npm run build
npm run jev:assurance -- --fixture
```

Fixture output is labeled `fixture` and uses the model name `fixture-not-jev`. It must not be presented as a live Jev result.

Jev receives no IBM i credential, proposal, approval or execution capability. The experiment records assistive judgments only. Deterministic IBM i authority calculation and any governed action remain outside the model boundary.
