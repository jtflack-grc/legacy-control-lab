# CLAIMS-007 — Red Team boundary simulation

**Mission:** Can You Red Team IBM i Boundaries?

**Sign-on:** `APCLERK` / `TRAIN` (limited capabilities profile)

**Lab path from:** [Red Team an IBM i](https://www.linkedin.com/pulse/can-you-red-team-ibm-i-john-flack-pabze) — escape attempts as *findings*, not exploits.

## Scenario

You are an accounts payable clerk with **LMTCPB(*YES)**. Try to reach payroll master data authority. The lab should block you — document *how*.

## Copy/paste path

```text
STRMSN MISSION(CLAIMS-007)
DSPUSRPRF USRPRF(APCLERK)
GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*ALL)
DSPNETA
WRKFINDING
SUBMITMSN
```

Expect **CPF9902** or **CPF2209** on escalation commands. Write findings about the boundary, not a breach narrative.

Coach doc: [training-claims-007.md](../../../docs/training-claims-007.md)
