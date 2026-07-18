# CLAIMS-006 — Profile ownership (Clause 5)

**Mission:** Can You Prove Profile Ownership?

**Sign-on:** `AUDIT` / `TRAIN`

**Lab path from:** ISO 27701 Clause 5 — leadership accountability in user profiles.

## Control claim

Payroll and claims data on CLAIMS400 has **named accountability** in user profiles — not just group membership.

## Copy/paste path

```text
STRMSN MISSION(CLAIMS-006)
WRKUSRPRF
DSPUSRPRF USRPRF(PAYADMIN)
RUNSQL
SELECT * FROM QSYS2.USER_INFO WHERE USER_NAME = 'PAYADMIN'
WRKFINDING
SUBMITMSN
```

Note the **OWNER** field on DSPUSRPRF and **OWNER_PROFILE** in RUNSQL. Use **Decision impact** in WRKFINDING — who must act, and by when?

Coach doc: [training-claims-006.md](../../../docs/training-claims-006.md)
