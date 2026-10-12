# CLAIMS-011 — Shipped Profile Assurance

**The Profile That Shouldn't Exist**

This mission asks a deceptively simple question: when a profile begins with `Q`, what does that actually prove?

Answer: very little by itself.

## Control claim

The synthetic control owner says:

- supplied system profiles are noninteractive except where explicitly justified; and
- Q-prefixed identities can be treated as trusted system identities.

Your job is to test both statements.

## Assessment path

Sign on as `AUDIT / TRAIN`.

```text
STRMSN MISSION(CLAIMS-011)
ANZSHPRF
DSPUSRPRF USRPRF(QSYS)
DSPUSRPRF USRPRF(QSYSOPR)
DSPUSRPRF USRPRF(QCLMSADM)
DSPJRN JRN(QSYS/QAUDJRN)
WRKFINDING
```

`ANZSHPRF` is **lab-only**. It is an assurance helper over CLAIMS400's declared baseline, not an IBM CL command and not an exhaustive inventory of IBM-supplied profiles.

### Expected contrasts

**QSYS** is the comparison case: declared supplied profile, noninteractive state.

**QSYSOPR** is the configuration finding: declared supplied profile, but the scenario says an interactive password is configured.

**QCLMSADM** is the provenance finding: its name begins with Q, but it is not part of CLAIMS400's declared supplied-profile baseline. The Q prefix is not proof that IBM supplied it, that the operating system needs it, or that its privileges are justified.

QAUDJRN gives you additional provenance. State and provenance answer different questions; collect both.

## Remediation

After documenting the initial condition, use a separately authorized `QSECOFR` session:

```text
CHGUSRPRF USRPRF(QSYSOPR) PASSWORD(*NONE)
DLTUSRPRF USRPRF(QCLMSADM)
ANZSHPRF
DSPJRN JRN(QSYS/QAUDJRN)
```

The lab records the state change without exposing a password. If you reset the mission, the synthetic baseline is restored.

## Evidence chain

The intended pattern is:

```text
initial condition
  -> evidence
  -> bounded conclusion
  -> authorized remediation
  -> state-change receipt
  -> new evidence
  -> reassessment
```

The lesson is not "Q profiles are dangerous." It is that naming convention is not provenance, and configuration state is not lifecycle evidence.
