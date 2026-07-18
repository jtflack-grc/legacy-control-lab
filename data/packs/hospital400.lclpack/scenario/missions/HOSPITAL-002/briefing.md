# HOSPITAL-002 — Operational privacy (Clause 8)

**Mission:** Can You Prove Hospital Privacy Operations?

**Lab path from:** [ISO 27701 Clause 8](https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia) — same evidence chain as CLAIMS-003, on **HOSPITAL400**.

## Evidence path

| Step | Command | Evidence |
|------|---------|----------|
| 1 | `DSPOBJAUT OBJ(PAYROLL/PAYMST)` | Object authority on PHI file |
| 2 | `DSPFD FILE(PAYROLL/PAYMST)` | SSN / field layout |
| 3 | `WRKJOBSCDE` → **PAYIFSEXP** | Batch touching payroll |
| 4 | `WRKLNK OBJ('/payroll')` | IFS symlink `paymst.sym` |
| 5 | `DSPJRN JRN(QSYS/QAUDJRN)` | Access monitoring |
| 6 | `WRKFINDING` | Decision impact required |
| 7 | `SUBMITMSN` | Scored workpaper |

## Write a finding about

Operational privacy on a hospital partition — not just “we have a policy.”
