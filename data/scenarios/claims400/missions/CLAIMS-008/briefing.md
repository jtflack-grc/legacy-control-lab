# CLAIMS-008 — SOC 2 on the green screen

**Mission:** Can You Map SOC 2 to the Green Screen?

**Companion article:** [SOC 2 & the IBM i](https://www.linkedin.com/pulse/soc-2-ibm-i-john-flack-0bj8e)

## Control claim

The organization asserts SOC 2 **CC6** (logical access) and **CC7** (monitoring) are supported by IBM i evidence — not only by a system description PDF.

## Evidence path

| Step | Command | SOC 2 hook |
|------|---------|------------|
| 1 | `WRKUSRPRF` → `DSPUSRPRF BACKUPADM` | CC6 — privileged access |
| 2 | `DSPOBJAUT OBJ(PAYROLL/PAYMST)` | CC6 — sensitive object authority |
| 3 | `DSPSYSVAL SYSVAL(QAUDCTL)` or `DSPSECAUD` | CC7 — monitoring configuration |
| 4 | `DSPJRN` / `DSPAUDJRNE` | CC7 — security event review |
| 5 | `WRKACTJOB` or `DSPJOBLOG` | CC7 — detect / respond |
| 6 | `WRKFINDING` | Map CC6/CC7 gaps + **decision impact** |
| 7 | `SUBMITMSN` | Export scored workpaper |

## Write a finding about

1. **CC6 gap** — dormant or over-privileged profiles still enabled  
2. **CC7 gap** — audit journal exists but no evidence of review or response  
3. **Decision impact** — who must act (CISO, IT director, audit committee) and by when
