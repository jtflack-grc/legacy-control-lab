import type { CatalogCommandDefinition } from "./commandTypes.js";

/** Curated IBM i and lab-native command metadata — merged into catalog at load time. */
export const COMMAND_ENRICHMENT: Record<
  string,
  Partial<CatalogCommandDefinition> & {
    parameterLabels?: Record<string, string>;
    supportsSpecialValues?: Record<string, string[]>;
  }
> = {
  CHGUSRPRF: {
    helpText:
      "Changes selected attributes of a user profile in the lab runtime. Use to enable/disable accounts or review privileged profile posture during missions.",
    secondLevelHelp:
      "On IBM i, CHGUSRPRF changes profile attributes such as status, password, and special authorities. This lab implements a subset for governance training.",
    examples: ["CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)", "CHGUSRPRF USRPRF(BACKUPADM) LMTCPB(*YES)"],
    realismLimits: "Subset of profile attributes modeled. No real password policy enforcement.",
    mutatesState: true,
    groupMenu: "CMDUSR",
    parameterLabels: { USRPRF: "User profile", STATUS: "Status", PASSWORD: "Password" },
    supportsSpecialValues: { STATUS: ["*ENABLED", "*DISABLED"] },
  },
  CRTUSRPRF: {
    helpText: "Creates a synthetic user profile for lab investigation and remediation exercises.",
    examples: ["CRTUSRPRF USRPRF(TRAINER01) PASSWORD(TRAINING)"],
    mutatesState: true,
    groupMenu: "CMDUSR",
    parameterLabels: { USRPRF: "User profile", PASSWORD: "Password" },
  },
  DLTUSRPRF: {
    helpText: "Deletes a synthetic user profile created during the current lab attempt.",
    examples: ["DLTUSRPRF USRPRF(TRAINER01)"],
    mutatesState: true,
    groupMenu: "CMDUSR",
    parameterLabels: { USRPRF: "User profile" },
  },
  DSPUSRPRF: {
    helpText:
      "Displays user profile attributes including status, special authorities, data owner, last sign-on, and initial menu. Primary evidence source for privileged access reviews. OUTPUT(*OUTFILE) writes SQLite-backed rows to QGPL/USERS (query via qsys2.outfile_export).",
    examples: [
      "DSPUSRPRF USRPRF(BACKUPADM)",
      "DSPUSRPRF USRPRF(PAYADMIN)",
      "DSPUSRPRF USRPRF(*ALL) TYPE(*BASIC) OUTPUT(*OUTFILE) OUTFILE(QGPL/USERS)",
    ],
    groupMenu: "CMDUSR",
    parameterLabels: { USRPRF: "User profile" },
    relatedCommands: ["WRKUSRPRF", "DSPAUT", "DSPJRN"],
  },
  WRKUSRPRF: {
    helpText: "Work with user profiles. Option 5 displays detail; option 8 shows object authority for the profile.",
    examples: ["WRKUSRPRF"],
    groupMenu: "CMDUSR",
  },
  CHGSYSVAL: {
    helpText: "Changes a system value in the synthetic runtime. Generates audit and state-diff evidence.",
    examples: ["CHGSYSVAL SYSVAL(QMAXSIGN) VALUE(5)", "CHGSYSVAL SYSVAL(QSECURITY) VALUE(40)"],
    mutatesState: true,
    groupMenu: "CMDSYS",
    parameterLabels: { SYSVAL: "System value", VALUE: "Value" },
  },
  DSPSYSVAL: {
    helpText: "Displays a system value such as QSECURITY or QMAXSIGN. Configuration evidence, not a control conclusion.",
    examples: ["DSPSYSVAL SYSVAL(QSECURITY)", "DSPSYSVAL SYSVAL(QAUDCTL)"],
    groupMenu: "CMDSYS",
    parameterLabels: { SYSVAL: "System value" },
  },
  WRKSYSVAL: {
    helpText: "Work with system values. Option 5 displays detail for a selected value.",
    examples: ["WRKSYSVAL"],
    groupMenu: "CMDSYS",
  },
  DSPOBJAUT: {
    helpText: "Displays public and private authority for an object. Key evidence for excessive authority findings.",
    examples: ["DSPOBJAUT OBJ(PAYROLL/PAYMST)", "DSPOBJAUT OBJ(PAYROLL/PAYMST) USER(BACKUPADM)"],
    groupMenu: "CMDAUT",
    parameterLabels: { OBJ: "Object", USER: "User" },
  },
  GRTOBJAUT: {
    helpText: "Grants object authority to a user in the lab runtime.",
    examples: ["GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)"],
    mutatesState: true,
    groupMenu: "CMDAUT",
  },
  RVKOBJAUT: {
    helpText: "Revokes object authority from a user in the lab runtime.",
    examples: ["RVKOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)"],
    mutatesState: true,
    groupMenu: "CMDAUT",
  },
  DSPAUT: {
    helpText: "Displays special authorities held by a user profile.",
    examples: ["DSPAUT USER(BACKUPADM)"],
    groupMenu: "CMDAUT",
    parameterLabels: { USER: "User profile" },
  },
  DSPJRN: {
    helpText: "Displays audit journal entries filtered by entry type. Shows synthetic PW/AF/CP style events.",
    examples: ["DSPJRN JRN(QSYS/QAUDJRN) ENTTYP(PW AF CP)"],
    groupMenu: "CMDJRN",
    parameterLabels: { JRN: "Journal", ENTTYP: "Entry types" },
  },
  DSPJOBLOG: {
    helpText: "Displays job log messages for interactive or batch jobs in the scenario.",
    examples: ["DSPJOBLOG", "DSPJOBLOG JOB(123456/AUDIT/QPADEV0001)"],
    groupMenu: "CMDJOB",
  },
  WRKACTJOB: {
    helpText: "Work with active jobs. Option 5 displays job detail.",
    examples: ["WRKACTJOB"],
    groupMenu: "CMDJOB",
  },
  WRKSPLF: {
    helpText: "Work with spooled files owned by scenario users. Option 4 displays spool file detail.",
    examples: ["WRKSPLF"],
    groupMenu: "CMDSPL",
  },
  RUNSQL: {
    helpText:
      "Runs a read-only SQL statement against QSYS2-style views mapped to the scenario database. Primary path for tabular evidence export.",
    examples: [
      "RUNSQL SQL('select user_name, status from qsys2.user_info')",
      "RUNSQL SQL('select name, current_value from qsys2.system_value_info')",
    ],
    groupMenu: "CMDSQL",
    parameterLabels: { SQL: "SQL statement" },
  },
  WRKSQLSVC: {
    helpText: "Browse QSYS2-style SQL service views available in the lab and launch sample RUNSQL queries.",
    examples: ["WRKSQLSVC"],
    groupMenu: "CMDSQL",
  },
  DSPCMDHLP: {
    helpText: "Displays command help from the catalog including purpose, parameters, examples, and realism limits.",
    examples: ["DSPCMDHLP CMD(DSPOBJAUT)", "DSPCMDHLP CMD(CHGUSRPRF)"],
    groupMenu: "CMDLAB",
    parameterLabels: { CMD: "Command name" },
  },
  DSPMSGHLP: {
    helpText: "Displays second-level help for CPF, CPI, and LCL messages returned by the lab runtime.",
    examples: ["DSPMSGHLP MSGID(LCL0901)", "DSPMSGHLP MSGID(CPF0001)"],
    groupMenu: "CMDLAB",
    parameterLabels: { MSGID: "Message identifier" },
  },
  DSPCMDCOV: {
    helpText: "Displays command catalog coverage by category, tier, and implementation status.",
    examples: ["DSPCMDCOV"],
    groupMenu: "CMDLAB",
  },
  DSPCMDHST: {
    helpText: "Displays recent commands entered during the current interactive session.",
    examples: ["DSPCMDHST"],
    groupMenu: "CMDLAB",
  },
  WRKRANGE: {
    helpText: "Work with systems in the Legacy Control Lab range. Select CLAIMS400, COUNTY400, or HOSPITAL400.",
    examples: ["WRKRANGE", "GO RANGE"],
    groupMenu: "CMDLAB",
  },
  WRKCMPGN: {
    helpText: "Work with governance campaigns and track mission completion across systems.",
    examples: ["WRKCMPGN"],
    groupMenu: "CMDLAB",
  },
  SUBMITMSN: {
    helpText: "Submits the current mission attempt for scoring and exports Markdown/JSON reports plus evidence packet.",
    examples: ["SUBMITMSN"],
    groupMenu: "CMDLAB",
  },
  RESETLAB: {
    helpText: "Resets the current mission attempt and restores scenario baseline state for the active system.",
    examples: ["RESETLAB CONFIRM(*YES)"],
    mutatesState: true,
    groupMenu: "CMDLAB",
  },
  DSPEVDDIFF: {
    helpText: "Displays state changes made during the current attempt across profiles, authorities, and system values.",
    examples: ["DSPEVDDIFF TYPE(*ALL)", "DSPEVDDIFF TYPE(*USRPRF)"],
    groupMenu: "CMDLAB",
  },
  MAPCTRL: {
    helpText: "Maps a governance control identifier to a finding recorded in the current mission attempt.",
    examples: ["MAPCTRL FINDING(1) CTRL(LCL-AC-02)"],
    groupMenu: "CMDLAB",
    parameterLabels: { FINDING: "Finding number", CTRL: "Control id" },
  },
  GENRPT: {
    helpText: "Generates campaign or executive summary reports to data/reports/.",
    examples: ["GENRPT TYPE(*CAMPAIGN)", "GENRPT TYPE(*EXEC)"],
    groupMenu: "CMDLAB",
    parameterLabels: { TYPE: "Report type" },
  },
  GO: {
    helpText: "Navigate to a menu or command group. Use GO CMDSEC, GO CMDJOB, GO RANGE, GO WORKSHOP, or GO AUDIT.",
    examples: ["GO AUDIT", "GO CMDSEC", "GO CMDJOB", "GO RANGE", "GO WORKSHOP"],
    groupMenu: "CMDLAB",
    parameterLabels: { MENU: "Menu or command group" },
  },
  ADDLIBLE: {
    helpText: "Adds a library to the user portion of the library list for the current session.",
    examples: ["ADDLIBLE LIB(CLAIMS400)", "ADDLIBLE LIB(PAYROLL) POSITION(*LAST)"],
    mutatesState: true,
    groupMenu: "CMDLIB",
    parameterLabels: { LIB: "Library", POSITION: "Position" },
  },
  RMVLIBLE: {
    helpText: "Removes a library from the user portion of the library list.",
    examples: ["RMVLIBLE LIB(CLAIMS400)"],
    mutatesState: true,
    groupMenu: "CMDLIB",
    parameterLabels: { LIB: "Library" },
  },
  DSPLIBL: {
    helpText: "Displays the current library list including system, product, and user libraries.",
    examples: ["DSPLIBL"],
    groupMenu: "CMDLIB",
  },
  EDTLIBL: {
    helpText: "Opens the library list editor subfile to add or remove user libraries interactively.",
    examples: ["EDTLIBL"],
    groupMenu: "CMDLIB",
  },
  DSPOBJD: {
    helpText: "Displays object description including type, attribute, owner, and create date.",
    examples: ["DSPOBJD OBJ(PAYROLL/PAYMST)", "DSPOBJD OBJ(QSYS/QAUDJRN)"],
    groupMenu: "CMDOBJ",
    parameterLabels: { OBJ: "Object" },
  },
  WRKOBJ: {
    helpText: "Work with objects in a library. Option 5 displays object description; option 8 shows authority.",
    examples: ["WRKOBJ OBJ(PAYROLL/*ALL)", "WRKOBJ OBJ(QSYS/*ALL)"],
    groupMenu: "CMDOBJ",
    parameterLabels: { OBJ: "Object" },
  },
  CHGAUT: {
    helpText: "Changes data authority for an IFS object path in the lab runtime.",
    examples: ["CHGAUT OBJ('/claims/claimmst.sym') DTAAUT(*RX)"],
    mutatesState: true,
    groupMenu: "CMDIFS",
    parameterLabels: { OBJ: "Object path", DTAAUT: "Data authority" },
  },
  EDTOBJAUT: {
    helpText:
      "Opens the object authority editor for a library object. LMTCPB(*YES) profiles receive CPF9902 before the panel opens — Red Team boundary evidence.",
    examples: ["EDTOBJAUT OBJ(PAYROLL/PAYMST)"],
    groupMenu: "CMDAUT",
    parameterLabels: { OBJ: "Object" },
  },
  WRKAUT: {
    helpText: "Work with special authorities assigned to user profiles in the scenario.",
    examples: ["WRKAUT"],
    groupMenu: "CMDAUT",
  },
  STRSQL: {
    helpText: "Starts the interactive SQL session screen. Equivalent entry point to RUNSQL for ad hoc queries.",
    examples: ["STRSQL"],
    groupMenu: "CMDSQL",
  },
  DSPSPLF: {
    helpText: "Displays attributes of a spooled file such as user, create date, and output queue.",
    examples: ["DSPSPLF FILE(QAUDRPT)"],
    groupMenu: "CMDSPL",
    parameterLabels: { FILE: "Spooled file" },
  },
  HLDSPLE: {
    helpText: "Places a spooled file on hold so it will not print until released.",
    examples: ["HLDSPLE FILE(QAUDRPT)"],
    mutatesState: true,
    groupMenu: "CMDSPL",
    parameterLabels: { FILE: "Spooled file" },
  },
  RLSSPLF: {
    helpText: "Releases a held spooled file back to the ready-to-print state.",
    examples: ["RLSSPLF FILE(QAUDRPT)"],
    mutatesState: true,
    groupMenu: "CMDSPL",
    parameterLabels: { FILE: "Spooled file" },
  },
  DLTSPLF: {
    helpText: "Deletes a spooled file from the output queue in the lab runtime.",
    examples: ["DLTSPLF FILE(QAUDRPT)"],
    mutatesState: true,
    groupMenu: "CMDSPL",
    parameterLabels: { FILE: "Spooled file" },
  },
  WRKOUTQ: {
    helpText: "Work with output queues and spooled files waiting to print.",
    examples: ["WRKOUTQ"],
    groupMenu: "CMDSPL",
  },
  DSPPGM: {
    helpText: "Displays program attributes including source file, create date, and user profile.",
    examples: ["DSPPGM PGM(PAYROLL/PAYCALC)"],
    groupMenu: "CMDPDM",
    parameterLabels: { PGM: "Program" },
  },
  DSPPGMREF: {
    helpText: "Displays programs called by or calling a program. Useful for dependency and change-impact review.",
    examples: ["DSPPGMREF PGM(CLAIMS400/PAYAUTHR)"],
    groupMenu: "CMDPDM",
    parameterLabels: { PGM: "Program" },
  },
  STRPDM: {
    helpText: "Starts Programming Development Manager for a library. Entry to member and object PDM screens.",
    examples: ["STRPDM LIB(CLAIMS400)"],
    groupMenu: "CMDPDM",
    parameterLabels: { LIB: "Library" },
  },
  WRKMBRPDM: {
    helpText: "Work with source file members using PDM. Option 5 displays member detail.",
    examples: ["WRKMBRPDM FILE(CLAIMS400/QCLSRC)"],
    groupMenu: "CMDPDM",
    parameterLabels: { FILE: "Source file" },
  },
  WRKOBJPDM: {
    helpText: "Work with objects in a library using PDM. Option 5 displays object description.",
    examples: ["WRKOBJPDM LIB(PAYROLL)"],
    groupMenu: "CMDPDM",
    parameterLabels: { LIB: "Library" },
  },
  ANZDFTPWD: {
    helpText: "Analyzes user profiles that still use default passwords. Security hygiene evidence command.",
    examples: ["ANZDFTPWD"],
    groupMenu: "CMDSEC",
  },
  ANZPRFACT: {
    helpText: "Analyzes profile attributes or lists dormant accounts when INACT(n) is specified.",
    examples: ["ANZPRFACT", "ANZPRFACT INACT(90)"],
    groupMenu: "CMDSEC",
  },
  CHGACTPRFL: {
    helpText: "Exempts a profile from inactive-account disable sweeps (STATUS *ACTIVE).",
    examples: ["CHGACTPRFL USRPRF(BACKUPADM) STATUS(*ACTIVE)"],
    groupMenu: "CMDSEC",
  },
  DSPSECA: {
    helpText: "Displays system security attributes including QSECURITY level and audit settings summary.",
    examples: ["DSPSECA"],
    groupMenu: "CMDSEC",
  },
  SIGNOFF: {
    helpText: "Ends the current interactive session and returns to the sign-on screen.",
    examples: ["SIGNOFF"],
    groupMenu: "CMDSEC",
  },
  DSPPTF: {
    helpText: "Displays PTF (program temporary fix) information for the synthetic system image.",
    examples: ["DSPPTF PTF(SI12345)"],
    groupMenu: "CMDPTF",
    parameterLabels: { PTF: "PTF identifier" },
  },
  WRKLICINF: {
    helpText: "Work with licensed program information installed on the lab partition.",
    examples: ["WRKLICINF"],
    groupMenu: "CMDPTF",
  },
  WRKPRD: {
    helpText: "Work with licensed products and option levels on the system.",
    examples: ["WRKPRD"],
    groupMenu: "CMDPTF",
  },
  WRKPTFGRP: {
    helpText: "Work with PTF groups and cumulative fix levels installed on the synthetic system image.",
    examples: ["WRKPTFGRP"],
    groupMenu: "CMDPTF",
  },
  DSPLOG: {
    helpText: "Displays history log messages including security and application events.",
    examples: ["DSPLOG"],
    groupMenu: "CMDMSG",
  },
  DSPMSG: {
    helpText: "Displays messages in a message queue. Use for operator and batch diagnostic review.",
    examples: ["DSPMSG MSGQ(QSYSOPR)", "DSPMSG MSGQ(QSYS/QSYSOPR)"],
    groupMenu: "CMDMSG",
    parameterLabels: { MSGQ: "Message queue" },
  },
  WRKMSGQ: {
    helpText: "Work with message queues defined in the scenario.",
    examples: ["WRKMSGQ"],
    groupMenu: "CMDMSG",
  },
  DSPAUDJRNE: {
    helpText: "Displays audit journal entries by entry type (AF, PW, CP, etc.). Primary security audit evidence.",
    examples: ["DSPAUDJRNE ENTTYP(AF)", "DSPAUDJRNE ENTTYP(PW CP)"],
    groupMenu: "CMDJRN",
    parameterLabels: { ENTTYP: "Entry types" },
    relatedCommands: ["CPYAUDJRNE", "DSPJRN", "WRKACTJOB"],
  },
  CPYAUDJRNE: {
    helpText:
      "Copies filtered QAUDJRN entries to an output file for repeatable monitoring extracts (COSO/CC7). OUTFILE writes SQLite-backed rows queryable via qsys2.outfile_export.",
    examples: [
      "CPYAUDJRNE ENTTYP(AF PW) OUTFILE(QGPL/AUDJRN)",
      "CPYAUDJRNE ENTTYP(AF) OUTFILE(QGPL/AUDJRN) OUTMBR(AUDJRN)",
    ],
    groupMenu: "CMDJRN",
    parameterLabels: { ENTTYP: "Entry types", OUTFILE: "Output file", OUTMBR: "Output member" },
    relatedCommands: ["DSPAUDJRNE", "DSPJRN", "RUNSQL"],
  },
  DSPSECAUD: {
    helpText: "Displays security audit configuration and recent security-relevant journal summary.",
    examples: ["DSPSECAUD"],
    groupMenu: "CMDJRN",
  },
  WRKJRN: {
    helpText: "Work with journals attached to libraries or objects in the scenario.",
    examples: ["WRKJRN"],
    groupMenu: "CMDJRN",
  },
  WRKJRNA: {
    helpText: "Work with journal attributes and receivers for audit journals.",
    examples: ["WRKJRNA"],
    groupMenu: "CMDJRN",
  },
  DSPLNK: {
    helpText: "Displays an integrated file system object link or stream file path.",
    examples: ["DSPLNK OBJ('/claims/claimmst.sym')"],
    groupMenu: "CMDIFS",
    parameterLabels: { OBJ: "Object path" },
  },
  WRKLNK: {
    helpText: "Work with object links under an IFS path. Option 5 displays link detail.",
    examples: ["WRKLNK OBJ('/claims')"],
    groupMenu: "CMDIFS",
    parameterLabels: { OBJ: "Directory path" },
  },
  STRQSH: {
    realismLimits: "PASE bridge: POSIX via Git Bash; IBM utilities system/getjobid/setccsid/dspcat/dspmsg/attr/clrtmp.",
    helpText:
      "Start an interactive Qshell session. Lab PASE maps /QOpenSys to Linux in Docker; use ls, pwd, ps, cat, grep, and system for CL.",
    examples: ["STRQSH", "STRQSH CMD('pwd')", "STRQSH CMD('ls -l /home')"],
    groupMenu: "CMDIFS",
    parameterLabels: { CMD: "Qshell command" },
  },
  QSH: {
    helpText: "Run a Qshell command script in the lab PASE/Linux bridge.",
    examples: ["QSH CMD('pwd')", "QSH CMD('ps -ef | head')", "QSH CMD('system WRKACTJOB')"],
    groupMenu: "CMDIFS",
    parameterLabels: { CMD: "Qshell command" },
  },
  DSPJOB: {
    helpText: "Displays job attributes for the current job or a specified job name.",
    examples: ["DSPJOB", "DSPJOB JOB(123456/AUDIT/QPADEV0001)"],
    groupMenu: "CMDJOB",
    parameterLabels: { JOB: "Job" },
  },
  WRKJOBQ: {
    helpText: "Work with job queues and jobs waiting to run in the active subsystem.",
    examples: ["WRKJOBQ"],
    groupMenu: "CMDJOB",
  },
  WRKSBMJOB: {
    helpText: "Work with submitted batch jobs and their status.",
    examples: ["WRKSBMJOB"],
    groupMenu: "CMDJOB",
  },
  WRKSBS: {
    helpText: "Work with subsystems and active jobs by subsystem.",
    examples: ["WRKSBS"],
    groupMenu: "CMDJOB",
  },
  WRKDSKSTS: {
    helpText: "Work with disk units and ASP utilization. Option 5 displays disk unit detail.",
    examples: ["WRKDSKSTS"],
    groupMenu: "CMDSYS",
  },
  WRKSYSSTS: {
    helpText: "Work with system status including CPU, jobs, and ASP utilization.",
    examples: ["WRKSYSSTS"],
    groupMenu: "CMDSYS",
  },
  WRKSYSACT: {
    helpText: "Work with system activity metrics including CPU, paging, and I/O rates.",
    examples: ["WRKSYSACT"],
    groupMenu: "CMDSYS",
  },
  DSPSYSSTS: {
    helpText: "Displays system status including CPU, jobs, and ASP utilization.",
    examples: ["DSPSYSSTS"],
    groupMenu: "CMDSYS",
  },
  WRKJOB: {
    helpText: "Work with jobs for the current user or a specified job. Option 5 displays job detail.",
    examples: ["WRKJOB"],
    groupMenu: "CMDJOB",
  },
  WRKSBSJOB: {
    helpText: "Work with jobs in a subsystem. Option 5 displays job detail.",
    examples: ["WRKSBSJOB SBS(QINTER)"],
    groupMenu: "CMDJOB",
  },
  WRKUSRJOB: {
    helpText: "Work with jobs for a user profile. Option 5 displays job detail.",
    examples: ["WRKUSRJOB USER(BACKUPADM)"],
    groupMenu: "CMDJOB",
  },
  DSPJOBATTR: {
    helpText: "Displays extended job attributes for the current or specified job.",
    examples: ["DSPJOBATTR JOB(230145/BACKUPADM/BACKUPJOB)"],
    groupMenu: "CMDJOB",
  },
  DSPSBSD: {
    helpText: "Displays subsystem description and status.",
    examples: ["DSPSBSD SBS(QINTER)"],
    groupMenu: "CMDJOB",
  },
  HLDJOB: {
    helpText: "Holds a job so it cannot run until released.",
    examples: ["HLDJOB JOB(230220/BATCH/OLDVENDOR)"],
    groupMenu: "CMDJOB",
    mutatesState: true,
  },
  RLSJOB: {
    helpText: "Releases a held job so it can continue processing.",
    examples: ["RLSJOB JOB(230145/BATCH/BACKUPADM)"],
    groupMenu: "CMDJOB",
    mutatesState: true,
  },
  ENDJOB: {
    helpText: "Ends the specified job in the lab partition.",
    examples: ["ENDJOB JOB(230220/BATCH/OLDVENDOR)"],
    groupMenu: "CMDJOB",
    mutatesState: true,
  },
  CHGUSRAUD: {
    helpText: "Displays user audit levels. Profile audit changes are read-only in this lab.",
    examples: ["CHGUSRAUD USRPRF(BACKUPADM)"],
    groupMenu: "CMDSEC",
  },
  CHGSECA: {
    helpText: "Security attribute guidance — use WRKSYSVAL/CHGSYSVAL for value changes in the lab.",
    examples: ["CHGSECA"],
    groupMenu: "CMDSEC",
  },
  SAVSECDTA: {
    helpText: "Saves synthetic security data in the lab partition.",
    examples: ["SAVSECDTA"],
    groupMenu: "CMDSEC",
    mutatesState: true,
  },
  RSTSECDTA: {
    helpText: "Restores synthetic security data in the lab partition.",
    examples: ["RSTSECDTA"],
    groupMenu: "CMDSEC",
    mutatesState: true,
  },
  DSPOUTQ: {
    helpText: "Displays output queue status and spooled file count.",
    examples: ["DSPOUTQ OUTQ(QPRINT)"],
    groupMenu: "CMDSPL",
  },
  NETSTAT: {
    helpText: "Displays TCP/IP listeners and established connections.",
    examples: ["NETSTAT"],
    groupMenu: "CMDTCP",
  },
  DSPAUTL: {
    helpText: "Displays an authorization list and secured object summary.",
    examples: ["DSPAUTL AUTL(PAYROLL)"],
    groupMenu: "CMDAUT",
  },
  WRKAUTL: {
    helpText: "Work with authorization lists in the lab catalog.",
    examples: ["WRKAUTL"],
    groupMenu: "CMDAUT",
  },
  WRKOBJOWN: {
    helpText: "Work with objects owned by a user profile. Review ownership accountability for sensitive files.",
    examples: ["WRKOBJOWN USRPRF(PAYADMIN)", "WRKOBJOWN USRPRF(QPGMR) OBJTYPE(*FILE)"],
    groupMenu: "CMDAUT",
    parameterLabels: { USRPRF: "User profile", OBJTYPE: "Object type" },
  },
  EDTAUTL: {
    helpText: "Edit users and authorities on an authorization list. Clause 10 remediation path for PAYROLL autl.",
    examples: ["EDTAUTL AUTL(PAYROLL)"],
    groupMenu: "CMDAUT",
    parameterLabels: { AUTL: "Authorization list" },
    relatedCommands: ["WRKAUTL", "DSPAUTL", "ADDAUTLE", "RMVAUTLE"],
  },
  DSPFD: {
    helpText: "Displays database file description including record format and member information.",
    examples: ["DSPFD FILE(PAYROLL/PAYMST)"],
    groupMenu: "CMDDB",
    parameterLabels: { FILE: "Database file" },
  },
  DSPFFD: {
    helpText: "Displays field-level description for a database file. Evidence for sensitive column review.",
    examples: ["DSPFFD FILE(PAYROLL/PAYMST)"],
    groupMenu: "CMDDB",
    parameterLabels: { FILE: "Database file" },
  },
  DSPPFM: {
    helpText: "Displays physical file member information including record counts.",
    examples: ["DSPPFM FILE(PAYROLL/PAYMST)"],
    groupMenu: "CMDDB",
    parameterLabels: { FILE: "Database file" },
  },
  SAVLIB: {
    helpText: "Saves a library to a synthetic save file in the lab. Creates backup evidence for restore exercises.",
    examples: ["SAVLIB LIB(PAYROLL)"],
    mutatesState: true,
    groupMenu: "CMDLAB",
    parameterLabels: { LIB: "Library" },
  },
  RSTLIB: {
    helpText: "Restores a library from a prior SAVLIB save in the current attempt.",
    examples: ["RSTLIB LIB(PAYROLL)"],
    mutatesState: true,
    groupMenu: "CMDLAB",
    parameterLabels: { LIB: "Library" },
  },
  CHGMODE: {
    helpText: "Changes guidance mode between COACH (hints enabled) and EXAM (hints suppressed) for the active mission.",
    examples: ["CHGMODE MODE(COACH)", "CHGMODE MODE(EXAM)"],
    groupMenu: "CMDLAB",
    parameterLabels: { MODE: "Guidance mode" },
  },
  CHGPERS: {
    helpText: "Changes the active persona (AUDITOR, OPERATOR, ADMIN) which adjusts briefing tone and scoring emphasis.",
    examples: ["CHGPERS PERSONA(AUDITOR)", "CHGPERS PERSONA(ADMIN)"],
    groupMenu: "CMDLAB",
    parameterLabels: { PERSONA: "Persona" },
  },
  CHGVARIANT: {
    helpText: "Switches the active mission variant (A/B/C) for the current scenario without restarting the range.",
    examples: ["CHGVARIANT VARIANT(CLAIMS-001-A)"],
    groupMenu: "CMDLAB",
    parameterLabels: { VARIANT: "Variant id" },
  },
  DSPBLD: {
    helpText: "Displays build instructions for the current mission including objectives and acceptance criteria.",
    examples: ["DSPBLD"],
    groupMenu: "CMDLAB",
  },
  DSPCTRL: {
    helpText: "Displays a governance control definition from the control mapping catalog.",
    examples: ["DSPCTRL CTRL(LCL-AC-01)"],
    groupMenu: "CMDLAB",
    parameterLabels: { CTRL: "Control id" },
  },
  DSPEVID: {
    helpText: "Displays evidence coverage for the current mission attempt against required evidence types.",
    examples: ["DSPEVID"],
    groupMenu: "CMDLAB",
  },
  DSPHLP: {
    helpText:
      "Displays contextual help for the current screen, function keys, and related commands. GRC topics: OFFBOARDING, PRIVACY_OPERATIONS, BLUE_TEAM, RED_TEAM, DECISION_READY.",
    examples: [
      "DSPHLP",
      "DSPHLP TOPIC(SPECIAL_AUTHORITY)",
      "DSPHLP TOPIC(BLUE_TEAM)",
      "DSPHLP TOPIC(OFFBOARDING)",
    ],
    groupMenu: "CMDLAB",
    parameterLabels: { TOPIC: "Help topic" },
  },
  HELP: {
    helpText:
      "Lab command help with i on GRC article links. Shows mission article, featured paths, and accepts DSPCMDHLP on the command line.",
    examples: ["HELP", "DSPCMDHLP CMD(WRKACTJOB)"],
    groupMenu: "CMDLAB",
  },
  DSPMISSION: {
    helpText: "Displays the active mission brief including systems, objectives, and scoring rubric.",
    examples: ["DSPMISSION"],
    groupMenu: "CMDLAB",
  },
  DSPMODE: {
    helpText: "Displays the current guidance mode (COACH or EXAM) for the session.",
    examples: ["DSPMODE"],
    groupMenu: "CMDLAB",
  },
  DSPPERS: {
    helpText: "Displays the active persona and how it affects briefing and scoring.",
    examples: ["DSPPERS"],
    groupMenu: "CMDLAB",
  },
  DSPSCN: {
    helpText: "Displays metadata for the active scenario pack (libraries, missions, controls).",
    examples: ["DSPSCN SCENARIO(CLAIMS400)"],
    groupMenu: "CMDLAB",
    parameterLabels: { SCENARIO: "Scenario id" },
  },
  DSPVARIANT: {
    helpText: "Displays the active mission variant and its difficulty modifiers.",
    examples: ["DSPVARIANT"],
    groupMenu: "CMDLAB",
  },
  RSTLABPKG: {
    helpText: "Restores a previously saved lab package snapshot for the current attempt.",
    examples: ["RSTLABPKG"],
    mutatesState: true,
    groupMenu: "CMDLAB",
  },
  RSTSCNPKG: {
    helpText: "Restores scenario pack files from a .lclpack archive into data/scenarios/.",
    examples: ["RSTSCNPKG PACKAGE(claims400.lclpack)"],
    groupMenu: "CMDLAB",
    parameterLabels: { PACKAGE: "Package file" },
  },
  RUNBUILD: {
    helpText: "Executes scripted build steps for workshop authoring. Used by scenario forge workflows.",
    examples: ["RUNBUILD"],
    mutatesState: true,
    groupMenu: "CMDLAB",
  },
  SAVSCNPKG: {
    helpText: "Packages the active scenario directory into a portable .lclpack file under data/exports/.",
    examples: ["SAVSCNPKG SCENARIO(CLAIMS400)"],
    mutatesState: true,
    groupMenu: "CMDLAB",
    parameterLabels: { SCENARIO: "Scenario id" },
  },
  STRMSN: {
    helpText: "Starts a mission attempt for the specified mission id on the active system.",
    examples: ["STRMSN MISSION(CLAIMS-001)"],
    mutatesState: true,
    groupMenu: "CMDLAB",
    parameterLabels: { MISSION: "Mission id" },
  },
  WRKCMPMSN: {
    helpText: "Work with missions in a campaign. Select a mission to start or review completion status.",
    examples: ["WRKCMPMSN CAMPAIGN(IBM-I-ACCESS-GOVERNANCE)"],
    groupMenu: "CMDLAB",
    parameterLabels: { CAMPAIGN: "Campaign id" },
  },
  WRKCTRL: {
    helpText: "Work with governance controls and map them to findings in the scorebook.",
    examples: ["WRKCTRL"],
    groupMenu: "CMDLAB",
  },
  WRKFINDING: {
    helpText: "Work with recorded findings for the current mission attempt. Option 2 edits narrative.",
    examples: ["WRKFINDING"],
    groupMenu: "CMDLAB",
  },
  WRKSCN: {
    helpText: "Work with scenario packs in the range. Import, validate, or switch active scenario.",
    examples: ["WRKSCN"],
    groupMenu: "CMDLAB",
  },
  WRKSCORE: {
    helpText: "Work with the campaign scorebook showing points, controls, and mission completion.",
    examples: ["WRKSCORE"],
    groupMenu: "CMDLAB",
  },
  WRKVARIANT: {
    helpText: "Work with mission variants defined for the active scenario pack.",
    examples: ["WRKVARIANT"],
    groupMenu: "CMDLAB",
  },
};

