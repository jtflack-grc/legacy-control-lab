# IBM i golden screen references

Curated panel text and ASCII captures from **IBM i 7.4 documentation** ([PDF files and manuals](https://www.ibm.com/docs/en/i/7.4.0?topic=information-pdf-files-manuals)), **Redbooks**, **IBM Support**, and community panel captures. Each file is the source of truth for writing `../<screen>.layout.json` specs.

## How to use

1. Open the `.golden.json` for a screen.
2. Copy `requiredText`, `asciiPanel`, and `sources` into a `.layout.json` spec.
3. Set `referenceSource` to the primary IBM URL.
4. Run `npm run screen:layout-audit` (Tier A + B).

## IBM 7.4 manual index (key topics)

| Topic | Manual / collection | Screens |
|-------|---------------------|---------|
| [Disk management](https://www.ibm.com/docs/en/i/7.4.0?topic=management-disk) | Systems Management | WRKDSKSTS |
| [System values](https://www.ibm.com/docs/en/i/7.4.0?topic=management-system-values) | Systems Management | WRKSYSVAL, DSPSYSVAL |
| [Security reference](https://www.ibm.com/docs/en/i/7.4.0?topic=reference-security) | Security | DSPUSRPRF, SECURITY, DSPPRVSSN |
| [TCP/IP setup](https://www.ibm.com/docs/en/i/7.4.0?topic=setup-tcpip) | Networking | CFGTCP, WRKTCPIP |
| [TCP/IP troubleshooting (rzaku PDF)](https://www.ibm.com/docs/en/ssw_ibm_i_73/pdf/rzakupdf.pdf) | Networking | NETSTAT |
| [Work management](https://www.ibm.com/docs/en/i/7.4.0?topic=management-work) | Systems Management | WRKACTJOB, DSPJOB |
| [Spooled files](https://www.ibm.com/docs/en/i/7.4.0?topic=systems-spooled-files) | Files | WRKSPLF |
| [Integrated file system](https://www.ibm.com/docs/en/i/7.4.0?topic=systems-integrated-file-system) | Files | WRKLNK |
| [Journal management](https://www.ibm.com/docs/en/i/7.4.0?topic=management-journal) | Systems Management | DSPJRN |

## Index — all captured screens (46 tier A/B + lab)

### Core audit / mission (original 23)

| Screen | Golden file | Primary source | Layout spec |
|--------|-------------|----------------|-------------|
| SIGNON | `signon.golden.json` | [QDSIGNON2](https://www.ibm.com/support/pages/node/638499) | `signon.layout.json` |
| AUDIT | `audit.golden.json` | Lab mission menu (IBM menu format) | `audit.layout.json` |
| SECURITY | `security.golden.json` | [SecureMyi — GO SECURITY](https://www.securemyi.com/nl/articles/userclass2.html) | `security.layout.json` |
| WRKSYSVAL | `wrksysval.golden.json` | [System values](https://www.ibm.com/docs/en/i/7.4.0?topic=management-system-values) | `wrksysval.layout.json` |
| DSPSYSVAL | `dspsysval.golden.json` | System values guide | `dspsysval.layout.json` |
| WRKUSRPRF | `wrkusrprf.golden.json` | [User profiles](https://www.ibm.com/docs/en/i/7.4.0?topic=profiles-user-profile-parameter-fields) | `wrkusrprf.layout.json` |
| DSPUSRPRF | `dspusrprf.golden.json` | User profile parameter fields | `dspusrprf.layout.json` |
| WRKOBJ | `wrkobj.golden.json` | [WRKOBJ](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/wrkobj.html) | `wrkobj.layout.json` |
| DSPOBJAUT | `dspobjaut.golden.json` | DSPOBJAUT reference | `dspobjaut.layout.json` |
| DSPJRN | `dspjrn.golden.json` | [Journal entries](https://www.ibm.com/docs/en/i/7.4.0?topic=information-displaying-printing-journal-entries) | `dspjrn.layout.json` |
| WRKACTJOB | `wrkactjob.golden.json` | [WRKACTJOB](https://www.ibm.com/docs/en/i/7.4.0?topic=jobs-display-using-wrkactjob) | `wrkactjob.layout.json` |
| DSPJOB | `dspjob.golden.json` | [DSPJOB](https://www.ibm.com/docs/en/i/7.5.0?topic=ssw_ibm_i_75/cl/dspjob.html) | `dspjob.layout.json` |
| WRKSPLF | `wrksplf.golden.json` | Spooled files topic | `wrksplf.layout.json` |
| DSPJOBLOG | `dspjoblog.golden.json` | [DSPJOBLOG](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/dspjoblog.html) | `dspjoblog.layout.json` |
| DSPPRVSSN | `dspprvssn.golden.json` | Security reference — QDSPSGNINF | `dspprvssn.layout.json` |
| WRKLIB | `wrklib.golden.json` | [Libraries](https://www.ibm.com/docs/en/i/7.3.0?topic=libraries-displaying-library-names-contents) | `wrklib.layout.json` |
| DSPLIB | `dsplib.golden.json` | Libraries topic | `dsplib.layout.json` |
| WRKLNK | `wrklnk.golden.json` | [WRKLNK](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/wrklnk.html) | `wrklnk.layout.json` |
| CMDPROMPT | `cmdprompt.golden.json` | [Command prompting](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-using-command-prompt-display) | `cmdprompt.layout.json` |
| WRKDSKSTS | `wrkdsksts.golden.json` | [WRKDSKSTS](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/wrkdsksts.html) | `wrkdsksts.layout.json` |
| WRKSYSSTS | `wrksyssts.golden.json` | [WRKSYSSTS](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/wrksyssts.html) | `wrksyssts.layout.json` |
| NETSTAT | `netstat.golden.json` | [NETSTAT](https://www.ibm.com/docs/en/i/7.4.0?topic=ssw_ibm_i_74/cl/netstat.html) | `netstat.layout.json` |
| WRKTCPIP | `wrktcpip.golden.json` | [TCP/IP setup](https://www.ibm.com/docs/en/i/7.4.0?topic=setup-tcpip) | `wrktcpip.layout.json` |

### Operator / mutation / lab-native (added 2026-06-13)

| Screen | Golden file | Primary source | Layout spec |
|--------|-------------|----------------|-------------|
| DSPJOBATTR | `dspjobattr.golden.json` | [DSPJOBATTR](https://www.ibm.com/docs/en/i/7.5.0?topic=ssw_ibm_i_75/cl/dspjobattr.html) | `dspjobattr.layout.json` |
| SECSTOCK | `secstock.golden.json` | Lab GO SECSTOCK hub | `secstock.layout.json` |
| CHGPWD | `chgpwd.golden.json` | [Password control](https://www.ibm.com/docs/en/i/7.6.0?topic=auditors-password-control) | `chgpwd.layout.json` |
| CHGUSRPRF | `chgusrprf.golden.json` | [CHGUSRPRF](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-change-user-profile-chgusrprf) | `chgusrprf.layout.json` |
| CHGSYSVAL | `chgsysval.golden.json` | [CHGSYSVAL](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-change-system-value-chgsysval) | `chgsysval.layout.json` |
| GRTOBJAUT | `grtobjaut.golden.json` | [GRTOBJAUT](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-grant-object-authority-grtobjaut) | `grtobjaut.layout.json` |
| RVKOBJAUT | `rvkobjaut.golden.json` | [RVKOBJAUT](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-revoke-object-authority-rvkobjaut) | `rvkobjaut.layout.json` |
| DSPEVDDIFF | `dspevddiff.golden.json` | Lab-native evidence diff | `dspevddiff.layout.json` |
| WRKFINDING | `wrkfinding.golden.json` | i on GRC — decision-ready findings | `wrkfinding.layout.json` |
| SUBMITMSN | `submitmsn.golden.json` | Lab-native mission score | `submitmsn.layout.json` |
| QSH | `qsh.golden.json` | [Qshell](https://www.ibm.com/docs/en/i/7.4.0?topic=utilities-qshell) | `qsh.layout.json` |

### i on GRC / article spine (added 2026-06-13)

| Screen | Golden file | Primary source | Layout spec |
|--------|-------------|----------------|-------------|
| ANZPRFACT | `anzprfact.golden.json` | [ANZPRFACT](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-analyze-profile-attributes-anzprfact) + [SecureMyi](https://www.securemyi.com/articles/arttoolbox.html) | `anzprfact.layout.json` |
| CHGACTPRFL | `chgactprfl.golden.json` | [CHGACTPRFL](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-change-activity-profile-list-chgactprfl) | `chgactprfl.layout.json` |
| DSPFD | `dspfd.golden.json` | [DSPFD](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-file-description-dspfd) | `dspfd.layout.json` |
| DSPFFD | `dspffd.golden.json` | DSPFFD reference | `dspffd.layout.json` |
| WRKJOBSCDE | `wrkjobscde.golden.json` | [WRKJOBSCDE](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-work-with-job-schedule-entries-wrkjobscde) | `wrkjobscde.layout.json` |
| WRKAUTL | `wrkautl.golden.json` | [Authority lists](https://www.ibm.com/docs/en/i/7.5.0?topic=commands-authority-lists) | `wrkautl.layout.json` |
| DSPAUTL | `dspautl.golden.json` | [DSPAUTL](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-authorization-list-dspautl) | `dspautl.layout.json` |
| DSPSECAUD | `dspsecaud.golden.json` | [DSPSECAUD](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-security-audit-dspsecaud) | `dspsecaud.layout.json` |
| DSPAUT | `dspaut.golden.json` | [DSPAUT](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-authority-dspaut) | `dspaut.layout.json` |
| WRKOBJOWN | `wrkobjown.golden.json` | [Object ownership](https://www.ibm.com/docs/en/i/7.5.0?topic=authority-working-object-ownership) | `wrkobjown.layout.json` |
| EDTAUTL | `edtautl.golden.json` | [Authority lists — EDTAUTL](https://www.ibm.com/support/pages/creating-and-assigning-authorization-list) | `edtautl.layout.json` |
| EDTOBJAUT | `edtobjaut.golden.json` | [EDTOBJAUT](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-edit-object-authority-edtobjaut) | `edtobjaut.layout.json` |
| DSPNETA | `dspneta.golden.json` | [DSPNETA](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-network-attributes-dspneta) | `dspneta.layout.json` |
| DSPAUDJRNE | `dspaudjrne.golden.json` | [DSPAUDJRNE](https://www.ibm.com/docs/en/i/7.4.0?topic=commands-display-audit-journal-entries-dspaudjrne) | `dspaudjrne.layout.json` |

Regenerate missing goldens: `npx tsx scripts/seed-missing-goldens.ts` (idempotent overwrite).

## QMGTOOLS cross-reference (support vs audit)

QMGTOOLS is IBM Support diagnostic tooling — **not** a compliance product. See [docs/qmgtools-audit-fidelity.md](../../docs/qmgtools-audit-fidelity.md).

| Lab golden | QMGTOOLS touchpoint | Distinction |
|------------|---------------------|-------------|
| WRKPTFGRP, DSPPTF | PTF menu CMPGRPPTF; COLESADTA prints DSPPTF | Lab = interactive ITGC evidence |
| WRKJOBSCDE | COLESADTA scheduler export | Lab = scheduled job review |
| WRKOBJOWN | SCTMNU RTVOBJLST (MG→22→7) | Lab = ownership subfile |
| DSPJRN, DSPAUDJRNE | QAS9AUDLOG in COLESADTA only | QAUDJRN ≠ ESA audit log |
| WRKACTJOB, DSPJOBLOG | Current joblog in COLESADTA | Live triage vs support bundle |

Golden files may include `auditNotes`, `grcMapping`, `qmgtoolsRelation`, and `entryTypes` (journal screens). Regenerate: `npm run enrich:golden-audit`.

## 5250 color roles (terminal fidelity)

| Role | Attribute | Color | Used for |
|------|-----------|-------|----------|
| Screen header | `0x22` | White (HI) | Row 1: command, title, system name |
| Sign-on title | `0x22` | White (HI) | QDSIGNON centered **Sign On** (row 1) |
| Sign-on footer | `0x22` | White (HI) | **(C) COPYRIGHT LCL IONGRC. 1974, 2026.** (row 24) |
| Column header | `0x22` | White | Subfile column titles |
| Banner / status | `0x22` | White | WRKACTJOB CPU line, WRKDSKSTS elapsed time |
| Option prompt | `0x3a` | Blue | “Type options, press Enter” on work-with panels |
| Labels / data | `0x20` | Green | Option hints, subfile rows, detail values |
| Input / options | `0x20` | Green | Opt columns, command line, sign-on fields |
| Errors | `0x28` | Red | Sign-on errors, menu messages |

Implemented in `src/screen-runtime/ibm5250Attributes.ts` and applied via `ibmScreenHeader`, `ibmColumnHeader`, `ibmBannerField`, `ibmErrorField` in `screenHelpers.ts`. IronTerm/GDS wire format uses the same attribute bytes.

## Source tiers

| Tier | Meaning |
|------|---------|
| `ibm-documentation` | IBM Docs 7.4 command/topic reference |
| `redbook` | IBM Redbooks / performance guides |
| `panel-capture` | Community ASCII panel (setgetweb, MC Press, IT Jungle) |
| `lab-spec` | Synthetic lab screen — documented divergence |

**2026-06-13 doc-mining pass:** tier **A** goldens enriched with `asciiPanel` from IBM Docs CL pages (`/ssw_ibm_i_74/cl/*.html`), [system values](https://www.ibm.com/docs/en/i/7.4.0?topic=management-system-values), [TCP/IP setup](https://www.ibm.com/docs/en/i/7.4.0?topic=setup-tcpip), F4 command-prompt pattern (`cmdprompt.golden.json`), and community refs (setgetweb, MC Press) for WRKOBJ, DSPOBJAUT, DSPMSG, WRKSYSVAL, DSPSYSVAL.

## Lab divergences (documented)

- **SECSTOCK** — lab GO SECSTOCK training hub (renumbered SECURITY paths); stock GO SECURITY has different option map.
- **DSPEVDDIFF / WRKFINDING / SUBMITMSN** — lab-native evidence workflow (no stock IBM command).
- **QMGTOOLS** — not implemented; documented in `docs/qmgtools-audit-fidelity.md` as IBM Support tooling only.
