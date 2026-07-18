import type { ScreenId } from "../screen-runtime/screen.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import { OPERATOR_STEPS, type CoachTips, type MissionStep } from "./coachContent.js";
import {
  buildCoachTipsForLane,
  formatSignOnPair,
  getProfilePassword,
  isDefaultTrainingPassword,
  operatorSignOnIntro,
} from "./signOnCredentials.js";

export type OperatorScreenGuide = {
  title: string;
  ibmiCommand?: string;
  purpose: string;
  onScreen: string[];
  whatToDo: string[];
  pfKeys: string[];
  relatedCommands: string[];
  realism: string;
  ibmIMeaning?: string;
  roughAnalogy?: string;
  grcTakeaway?: string;
  whatItProves?: string;
  whatItDoesNotProve?: string;
  suggestedNext?: string;
};

export type OperatorCoachShell = {
  lane: "operator";
  systemName: string;
  title: string;
  subtitle: string;
  intro: string;
  workflow: MissionStep[];
  tips: CoachTips;
};

const DEFAULT_OPERATOR_GUIDE: OperatorScreenGuide = {
  title: "5250 session",
  purpose: "Work from the green screen. The coach follows your active display file.",
  onScreen: [
    "Command line (===>) accepts CL commands and menu selections.",
    "Message line at the bottom shows CPC/CPF completion messages.",
  ],
  whatToDo: [
    "Type a menu option or full command, then press Enter.",
    "Use F4 on the command line to prompt parameters when supported.",
  ],
  pfKeys: [
    "F3 — Exit one level (SECURITY is home for QSECOFR).",
    "F12 — Cancel / back (same as F3 on menus).",
    "F4 — Prompt command entry.",
    "F5 — Refresh subfile lists where implemented.",
  ],
  relatedCommands: ["DSPMSG", "WRKACTJOB"],
  realism:
    "On production IBM i, the active display file name appears in the top line (e.g. QSYS/SECURITY). This lab mirrors field layout and navigation, not every DDS keyword.",
};

