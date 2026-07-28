# CLAIMS-004 — Privacy risk planning (Clause 6)

**Mission:** Can You Prove Privacy Risk Planning?  
**Sign-on:** `AUDIT` / `TRAIN`

**Lab path from:** [i on GRC: ISO 27701, Clause 6 & the IBM i](https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-6-the-ibm-i-activity-7438270345012248576-TDQI)

## Control claim

Privacy risks on CLAIMS400 are **planned and measurable** through:

- authorization lists (`WRKAUTL` / `DSPAUTL`)
- profile-level authorities (`DSPAUT` from `WRKUSRPRF` option 8)
- security audit configuration (`DSPSECAUD`, `DSPAUDJRNE`)
- journal review (`DSPJRN`)

## Copy/paste path

```text
STRMSN MISSION(CLAIMS-004)
WRKAUTL
DSPAUTL AUTL(PAYROLL)
DSPAUT USER(BACKUPADM)
DSPSECAUD
DSPAUDJRNE ENTTYP(AF)
DSPJRN JRN(QSYS/QAUDJRN)
WRKFINDING
SUBMITMSN
```

Coach doc: [training-claims-004.md](../../../docs/training-claims-004.md)
