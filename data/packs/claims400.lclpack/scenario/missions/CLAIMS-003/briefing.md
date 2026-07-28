# CLAIMS-003 — Operational privacy on IBM i

**Mission:** Can You Prove Privacy Operations?  
**Persona:** IT auditor / GRC analyst  
**Sign-on:** `AUDIT` / `TRAIN`

**Lab path from:** [i on GRC: ISO 27701, Clause 8 & the IBM i](https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia)

## Control claim under review

The control owner states that **employee payroll data** on **CLAIMS400** is:

- restricted through **object authority** and authorization lists
- identifiable at the **file/field** level (SSN and pay rate on PAYROLL/PAYMST)
- processed only through **approved batch jobs** with reviewable logs
- not silently exported through **IFS integration paths** without governance

Your job is to walk the green-screen evidence chain the Clause 8 article describes — not a dashboard, the partition.

## Auditor lane (AUDIT)

| Step | Action | What to look for |
| --- | --- | --- |
| 1 | `DSPOBJAUT OBJ(PAYROLL/PAYMST) OBJTYPE(*FILE)` | Public authority on PII file |
| 2 | `DSPFD FILE(PAYROLL/PAYMST)` | Record format, **SSN** field in layout |
| 3 | `WRKJOBSCDE` → option 5 on **PAYROLLNGT** / **PAYIFSEXP** | Batch touching payroll |
| 4 | `WRKLNK OBJ('/payroll')` | Symlink **paymst.sym** to native file |
| 5 | `DSPJRN JRN(QSYS/QAUDJRN)` | Access to sensitive objects |
| 6 | Optional: `WRKAUTL` → option 5 **PAYROLL** | Authorization list membership |
| 7 | Menu **8** `WRKFINDING` | “Processing continues because it always has” |
| 8 | Menu **11** `SUBMITMSN` | Score and report |

## Sample findings

1. **PAYMST public authority** — excessive *CHANGE on payroll master with SSN column  
2. **Batch without privacy narrative** — PAYIFSEXP scheduled with no data-owner sign-off  
3. **IFS symlink exposure** — `/payroll/paymst.sym` bridges DB2 file to integration path  
4. **Journal ≠ review** — AF/UA events exist but no proof of privacy monitoring

## Framework mapping

| Framework | Control |
| --- | --- |
| ISO 27701 | Clause 8 — operational privacy controls |
| ISO 27001 | A.8.2.3 handling of assets · A.12.4 logging |

Coach doc: [training-claims-003.md](../../../docs/training-claims-003.md)
