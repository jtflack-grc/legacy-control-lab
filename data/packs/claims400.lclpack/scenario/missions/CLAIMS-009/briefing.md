# CLAIMS-009 — Black Swan on the green screen

**Mission:** Can You See Tail Risk on the Green Screen?

**Companion essay:** Black Swan, Green Screen (i on GRC — Jun 2026)

## Control claim

Leadership asserts the partition is **stable** because interactive uptime looks fine. Your job is to prove whether **batch tail risk** — held jobs, failed night runs, vendor batch work, and unread operator messages — is visible on IBM i before it becomes an incident.

## Evidence path

| Step | Command | Availability hook |
|------|---------|-------------------|
| 1 | `WRKSBMJOB` → option 5 on **NIGHTRUN** / **BACKUPJOB** | Submitted batch queue |
| 2 | `DSPJOB` (from WRKSBMJOB option 5) | Job status / failure detail |
| 3 | `WRKACTJOB` | **OLDVENDOR/VENDORJOB** still running on QBATCH |
| 4 | `WRKSYSSTS` | CPU/ASP metrics vs jobs held/waiting |
| 5 | `DSPMSG MSGQ(QSYSOPR)` | Operator messages about failed batch |
| 6 | `DSPJOBLOG` | Command-level failure trace |
| 7 | `WRKFINDING` | Tail-risk gap + **decision impact** |
| 8 | `SUBMITMSN` | Export scored workpaper |

## Write a finding about

1. **Batch tail risk** — NIGHTRUN failed or BACKUPJOB held while leadership claims stability  
2. **Uptime myth** — WRKSYSSTS looks healthy but batch/operator signals say otherwise  
3. **Decision impact** — who must act (operations director, CIO, on-call lead) and by when
