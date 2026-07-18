# CLAIMS-005 — Blue Team detect & respond

**Mission:** Can You Blue Team IBM i?  
**Sign-on:** `AUDIT` / `TRAIN`

**Lab path from:** [Can You Blue Team an IBM i?](https://www.linkedin.com/pulse/can-you-blue-team-ibm-i-john-flack)

## Control claim

Security operations can **detect and respond** using partition-native evidence:
**Lab path from:** [Can You Blue Team an IBM i?](https://www.linkedin.com/pulse/can-you-blue-team-ibm-i-john-flack-w5bse)
- suspicious active jobs (`WRKACTJOB` — look for **OLDVENDOR** / **VENDORJOB**)
- filtered journal (`DSPAUDJRNE ENTTYP(AF PW)`)
- security audit view (`DSPSECAUD`)
- job log (`DSPJOBLOG`)
- full journal (`DSPJRN`)

## Copy/paste path

```text
STRMSN MISSION(CLAIMS-005)
WRKACTJOB
DSPAUDJRNE ENTTYP(AF PW)
DSPSECAUD
DSPJOBLOG
DSPJRN JRN(QSYS/QAUDJRN)
WRKFINDING
SUBMITMSN
```

Coach doc: [training-claims-005.md](../../../docs/training-claims-005.md)
