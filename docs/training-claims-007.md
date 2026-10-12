# CLAIMS-007 — Limited capability does not mean zero visibility

This mission tests three different claims that are often blurred together:

1. the user cannot freely execute administrative commands;
2. the user cannot discover useful system state; and
3. the user cannot change protected authority.

They are not the same claim.

## Path

Sign on as `APCLERK / TRAIN`.

Start with:

```text
STRMSN MISSION(CLAIMS-007)
DSPJOB
```

On **Work with Job**, select **13 — Display library list**. On the library-list screen, use **5** beside `QSYS`. The resulting library view exposes synthetic `*USRPRF` objects. Use **5** on one to inspect profile detail.

Then test an authority-changing path:

```text
GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*ALL)
```

The expected result is denial. The important finding is not simply "the command failed." It is that the preventive boundary constrained execution while a separate information-disclosure path remained available.

## Evidence language

Good:

> LMTCPB reduced command execution available to APCLERK, but did not eliminate native navigation paths that disclose user-profile names and attributes. The attempted PAYMST authority change remained denied, so discovery did not demonstrate privilege escalation.

Bad:

> LMTCPB is broken.

That claim would exceed the evidence.

## Why this matters

A control can operate exactly as configured while only partially satisfying the broader security objective someone has attached to it. The mission is designed to make that distinction visible.
