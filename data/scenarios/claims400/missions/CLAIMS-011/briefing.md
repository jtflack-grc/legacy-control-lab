# CLAIMS-011 — The Profile That Shouldn't Exist

**Mission:** The Profile That Shouldn't Exist

**Persona:** IT auditor / IBM i security analyst

**Primary sign-on:** `AUDIT` / `TRAIN`

**Optional remediation sign-on:** `QSECOFR` / `TRAIN`

## Scenario

The control owner makes two claims:

1. IBM-supplied Q profiles are noninteractive except where explicitly justified.
2. A Q-prefixed profile can be treated as a trusted system identity.

Do not accept either claim from naming convention alone.

`ANZSHPRF` is an **LCL-only assurance helper**, not an IBM CL command. It compares Q-prefixed identities to CLAIMS400's declared supplied-profile baseline. The baseline is intentionally scenario-bounded; it is not an exhaustive list of every Q profile IBM may ship across every release or licensed product.

## Evidence path

```text
STRMSN MISSION(CLAIMS-011)
ANZSHPRF
DSPUSRPRF USRPRF(QSYS)
DSPUSRPRF USRPRF(QSYSOPR)
DSPUSRPRF USRPRF(QCLMSADM)
DSPJRN JRN(QSYS/QAUDJRN)
WRKFINDING
```

What you should discover:

- `QSYS` provides a noninteractive comparison state.
- `QSYSOPR` belongs to the declared supplied-profile baseline, but the synthetic state says an interactive password is configured.
- `QCLMSADM` begins with Q but is locally created and absent from CLAIMS400's declared supplied-profile baseline.
- QAUDJRN contains provenance that helps distinguish configuration state from identity legitimacy.

The Q prefix is **data**, not authority and not provenance.

## Optional remediation and reassessment

Switch to the separately authorized operator identity only after documenting the initial state.

```text
CHGUSRPRF USRPRF(QSYSOPR) PASSWORD(*NONE)
DLTUSRPRF USRPRF(QCLMSADM)
ANZSHPRF
DSPJRN JRN(QSYS/QAUDJRN)
```

Then compare the first assessment with the second. The intended evidence chain is:

**initial condition → evidence → conclusion → authorized remediation → state change → new evidence → reassessment**

Do not write “the system is secure.” Write exactly what the evidence now supports.
