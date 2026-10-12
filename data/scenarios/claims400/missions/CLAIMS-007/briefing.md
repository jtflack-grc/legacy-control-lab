# CLAIMS-007 — Red Team boundary simulation

**Mission:** Can You Red Team IBM i Boundaries?

**Sign-on:** `APCLERK` / `TRAIN` (limited capabilities profile)

**Lab path from:** [Red Team an IBM i](https://www.linkedin.com/pulse/can-you-red-team-ibm-i-john-flack-pabze) — escape attempts as *findings*, not exploits.

## Scenario

You are an accounts payable clerk with **LMTCPB(*YES)**. The first question is no longer simply whether the command line is restricted. It is whether that restriction also prevents useful discovery.

Start with `DSPJOB`. On **Work with Job**, select **13 — Display library list**. From the library list, use **5** on `QSYS`, then inspect the `*USRPRF` objects you can still see. This path is navigation, not a typed `DSPUSRPRF` command.

Then try to change authority on `PAYROLL/PAYMST`. The lab should deny that mutation.

## Copy/paste + navigation path

```text
STRMSN MISSION(CLAIMS-007)
DSPJOB
  -> 13 Display library list
  -> 5 on QSYS
  -> 5 on a *USRPRF object
GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*ALL)
DSPNETA
WRKFINDING
SUBMITMSN
```

The finding is not "LMTCPB failed." The stronger conclusion is narrower:

- command restriction reduced what APCLERK could execute;
- native navigation still exposed useful system identity information; and
- the authority-changing boundary held when tested.

That distinction is the control-effectiveness lesson.

Coach doc: [training-claims-007.md](../../../docs/training-claims-007.md)
