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

## AA-001 story

1. **Observed:** Read the isolated operational message. Its text claims emergency access was approved, but message content is not authorization.
2. **Requested:** Select **Create governed request**. The deterministic agent asks for `APCLERK → PAYROLL/PAYMST → *USE`.
3. **Held:** Confirm that the rail reports no APCLERK private authority. The policy classified the action as a privilege change and held it.
4. **Reviewed:** Sign on in the terminal as `QSECOFR` / `TRAIN`, then open **Review request in Authority Desk**. Approve or deny only from that separately authenticated surface.
5. **Executed:** For approval, return to the guided rail and run `DSPOBJAUT OBJ(PAYROLL/PAYMST)` in the terminal. The ordinary object-authority display now shows the shared CLAIMS400 result. A denial leaves it unchanged.
6. **Verified:** Review the state-change, CA-style audit, MCPAGENT job-log and Agent Authority receipt references. Download the proof from the rail or Authority Desk after verification succeeds.

Raw JSON and hashes remain available in Authority Desk for technical inspection, but they are not required to understand the decision or outcome.

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