const OPERATOR_SCREEN_GUIDES: Partial<Record<ScreenId | "DISCONNECTED" | "SIGNON", OperatorScreenGuide>> = {
  DISCONNECTED: {
    title: "Sign-on display (QDSIGNON)",
    ibmiCommand: "STRSST not required — use interactive sign-on",
    purpose: "Authenticate to the system before any menu or command runs.",
    onScreen: [
      "System name (CLAIMS400), subsystem (QINTER), and display device.",
      "User profile and password input fields (10 characters, uppercase on IBM i).",
      "Program/procedure fields may appear on full QDSIGNON; this lab routes by profile.",
    ],
    whatToDo: [
      "Sign on as QSECOFR / TRAIN for the security officer lane.",
      "You land on SECURITY — not the MAIN training hub used by AUDIT.",
    ],
    pfKeys: ["F3 — Exit sign-on display.", "Enter — Submit user and password."],
    relatedCommands: [],
    realism:
      "QSECOFR is the shipped security officer profile (*SECOFR). It is not the same as SST service tools access.",
  },
  SIGNON: {
    title: "Sign-on display (QDSIGNON)",
    purpose: "Enter credentials to start an interactive job in QINTER.",
    onScreen: ["User and password fields at the classic QDSIGNON column positions."],
    whatToDo: ["User QSECOFR, password TRAIN, then Enter."],
    pfKeys: ["Enter — Sign on.", "F3 — Exit."],
    relatedCommands: [],
    realism: "Failed sign-on shows a message at the bottom of the display — check password and profile status.",
  },
  SECURITY: {
    title: "Security menu (GO SECURITY)",
    ibmiCommand: "GO SECURITY",
    purpose: "Primary security administration menu — same role as SECTOOLS is separate from this lab menu.",
    onScreen: [
      "Two-column menu with options 1–19 for profiles, system values, journal, objects, jobs, spool, messages, and command groups.",
      "Option 20 opens IBM i Security Paths — change password, authorization lists, adopted authority, security auditing, and related stock panels.",
      "Command line for direct CL: WRKUSRPRF, CHGUSRPRF, DSPOBJAUT, etc.",
      "Option 90 or SIGNOFF ends the session.",
    ],
    whatToDo: [
      "Option 1 — WRKUSRPRF (work with user profiles).",
      "Option 2 — WRKSYSVAL (work with system values).",
      "Option 20 — IBM i security paths (CHGPWD, WRKAUTL, DSPSECAUD, ANZPRFACT).",
      "Option 4 — WRKOBJ with authority option, or type DSPOBJAUT.",
      "Option 12 — Service tools concept menu (profile vs SST user ID).",
    ],
    pfKeys: [
      "F3 — Stays on SECURITY (operator home).",
      "F4 — Prompt the command on ===>.",
      "F9 — Retrieve last command.",
    ],
    relatedCommands: [
      "WRKUSRPRF",
      "WRKSYSVAL",
      "CHGPWD",
      "WRKAUTL",
      "DSPSECAUD",
      "DSPJRN",
      "DSPOBJAUT OBJ(PAYROLL/PAYMST)",
      "DSPPRVSSN",
      "GENRPT TYPE(*PRIV)",
    ],
    realism:
      "On IBM i, *SECADM and *ALLOBJ govern whether you can change profiles and authorities. QSECOFR carries the full special authority set in this scenario.",
  },
  SECSTOCK: {
    title: "IBM i Security Paths (SECSTOCK)",
    ibmiCommand: "GO SECSTOCK",
    purpose: "Stock IBM i security administration paths plus lab-only panels — reached from SECURITY option 20.",
    onScreen: [
      "Two-column menu: CHGPWD, WRKAUTL, DSPAUT, DSPSECAUD, ANZPRFACT, DSPPRVSSN, CHGACTPRFL, DSPSTCONC.",
      "These mirror GO SECURITY stock options without replacing the main training hub.",
    ],
    whatToDo: [
      "Option 1 — CHGPWD change-password panel (current / new / verify).",
      "Option 2 — WRKAUTL authorization lists (Clause 6 privacy path).",
      "Option 4 — DSPSECAUD filtered security audit journal.",
      "Option 5 — ANZPRFACT inactive profile sweep (offboarding article path).",
    ],
    pfKeys: ["F3 — Return to SECURITY.", "F12 — Cancel / back."],
    relatedCommands: ["CHGPWD", "WRKAUTL", "DSPSECAUD", "ANZPRFACT INACT(90)"],
    realism:
      "Production IBM i GO SECURITY shows fewer options for *USER class. This submenu collects stock-path drills for operator training.",
  },
  CHGPWD: {
    title: "Change Password (CHGPWD)",
    ibmiCommand: "CHGPWD",
    purpose: "Interactive password change for the signed-on profile — same flow as option 1 on SECSTOCK.",
    onScreen: [
      "User profile (output), current password, new password, verify new password fields.",
      "Password fields are non-display (5250 ND attribute) like sign-on.",
    ],
    whatToDo: [
      "Enter current password (QSECOFR default TRAIN), then new password twice.",
      "Press Enter to apply; F3/F12 cancel without changing.",
    ],
    pfKeys: ["Enter — Submit password change.", "F3/F12 — Cancel back to SECSTOCK."],
    relatedCommands: ["CHGUSRPRF USRPRF(...)"],
    realism:
      "Real CHGPWD enforces password rules from QPWDLVL/QPWDRULES. This lab stores the new value for the remainder of the session database.",
  },
  SECTOOLS: {
    title: "Service tools menu",
    ibmiCommand: "GO SECTOOLS",
    purpose: "Conceptual SST entry — explains profile QSECOFR vs service tools user ID.",
    onScreen: ["Options for DSPSTCONC and DSPPRVSSN."],
    whatToDo: [
      "Option 1 — Display service tools concept (educational).",
      "Option 2 — Display privileged session attributes.",
    ],
    pfKeys: ["F3 — Return to SECURITY."],
    relatedCommands: ["DSPSTCONC", "DSPPRVSSN"],
    realism:
      "Real SST requires dedicated service tools sign-on and often DST. The QSECOFR *USER profile does not automatically imply SST access.",
  },
  DSPPRVSSN: {
    title: "Display Privileged Session",
    ibmiCommand: "DSPPRVSSN",
    purpose: "Shows interactive job context for the signed-on security officer.",
    onScreen: [
      "User profile, job name/number/user, subsystem, current library.",
      "Special authorities granted to the session.",
      "Initial menu and session start time.",
    ],
    whatToDo: [
      "Verify *ALLOBJ, *SECADM, *AUDIT and other SPCAUT values match policy.",
      "Compare with DSPUSRPRF for the same profile when documenting access.",
    ],
    pfKeys: ["F3 — Back to prior menu.", "F12 — Cancel."],
    relatedCommands: ["DSPUSRPRF USRPRF(QSECOFR)", "DSPJOB"],
    realism: "DSPPRVSSN is a lab command patterned after session inquiry — production admins often use DSPJOB and WRKUSRPRF.",
  },
  DSPSTCONC: {
    title: "Display Service Tools Concept",
    ibmiCommand: "DSPSTCONC",
    purpose: "Clarifies IBM i terminology around privileged IDs.",
    onScreen: [
      "QSECOFR user profile row vs QSECOFR service tools user ID row.",
      "Narrative that SST is a separate entry path.",
    ],
    whatToDo: ["Read both rows — auditors and operators confuse these on real assessments."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPPRVSSN"],
    realism: "Service tools user profiles are documented in IBM knowledge base articles on SST and DST procedures.",
  },
  WRKUSRPRF: {
    title: "Work with User Profiles",
    ibmiCommand: "WRKUSRPRF",
    purpose: "Subfile list of user profiles — primary administration entry for identity review.",
    onScreen: [
      "Profile name, status, user class, text description.",
      "Option column for 5=Display, 8=Work with authorities, 12=Work with objects.",
    ],
    whatToDo: [
      "5 beside BACKUPADM — DSPUSRPRF (note *ALLOBJ and last sign-on).",
      "5 beside OLDVENDOR — contractor profile still enabled.",
      "5 beside QPGMR — disabled profile example.",
      "8 — DSPOBJAUT path for profile-owned objects.",
    ],
    pfKeys: ["F5 — Refresh list.", "F3 — Back to SECURITY.", "Roll keys — Page subfile."],
    relatedCommands: [
      "DSPUSRPRF USRPRF(BACKUPADM)",
      "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)",
      "DSPUSRPRF USRPRF(QSECOFR)",
    ],
    realism:
      "WRKUSRPRF is *SECADM territory on modern releases. Last-used date and LMTSEC/LMTCPB fields on DSPUSRPRF matter for dormant-account reviews.",
    ibmIMeaning: "User profiles are the identity anchor on IBM i — authorities attach to profiles.",
    roughAnalogy: "Like account records plus sudoers, but menu-driven.",
  },
  DSPUSRPRF: {
    title: "Display User Profile",
    ibmiCommand: "DSPUSRPRF USRPRF(...)",
    purpose: "Full profile attributes — status, class, SPCAUT, initial menu/program, limits.",
    onScreen: [
      "User class (*SECOFR, *USER, …).",
      "Special authorities — space-separated *ALLOBJ *SAVSYS *SECADM etc.",
      "Last sign-on date, password expiration, limit capabilities.",
      "Initial menu/program and current library.",
    ],
    whatToDo: [
      "Compare last sign-on to role — BACKUPADM stale date is a finding pattern.",
      "Confirm SPCAUT matches job function (least privilege).",
      "Note INLPGM/INLMNU for interactive routing.",
    ],
    pfKeys: ["F3 — Back to WRKUSRPRF or menu.", "F12 — Cancel."],
    relatedCommands: ["CHGUSRPRF", "GRTOBJAUT", "RVKOBJAUT"],
    realism:
      "On IBM i, group profiles aggregate authority — always check both USRPRF and GRPPRF on DSPUSRPRF.",
    ibmIMeaning: "Special authorities (*ALLOBJ, *SAVSYS) bypass normal object checks.",
    roughAnalogy: "Root-equivalent capability scoped to a named account.",
  },
  WRKSYSVAL: {
    title: "Work with System Values",
    ibmiCommand: "WRKSYSVAL",
    purpose: "List system values that control security posture — QSECURITY, QAUDCTL, QMAXSIGN, etc.",
    onScreen: ["System value name, current setting, description in subfile."],
    whatToDo: [
      "5 beside QSECURITY — display password level and security related settings.",
      "5 beside QAUDCTL — auditing configuration.",
      "Document values before/after any CHGSYSVAL (not exercised in auditor lane).",
    ],
    pfKeys: ["F5 — Refresh.", "F3 — Back."],
    relatedCommands: ["DSPSYSVAL SYSVAL(QSECURITY)", "DSPSYSVAL SYSVAL(QAUDCTL)"],
    realism: "QSECURITY 40/50 is common on current systems; value alone does not prove access governance.",
  },
  DSPSYSVAL: {
    title: "Display System Value",
    ibmiCommand: "DSPSYSVAL SYSVAL(...)",
    purpose: "Detail for one system value — use for change control evidence.",
    onScreen: ["Name, current value, description, category."],
    whatToDo: [
      "Capture QSECURITY and QAUDCTL for security baseline documentation.",
      "Relate QAUDCTL settings to what appears in QAUDJRN.",
    ],
    pfKeys: ["F3 — Back to WRKSYSVAL."],
    relatedCommands: ["WRKSYSVAL", "DSPJRN"],
    realism: "System values are cached at IPL for some attributes — always verify live value with DSPSYSVAL.",
  },
  WRKOBJ: {
    title: "Work with Objects",
    ibmiCommand: "WRKOBJ OBJ(lib/obj) OBJTYPE(*ALL)",
    purpose: "Object list for a library — option 8 reaches object authority.",
    onScreen: ["Library/object, type, attribute, text description."],
    whatToDo: [
      "Locate PAYROLL/PAYMST (*FILE) — option 8 for DSPOBJAUT.",
      "Review *PUBLIC authority and individual user grants.",
    ],
    pfKeys: ["F5 — Refresh.", "F3 — Back."],
    relatedCommands: ["DSPOBJAUT OBJ(PAYROLL/PAYMST)", "GRTOBJAUT", "EDTOBJAUT"],
    realism: "Object ownership matters — objects owned by QSECOFR with *PUBLIC *ALL is a classic audit finding.",
  },
  DSPOBJAUT: {
    title: "Display Object Authority",
    ibmiCommand: "DSPOBJAUT OBJ(lib/name) OBJTYPE(*FILE)",
    purpose: "Who has *USE/*CHANGE/*EXCLUDE on an object — core SoD evidence.",
    onScreen: [
      "Object name, library, type, owner.",
      "*PUBLIC authority row.",
      "Per-user and group authority rows.",
    ],
    whatToDo: [
      "Read PAYMST *PUBLIC authority — excessive public access is high risk for payroll data.",
      "Cross-check APCLERK and BACKUPADM rows against role definitions.",
    ],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["GRTOBJAUT", "RVKOBJAUT", "WRKOBJ OBJ(PAYROLL/*ALL)"],
    realism: "DSPOBJAUT shows adopted authority differently than effective authority — use EDTOBJAUT on real systems for edits.",
  },
  DSPJRN: {
    title: "Display Journal",
    ibmiCommand: "DSPJRN JRN(lib/name)",
    purpose: "Security audit journal entries — AF, PF, OW, CA style events in the lab.",
    onScreen: ["Entry date/time, code, user, object, message text in subfile."],
    whatToDo: [
      "5 on an entry — detail line.",
      "Filter mentally for password failures (AF), authority failures, profile events.",
      "Correlate with DSPJOBLOG for the same user.",
    ],
    pfKeys: ["F5 — Refresh.", "F3 — Back.", "Roll — Page entries."],
    relatedCommands: ["DSPAUDJRNE", "WRKJRNA"],
    realism: "QAUDJRN can grow quickly — production reviews use date range and entry type filters.",
  },
  WRKACTJOB: {
    title: "Work with Active Jobs",
    ibmiCommand: "WRKACTJOB",
    purpose: "Interactive and batch jobs currently active on the system.",
    onScreen: ["Job name, user, type, subsystem, and status columns."],
    whatToDo: [
      "5 on a row — DSPJOB detail for that job.",
      "Look for QSERVER and QHTTPSVR jobs alongside QBATCH backup work.",
    ],
    pfKeys: ["F5 — Refresh.", "F3 — Back."],
    relatedCommands: ["DSPJOB", "DSPJOBLOG", "WRKSYSSTS"],
    realism: "Option 5 on a job often leads to job attributes — compare with privileged batch users.",
  },
  WRKSYSSTS: {
    title: "Work with System Status",
    ibmiCommand: "WRKSYSSTS",
    purpose: "Partition health snapshot — CPU, job counts, and ASP utilization.",
    onScreen: ["% CPU used, jobs in system, interactive vs batch counts, storage."],
    whatToDo: [
      "Compare job counts with WRKACTJOB before ending unfamiliar work.",
      "Note % system ASP used before large restores.",
    ],
    pfKeys: ["F5 — Refresh.", "F3 — Back to SECURITY."],
    relatedCommands: ["WRKACTJOB", "WRKDSKSTS", "WRKSYSACT"],
    realism: "Operators and security officers both use WRKSYSSTS during incident triage.",
  },
  WRKDSKSTS: {
    title: "Work with Disk Status",
    ibmiCommand: "WRKDSKSTS",
    purpose: "Disk units by ASP — capacity, status, and percent used.",
    onScreen: ["ASP, unit ID, type, status, and % used in subfile."],
    whatToDo: ["5 on a unit — detail including model and available GB."],
    pfKeys: ["F5 — Refresh.", "F3 — Back."],
    relatedCommands: ["WRKSYSSTS", "DSPSYSSTS"],
    realism: "Disk pressure often precedes journal receiver or spool growth issues.",
  },
  WRKSYSACT: {
    title: "Work with System Activity",
    ibmiCommand: "WRKSYSACT",
    purpose: "Live activity metrics — CPU, paging, I/O, and interactive response.",
    onScreen: ["Metric name and value pairs refreshed with F5."],
    whatToDo: ["Correlate high CPU with WRKACTJOB batch users."],
    pfKeys: ["F5 — Refresh.", "F3 — Back."],
    relatedCommands: ["WRKSYSSTS", "WRKACTJOB"],
    realism: "Navigator shows similar charts; green-screen operators use WRKSYSACT/WRKSYSSTS.",
  },
  WRKSPLF: {
    title: "Work with Spooled Files",
    ibmiCommand: "WRKSPLF",
    purpose: "Printer output queues — sensitive reports may spool here.",
    onScreen: ["Spool file name, user, date, pages."],
    whatToDo: ["Review who owns payroll or audit-related spool files."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPSPLF", "WRKOUTQ"],
    realism: "Output queues can be secured with *PUBLIC *EXCLUDE — check OPRCTL holders.",
  },
  DSPMSG: {
    title: "Display Messages",
    ibmiCommand: "DSPMSG MSGQ(QSYSOPR)",
    purpose: "Operator message queue — authority and system messages appear here.",
    onScreen: ["Message ID, severity, text."],
    whatToDo: ["Scan for CPF authority failures before deep journal analysis."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["WRKMSGQ MSGQ(QSYSOPR)"],
    realism: "QSYSOPR is not a substitute for centralized SIEM — but operators live in this queue.",
  },
  CMDSEC: {
    title: "Security command group",
    ibmiCommand: "GO CMDSEC",
    purpose: "Grouped security CL commands available in the catalog.",
    onScreen: ["Command names with descriptions — select or type on ===>."],
    whatToDo: ["Pick DSPPRVSSN, GENRPT, or profile commands from the list."],
    pfKeys: ["F3 — Back to SECURITY (operator lane)."],
    relatedCommands: ["DSPPRVSSN", "GENRPT TYPE(*PRIV)", "CHGUSRPRF"],
    realism: "CMDSEC is a lab menu — production systems use menu CL programs or Navigator.",
  },
  CMDUSR: {
    title: "User profile commands",
    ibmiCommand: "GO CMDUSR",
    purpose: "User profile CL commands — CRT/DLT/CHG/DSP USRPRF family.",
    onScreen: ["Cataloged user profile commands."],
    whatToDo: ["Run DSPUSRPRF or CHGUSRPRF from the command line with F4 prompt."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPUSRPRF", "CHGUSRPRF", "WRKUSRPRF"],
    realism: "*SECADM required for most profile mutations on IBM i.",
  },
  CMDSYS: {
    title: "System value commands",
    ibmiCommand: "GO CMDSYS",
    purpose: "DSPSYSVAL / WRKSYSVAL / CHGSYSVAL family.",
    onScreen: ["System value commands."],
    whatToDo: ["DSPSYSVAL before any change — document baseline."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["WRKSYSVAL", "DSPSYSVAL SYSVAL(QSECURITY)"],
    realism: "CHGSYSVAL often requires *ALLOBJ and may need IPL for some values.",
  },
  CMDAUT: {
    title: "Authority commands",
    ibmiCommand: "GO CMDAUT",
    purpose: "GRTOBJAUT, RVKOBJAUT, DSPOBJAUT, EDTOBJAUT.",
    onScreen: ["Object authority commands."],
    whatToDo: ["DSPOBJAUT before GRTOBJAUT — least privilege changes only with change ticket."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPOBJAUT", "GRTOBJAUT", "RVKOBJAUT"],
    realism: "Object authority changes are journaled when QAUDCTL includes *OBJCREAT/*OBJMGT as configured.",
  },
  CMDJRN: {
    title: "Journal commands",
    ibmiCommand: "GO CMDJRN",
    purpose: "Journal display and receiver commands.",
    onScreen: ["Journal-related CL."],
    whatToDo: ["DSPJRN for security audit trail."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPJRN", "DSPAUDJRNE"],
    realism: "Journal receivers fill — WRKJRNA is part of production journal management.",
  },
  DSPLIBL: {
    title: "Display Library List",
    ibmiCommand: "DSPLIBL",
    purpose: "Current library list for the job — system, product, and user portions.",
    onScreen: ["Library names in list order."],
    whatToDo: ["Confirm *LIBL resolves PAYROLL, QSYS, QTEMP for command execution."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["ADDLIBLE", "RMVLIBLE", "CHGLIBL"],
    realism: "Library list affects which *FILE is opened for unqualified names.",
  },
  CMDPROMPT: {
    title: "Command prompt (F4)",
    ibmiCommand: "F4 on ===>",
    purpose: "IBM i parameter entry display for CL commands — same pattern as production prompts.",
    onScreen: ["Command name, parameter fields, allowed special values."],
    whatToDo: [
      "Fill required parameters, press Enter to run.",
      "F12 cancels back to the prior screen without running.",
    ],
    pfKeys: ["F4 — Prompt again.", "F12 — Cancel prompt.", "Enter — Run command."],
    relatedCommands: ["CHGUSRPRF", "GRTOBJAUT", "DSPOBJAUT"],
    realism: "Prompt displays are generated from command definition objects on real IBM i.",
  },
  DSPJOB: {
    title: "Display Job",
    ibmiCommand: "DSPJOB",
    purpose: "Interactive or batch job attributes — user, job name, subsystem, status.",
    onScreen: ["Job name/number/user, type, subsystem, function, status."],
    whatToDo: ["Confirm job user matches the profile you are reviewing.", "Use before DSPJOBLOG for context."],
    pfKeys: ["F3 — Back.", "F5 — Refresh if on WRKACTJOB path."],
    relatedCommands: ["DSPJOBLOG", "WRKACTJOB", "DSPPRVSSN"],
    realism: "DSPJOB OPTION(*RUNA) on production shows run attributes including PGM and LIBL.",
  },
  DSPJOBLOG: {
    title: "Display Job Log",
    ibmiCommand: "DSPJOBLOG",
    purpose: "Messages issued by a job — sign-on, command failures, authority errors.",
    onScreen: ["Message ID, severity, timestamp, text."],
    whatToDo: [
      "Look for CPF authority failures after DSPOBJAUT reviews.",
      "Compare QSECOFR interactive messages with BACKUPADM batch.",
    ],
    pfKeys: ["F3 — Back.", "Roll — Page log entries."],
    relatedCommands: ["DSPJOB", "DSPMSG", "DSPJRN"],
    realism: "Job logs roll off — capture screenshots for audit evidence promptly.",
  },
  WRKMSGQ: {
    title: "Work with Message Queues",
    ibmiCommand: "WRKMSGQ",
    purpose: "List message queues — QSYSOPR is the system operator queue.",
    onScreen: ["Queue name, library, description."],
    whatToDo: ["Option 5 or DSPMSG on QSYSOPR for outstanding operator messages."],
    pfKeys: ["F3 — Back to SECURITY."],
    relatedCommands: ["DSPMSG MSGQ(QSYSOPR)", "WRKMSGQ MSGQ(QSYSOPR)"],
    realism: "Unattended CPF messages in QSYSOPR often precede journal analysis.",
  },
  DSPSPLF: {
    title: "Display Spooled File",
    ibmiCommand: "DSPSPLF",
    purpose: "View a single spool file — owner, user data, output queue.",
    onScreen: ["File name, user, date/time, pages, output queue."],
    whatToDo: ["Check owner vs. data sensitivity for payroll or audit reports."],
    pfKeys: ["F3 — Back to WRKSPLF."],
    relatedCommands: ["WRKSPLF", "WRKOUTQ"],
    realism: "Spool files retain data until deleted or moved — secure output queues matter.",
  },
  WRKOUTQ: {
    title: "Work with Output Queues",
    ibmiCommand: "WRKOUTQ",
    purpose: "Output queue list — who can read spooled reports.",
    onScreen: ["Queue name, library, status."],
    whatToDo: ["Review QPRINT and application-specific OUTQs."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["WRKSPLF", "DSPOBJAUT"],
    realism: "*PUBLIC *EXCLUDE on outqs is a common hardening step.",
  },
  DSPSECAUD: {
    title: "Display Security Audit",
    ibmiCommand: "DSPSECAUD",
    purpose: "Security audit journal entries in alternate layout.",
    onScreen: ["Entry type, user, object, timestamp."],
    whatToDo: ["Cross-reference with DSPJRN for the same incident."],
    pfKeys: ["F3 — Back.", "F5 — Refresh."],
    relatedCommands: ["DSPJRN", "DSPAUDJRNE"],
    realism: "QAUDJRN and security audit views depend on QAUDCTL settings.",
  },
  DSPAUDJRNE: {
    title: "Display Audit Journal Entries",
    ibmiCommand: "DSPAUDJRNE",
    purpose: "Filtered audit journal entry display.",
    onScreen: ["Journal, receiver, entry sequence, codes."],
    whatToDo: ["Narrow to password failure (AF) and authority events."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPJRN", "WRKJRNA"],
    realism: "Receivers must be managed or entries are lost when receivers are deleted.",
  },
  HELP: {
    title: "Help display",
    ibmiCommand: "HELP",
    purpose: "Context help for commands and menus.",
    onScreen: ["Help text for the requested topic."],
    whatToDo: ["Press F1 on a field where supported, or HELP cmd on ===>."],
    pfKeys: ["F3 — Exit help.", "F12 — Cancel."],
    relatedCommands: ["DSPCMDHLP"],
    realism: "IBM i help is field-sensitive on many displays — cursor position matters.",
  },
  DSPCMDHLP: {
    title: "Display Command Help",
    ibmiCommand: "DSPCMDHLP",
    purpose: "CL command documentation — parameters and authorities required.",
    onScreen: ["Command syntax, parameters, examples."],
    whatToDo: ["Check required authority before running privileged CL."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["HELP"],
    realism: "CMDHDR and PGM source define what the help API returns.",
  },
  JOB: {
    title: "Job menu",
    ibmiCommand: "GO JOB",
    purpose: "Job-related CL from SECURITY option 6 path.",
    onScreen: ["DSPJOB, DSPJOBLOG, WRKACTJOB selections."],
    whatToDo: ["WRKACTJOB to see live interactive and batch work."],
    pfKeys: ["F3 — Back to SECURITY."],
    relatedCommands: ["WRKACTJOB", "DSPJOB", "DSPJOBLOG"],
    realism: "QBATCH holds most batch — QINTER for green-screen interactive.",
  },
  SPL: {
    title: "Spool menu",
    ibmiCommand: "GO SPL",
    purpose: "Spooled file commands from the security menu tree.",
    onScreen: ["WRKSPLF and related options."],
    whatToDo: ["WRKSPLF to list your job's printer output."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["WRKSPLF", "DSPSPLF"],
    realism: "SPLFACN on profiles controls who may view others' spool files.",
  },
  CMDMSG: {
    title: "Message commands",
    ibmiCommand: "GO CMDMSG",
    purpose: "DSPMSG, WRKMSGQ, SNDMSG family.",
    onScreen: ["Message-related catalog commands."],
    whatToDo: ["DSPMSG MSGQ(QSYSOPR) after authority failures."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPMSG", "WRKMSGQ"],
    realism: "Messages can be scoped to a job's program message queue.",
  },
  CMDJOB: {
    title: "Job commands",
    ibmiCommand: "GO CMDJOB",
    purpose: "Job inquiry and control commands.",
    onScreen: ["DSPJOB, ENDJOB, HOLDJOB catalog entries."],
    whatToDo: ["Use DSPJOB before ending unfamiliar batch work."],
    pfKeys: ["F3 — Back."],
    relatedCommands: ["DSPJOB", "WRKACTJOB"],
    realism: "Ending the wrong QBATCH job can interrupt backups.",
  },
};

const CATALOG_WORK_WITH_GUIDE: OperatorScreenGuide = {
  title: "Work with list",
  purpose: "IBM i work-with display — subfile options drive inquiry and change.",
  onScreen: [
    "Option column on the left; list data columns follow IBM i conventions.",
    "Selection or command line at the bottom for CL entry.",
  ],
  whatToDo: [
    "Type 5 in the option field beside a row, then press Enter to display detail.",
    "Use F5 to refresh the list when jobs, messages, or spool files change.",
  ],
  pfKeys: ["F5 — Refresh.", "F3 — Back to SECURITY.", "F12 — Cancel."],
  relatedCommands: ["DSPMSG", "WRKACTJOB"],
  realism: "WRK* screens share the same subfile navigation pattern on every IBM i partition.",
};

const CATALOG_DISPLAY_GUIDE: OperatorScreenGuide = {
  title: "Display detail",
  purpose: "IBM i display screen — labeled fields with dot notation.",
  onScreen: [
    "Command name and title on line 1; system name on the right.",
    "Parameter values shown as field . . . . . . : value pairs.",
  ],
  whatToDo: [
    "Read field labels — they mirror DSP* layouts operators see in production.",
    "Press F3 to return to the prior menu or work-with list.",
  ],
  pfKeys: ["F3 — Back.", "F1 — Help when available.", "F12 — Cancel."],
  relatedCommands: [],
  realism: "DSP commands use consistent header and footer rows across IBM i releases.",
};

const CATALOG_PARAMETER_GUIDE: OperatorScreenGuide = {
  title: "Command parameters",
  purpose: "IBM i change/create/action screen — enter parameters then press Enter.",
  onScreen: ["Labeled parameter fields with F4 prompt support where cataloged."],
  whatToDo: [
    "Fill required parameters, or press F4 on the command line for a prompt.",
    "Press Enter to run; completion messages appear on the message line.",
  ],
  pfKeys: ["F3 — Cancel.", "F4 — Prompt.", "F12 — Cancel."],
  relatedCommands: [],
  realism: "CHG*, CRT*, and SND* commands use the same parameter panel layout on IBM i.",
};

function patternGuideForScreen(screenId: string): OperatorScreenGuide | undefined {
  const upper = screenId.toUpperCase();
  if (upper.startsWith("WRK")) {
    return { ...CATALOG_WORK_WITH_GUIDE, title: upper, ibmiCommand: upper };
  }
  if (upper.startsWith("DSP")) {
    return { ...CATALOG_DISPLAY_GUIDE, title: upper, ibmiCommand: upper };
  }
  if (/^(CHG|CRT|DLT|ADD|RMV|SND|SBM|STR|END|SAV|RST|HLD|RLS)/.test(upper)) {
    return { ...CATALOG_PARAMETER_GUIDE, title: upper, ibmiCommand: upper };
  }
  if (upper.startsWith("CMD")) {
    return OPERATOR_SCREEN_GUIDES[upper as ScreenId];
  }
  return undefined;
}

export function resolveOperatorScreenGuide(
  screenId: ScreenId | "DISCONNECTED" | "SIGNON",
  options?: { systemName?: string; userName?: string },
): OperatorScreenGuide {
  const explicit = OPERATOR_SCREEN_GUIDES[screenId];
  const base =
    explicit ??
    patternGuideForScreen(String(screenId)) ??
    ({
      ...DEFAULT_OPERATOR_GUIDE,
      title: `Display ${screenId}`,
      purpose: `You are on screen ${screenId}. Use F3 to back out to SECURITY when lost.`,
    } satisfies OperatorScreenGuide);

  if (!options?.systemName) {
    return base;
  }

  const userName = (options.userName ?? "QSECOFR").toUpperCase();
  const password = getProfilePassword(options.systemName, userName);
  const pair = formatSignOnPair(userName, password);
  const defaultNote = isDefaultTrainingPassword(password)
    ? "Default password is TRAIN until you change it with CHGPWD."
    : `Current sign-on password is ${password} (saved after CHGPWD).`;

  if (screenId === "DISCONNECTED" || screenId === "SIGNON") {
    return {
      ...base,
      whatToDo: [
        `Sign on as ${pair} for the security officer lane.`,
        defaultNote,
        "You land on SECURITY — not the MAIN training hub used by AUDIT.",
      ],
    };
  }

  if (screenId === "CHGPWD") {
    return {
      ...base,
      whatToDo: [
        `Enter current password (${password}), then new password twice.`,
        "Press Enter to apply; F3/F12 cancel without changing.",
        "After CPI1116, sign off and sign on again with your new password — coach cards update automatically.",
      ],
    };
  }

  return base;
}

export function buildOperatorCoachShell(systemName: string): OperatorCoachShell {
  const tips = buildCoachTipsForLane(systemName, "operator");
  return {
    lane: "operator",
    systemName,
    title: "IBM i Security Administration",
    subtitle: "QSECOFR operator lane — live 5250 tutorial",
    intro: operatorSignOnIntro(systemName),
    workflow: OPERATOR_STEPS,
    tips,
  };
}

export function buildOperatorCoachContext(
  screenId: ScreenId | "DISCONNECTED" | "SIGNON",
  systemName: string,
  userName?: string,
): {
  lane: SessionLane;
  mode: "operator";
  screenId: typeof screenId;
  screenGuide: OperatorScreenGuide;
  hints: string[];
  systemName: string;
} {
  const screenGuide = resolveOperatorScreenGuide(screenId, { systemName, userName });
  const hints = [
    screenGuide.purpose,
    ...screenGuide.whatToDo.slice(0, 2),
    screenGuide.realism,
  ];
  return {
    lane: "operator",
    mode: "operator",
    screenId,
    screenGuide,
    hints,
    systemName,
  };
}
