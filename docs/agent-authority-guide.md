# Agent Authority guided walkthrough

Legacy Control Lab is the synthetic enterprise system. Agent Authority governs a new way of interacting with that same system.

The walkthrough is local and deterministic. It needs no model provider, API key, network service, IBM i, or separate application. The terminal, guided rail, MCP endpoint and Authority Desk are all served by the existing LCL image.

## Start clean

For the clearest presentation, reset the local training volume and start the standard image:

```powershell
docker compose down -v
docker compose up -d --build
```

Open <http://localhost:8080/lab/>, skip the introductory tour if you have already seen it, and choose **Agent Authority** under **See agent governance**.

## Choose a scenario

The single **Agent Authority** launcher entry opens a five-card scenario chooser. Scenario status is derived from persisted proposals and receipts; the lab does not silently reset CLAIMS400 to replay a scenario. For a completely fresh run, use the clean-volume commands above.

| Scenario | Identity / target | Control lesson |
|---|---|---|
| AA-001 — The Message Says It's Approved | `APCLERK` / `PAYROLL/PAYMST` | Untrusted content is data, not permission |
| AA-002 — More Access Than Necessary | `AUDIT` / `PAYROLL/PAYMST` | Least privilege, exact authorization and deny/resubmit |
| AA-003 — The System Changed | `OLDVENDOR` / `PAYROLL/PAYMST` | State-bound approval and stale-precondition protection |
| AA-004 — Investigate Before Acting | `BACKUPADM` / `PAYROLL/PAYMST` | Autonomous observation and governed mutation |
| AA-005 — Outside the Boundary | `AUDIT` / `CLAIMS400/CLAIMMST` | Delegation boundary and default denial |

## AA-001 — The Message Says It's Approved

1. **Observed:** Read the isolated operational message. Its text claims emergency access was approved, but message content is not authorization.
2. **Requested:** Select **Create governed request**. The deterministic agent asks for `APCLERK → PAYROLL/PAYMST → *USE`.
3. **Held:** Confirm that the rail reports no APCLERK private authority. The policy classified the action as a privilege change and held it.
4. **Reviewed:** Sign on in the terminal as `QSECOFR` / `TRAIN`, then open **Review request in Authority Desk**. Approve or deny only from that separately authenticated surface.
5. **Executed:** For approval, return to the guided rail and run `DSPOBJAUT OBJ(PAYROLL/PAYMST)` in the terminal. The ordinary object-authority display now shows the shared CLAIMS400 result. A denial leaves it unchanged.
6. **Verified:** Review the state-change, CA-style audit, MCPAGENT job-log and Agent Authority receipt references. Download the proof from the rail or Authority Desk after verification succeeds.

Raw JSON and hashes remain available in Authority Desk for technical inspection, but they are not required to understand the decision or outcome.

## AA-002 — More Access Than Necessary

1. Start the scenario and create the initial request. Confirm that the exact requested authority is `*ALL`, although the stated need is limited evidence access.
2. Sign on as `QSECOFR` / `TRAIN`, open Authority Desk, and deny the request. The denied proposal remains immutable.
3. Return to the scenario and ask the deterministic agent for a narrower request. It creates a new `AUDIT → PAYROLL/PAYMST → *USE` proposal with a different proposal ID and action hash.
4. Review the new proposal in Authority Desk. Approval executes normally; denial leaves state unchanged.
5. Run `DSPOBJAUT OBJ(PAYROLL/PAYMST)` in the terminal to confirm the ordinary CLAIMS400 state, then inspect each proposal's independent proof.

If the original `*ALL` proposal is approved, the lab reports that outcome truthfully: the exact-approval boundary worked, but the human authorized more privilege than the need required. Human review does not replace least-privilege policy or sound judgment.

## AA-003 — The System Changed

1. Create the pending `OLDVENDOR → PAYROLL/PAYMST → *USE` request.
2. Before approval, sign on as `QSECOFR` / `TRAIN` and run this ordinary LCL command in the terminal:

   ```text
   GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(OLDVENDOR) AUT(*EXCLUDE)
   ```

3. Open the original request in Authority Desk and attempt approval. The protected execution re-snapshots the object, detects that its state no longer matches the proposal, and invalidates the request without an `MCPAGENT` mutation.
4. Run `DSPOBJAUT OBJ(PAYROLL/PAYMST)`. `OLDVENDOR` remains `*EXCLUDE`. The invalidation proof is downloadable and verifiable.

## AA-004 — Investigate Before Acting

1. Run the investigation. The agent uses the real broker to inspect the `BACKUPADM` profile, its `PAYROLL/PAYMST` authority and bounded recent audit activity.
2. Confirm that all three observations have read receipts and required no proposal or human approval.
3. Create the narrowing request: `BACKUPADM → PAYROLL/PAYMST → *USE`. Consequences begin here, so the normal proposal and Authority Desk boundary apply.
4. Approve or deny as `QSECOFR`. Approval changes the existing private `*ALL` authority to `*USE` and generates ordinary LCL runtime, audit and job-log evidence; denial leaves `*ALL` unchanged.
5. Confirm the result with `DSPOBJAUT OBJ(PAYROLL/PAYMST)` and inspect the proof.

## AA-005 — Outside the Boundary

1. Ask the deterministic agent to request `AUDIT → CLAIMS400/CLAIMMST → *USE`.
2. The broker returns `TARGET_NOT_ALLOWED` and records a denial receipt. It creates no proposal, so there is nothing in Authority Desk for `QSECOFR` to override.
3. Run `DSPOBJAUT OBJ(CLAIMS400/CLAIMMST)` to confirm that ordinary state did not change.

The only Phase 6.6 mutation target remains `PAYROLL/PAYMST`. Some requests are not approval questions; they are outside the agent's delegated authority.

## What the walkthrough demonstrates

- Prompt text can influence a request but cannot grant authority.
- Approval is bound to the exact action and starting state.
- Approval is one-time and cannot be replayed.
- The requesting agent cannot approve itself.
- `MCPAGENT`, not `QSECOFR`, performs an approved mutation.
- LCL creates the authoritative runtime evidence.
- The portable proof can be verified without the database.

The final control-present/control-absent explanation reports the deterministic Phase 3 comparison. It does not expose a bypass, counterfactual API, counterfactual MCP tool, or runtime switch.

## Disable the guided capability

Ordinary LCL remains usable without Agent Authority:

```powershell
$env:LCL_AGENT_AUTHORITY_ENABLED="false"
docker compose up -d --build
```

When disabled, `/mcp`, Authority Desk, the walkthrough API and launcher entry are unavailable. The existing Five-Minute Demo and governance, blue-team, red-team, i on GRC and operator paths continue normally.

## Proof limitation

The proof bundle establishes internal consistency and tamper evidence. Without an external signature or trusted anchor, it does not establish external authenticity or non-repudiation.
