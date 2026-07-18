# CLAIMS-002 — Offboarding & dormant access

**Mission:** Can You Prove Offboarding Hygiene?  
**Persona:** IT auditor / GRC analyst (+ QSECOFR for remediation lane)  
**Sign-on:** `AUDIT` / `TRAIN` (investigate) · `QSECOFR` / `TRAIN` (remediate)

**Lab path from:** [IBM i Offboarding: Profiles You Didn't Revoke](https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie)

## Control claim under review

The control owner states that contractor and vendor access on **CLAIMS400** is:

- revoked within **90 days** of departure
- reviewed on a **scheduled** inactive-profile cadence
- traceable with **audit receipts** when profiles are disabled

Your job is to inspect dormant accounts—especially **OLDVENDOR**—and decide whether offboarding is defensible.

## Auditor lane (AUDIT)

| Step | Action | What to look for |
| --- | --- | --- |
| 1 | Menu **9** or `DSPMISSION` | Mission briefing |
| 2 | Menu **2** or `WRKUSRPRF` | **OLDVENDOR** still *ENABLED, last sign-on **01/17/23** |
| 3 | `DSPUSRPRF USRPRF(OLDVENDOR)` | Former vendor text, *JOBCTL, no owner |
| 4 | Optional: `DSPUSRPRF USRPRF(*ALL) TYPE(*BASIC) OUTPUT(*OUTFILE) OUTFILE(QGPL/USERS)` | Audit-ready profile export (lab message) |
| 5 | `DSPJRN JRN(QSYS/QAUDJRN)` | Prior AF/UA activity on vendor IDs |
| 6 | Menu **8** `WRKFINDING` | Dormant vendor / TPRM offboarding gap |
| 7 | Menu **10** `DSPEVID` | Required evidence checked |
| 8 | Menu **11** `SUBMITMSN` | Score and report |

## Operator lane (QSECOFR) — optional remediation demo

Sign off, then sign on **`QSECOFR` / `TRAIN`**:

```text
ANZPRFACT INACT(90)
CHGACTPRFL USRPRF(BACKUPADM) STATUS(*ACTIVE)
CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)
DSPJRN JRN(QSYS/QAUDJRN)
```

**Narrative:** QSECOFR runs the inactive sweep, exempts a justified privileged ID, disables the vendor ghost, and leaves journal evidence the auditor can cite.

## Sample findings

1. **OLDVENDOR** — enabled 900+ days after last sign-on; no TPRM offboarding ticket  
2. **BACKUPADM** — stale privileged profile without named owner or CHGACTPRFL exemption  
3. **No ANZPRFACT cadence** — inactive sweep not scheduled or evidenced  
4. **MSP disconnect** — vendor contract ended but IBM i profile never revoked (A.15.2.2)

## Framework mapping

| Framework | Control |
| --- | --- |
| ISO 27001 | A.9.2.5 review of access rights · A.9.2.6 removal of access · A.15.2.2 supplier return of assets |
| NIST 800-53 | AC-2(3) disable inactive accounts |
| COBIT | BAI09.02 manage identity lifecycle |