const CATEGORY_HELP: Record<string, string> = {
  user_profile: "User profile and class administration on IBM i.",
  system_value: "System value inquiry and change on IBM i.",
  authority: "Object and special authority administration on IBM i.",
  library_object: "Library list and object management on IBM i.",
  journal_audit: "Journal and security audit inquiry on IBM i.",
  job_batch: "Job, subsystem, and batch workload inquiry on IBM i.",
  spool_print: "Spooled file and output queue management on IBM i.",
  message_queue: "Message queue inquiry on IBM i.",
  database_file: "Database file description on IBM i.",
  source_pdm: "Program and source member development manager on IBM i.",
  ptf_license: "PTF and licensed product inquiry on IBM i.",
  security: "Security analysis and navigation on IBM i.",
  ifs: "Integrated file system path and link inquiry on IBM i.",
  sql_services: "SQL and QSYS2 service views on IBM i.",
  mission_lab: "Legacy Control Lab mission and evidence workflow.",
  range: "Legacy Control Lab range, campaigns, and multi-system play.",
  backup_restore: "Synthetic save and restore in the Legacy Control Lab.",
};

export function defaultCatalogHelp(command: CatalogCommandDefinition): string {
  const topic = CATEGORY_HELP[command.category] ?? "IBM i control language command.";
  return `${command.displayName}. ${topic} Cataloged in Legacy Control Lab for command fidelity; use DSPCMDHLP CMD(${command.name}) for syntax when interactive support is added.`;
}

const GENERIC_STUB = "cataloged for IBM i command fidelity in Legacy Control Lab";

export function isThinHelpText(text?: string): boolean {
  if (!text) return true;
  if (text.length < 48) return true;
  return text.includes(GENERIC_STUB);
}

export function enrichCatalogCommand(command: CatalogCommandDefinition): CatalogCommandDefinition {
  const extra = COMMAND_ENRICHMENT[command.name];
  if (!extra) {
    if ((command.status === "cataloged" || command.status === "stubbed") && isThinHelpText(command.helpText)) {
      return { ...command, helpText: defaultCatalogHelp(command) };
    }
    return command;
  }

  const mergedParams = (command.parameters ?? []).map((param) => ({
    ...param,
    label: param.label ?? extra.parameterLabels?.[param.name],
    supportsSpecialValues:
      param.supportsSpecialValues ?? extra.supportsSpecialValues?.[param.name] ?? param.supportsSpecialValues,
  }));

  return {
    ...command,
    ...extra,
    parameters: mergedParams.length ? mergedParams : command.parameters,
    helpText: extra.helpText ?? command.helpText,
    examples: extra.examples ?? command.examples,
    groupMenu: extra.groupMenu ?? command.groupMenu,
  };
}

