# CLAIMS-010 — COSO on the green screen

**Mission:** Can You Map COSO to the Control Atlas?

**Companion article:** [Frameworks: COSO & the IBM i](https://www.linkedin.com/pulse/frameworks-coso-ibm-i-john-flack-dcrne)

## Control claim

The organization asserts **COSO control environment** components (integrity, board oversight, org structure, competence, accountability) are reflected in IBM i evidence and the lab control atlas — not only in a SOX narrative deck.

## Evidence path

| Step | Command | COSO hook |
|------|---------|-----------|
| 1 | `GO WORKSHOP` or `GO AUDIT` option 12 | Facilitator / workshop lane |
| 2 | `WRKCTRL` | Control atlas inventory |
| 3 | `WRKUSRPRF` + `DSPOBJAUT PAYMST` | Control activity evidence |
| 4 | `MAPCTRL FINDING(n) CTRL(LCL-AC-01)` | Map finding to control |
| 5 | `WRKFINDING` | Control environment gap + **decision impact** |
| 6 | `SUBMITMSN` | Export scored workpaper |

## Write a finding about

1. **Control environment gap** — privileged access or object authority not aligned to COSO accountability  
2. **Mapping gap** — finding not tied to a control id in WRKCTRL / MAPCTRL  
3. **Decision impact** — who must act (audit committee, CISO, control owner) and by when
