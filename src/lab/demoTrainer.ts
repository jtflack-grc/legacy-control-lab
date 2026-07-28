import { hydrateSignOnCopy } from "./signOnCredentials.js";

/** Unscored showroom walkthrough — sign on as DEMO / TRAIN */
export type DemoPath = "product";

/** Red bottom-line message when DEMO runs SUBMITMSN (CPF-style escape message). */
export const DEMO_COMPLETE_MESSAGE = "CPF0006 - Demo Complete!";

export function isDemoSubmitComplete(lastCommand?: string): boolean {
  return Boolean(lastCommand?.trim().match(/^SUBMITMSN\b/i));
}

function isDemoSignedOn(signedOnUser?: string): boolean {
  return signedOnUser?.trim().toUpperCase() === "DEMO";
}

function isPostSignOnScreen(screenId?: string): boolean {
  const screen = (screenId ?? "DISCONNECTED").trim().toUpperCase();
  return screen !== "DISCONNECTED" && !screen.includes("SIGNON");
}

/** After DEMO signs on, skip welcome + sign-on steps and land on GO AUDIT. */
export function demoSignedOnTargetStep(path: DemoPath): number {
  const steps = demoStepsForPath(path);
  const goAudit = steps.findIndex((step) => step.id === "go-audit");
  return goAudit >= 0 ? goAudit : Math.min(2, steps.length - 1);
}

export type DemoStep = {
  id: string;
  title: string;
  phase: string;
  command: string;
  commandNote?: string;
  intro: string;
  narrative: string;
  ibmIConcept: string;
  whyUnique: string;
  controlAngle: string;
  watchFor: string[];
  tips: string[];
  exitHint?: string;
  screenHint?: string;
  commandMatch?: RegExp;
  isSignOn?: boolean;
  /** i on GRC article this step supports */
  articleUrl?: string;
  /** Lab mission id (e.g. CLAIMS-002) */
  labMission?: string;
  /** Control framework hooks for coach panel */
  frameworkRefs?: string[];
};

const PRODUCT_DEMO_STEPS: DemoStep[] = [
  {
    id: "welcome",
    phase: "Orient",
    title: "Welcome: Five-Minute Demo (no scoring)",
    command: "(No command yet. Read this, then sign on in the green screen.)",
    intro:
      "You are about to walk through CLAIMS400, a synthetic IBM i-style partition built for governance learning. This showroom path uses the DEMO profile. No mission scoring, just the product story. The green screen on the left is the system. This panel is your interpreter.",
    narrative:
      "Most GRC training shows you a finished audit opinion or a SOC report. Almost none of it shows you where the evidence actually lives on a legacy midrange system: profiles, authorities, journals, job logs. That gap is why auditors and risk teams struggle to talk credibly with operations.",
    ibmIConcept:
      "IBM i (historically AS/400) is still running critical workloads worldwide. Security evidence is not a PDF export. It is green-screen commands, object authorities, user profiles, and audit journals on the partition itself.",
    whyUnique:
      "Legacy Control Lab is the only local, browser-based range that lets you operate a convincing IBM i environment without IBM hardware, without a vendor account, and without turning the terminal into a cartoon tutorial. You get real command names, real screen patterns, and synthetic state that behaves like production, safely on your laptop.",
    controlAngle:
      "This demo path answers: Can I prove what the control claim says using the same artifacts a real auditor would ask for on IBM i?",
    watchFor: [
      "Terminal connects to CLAIMS400",
      "Sign-on screen appears (user + password fields)",
    ],
    tips: [
      "Click inside the green screen if the keyboard does not respond",
      "Tab between user and password fields, then press Enter",
      "Use DEMO / TRAIN from the credentials card at the top of this panel",
    ],
  },
  {
    id: "signon",
    phase: "Orient",
    title: "Sign on as the showroom profile",
    command: "User: DEMO    Password: TRAIN",
    commandNote: "Enter at the sign-on screen, not on the ===> command line.",
    intro:
      "DEMO is a read-only showroom profile for this walkthrough. It can run the evidence commands below but does not start scored missions. Pick a skill path after the tour for CLAIMS-001, CLAIMS-005, CLAIMS-007, or operator work.",
    narrative:
      "Separating the unscored product demo from scored play keeps hiring demos honest: you can show the green screen without accidentally submitting a mission attempt.",
    ibmIConcept:
      "A user profile is the identity record IBM i uses for sign-on, menu routing, special authorities, and password policy. Profiles are first-class evidence, not just accounts in an AD sense.",
    whyUnique:
      "This lab ships two lanes with different authority: AUDIT proves claims; QSECOFR shows why those claims exist. Same partition, two worldviews. You cannot get that from a slide deck or a generic GRC platform demo.",
    controlAngle:
      "Control testers should know what their review profile can and cannot do before they trust their own test results.",
    watchFor: ["MAIN menu or command line after successful sign-on", "No authority failure message"],
    tips: [
      "If sign-on fails, verify caps lock and profile spelling (DEMO)",
      "Scored paths use AUDIT, APCLERK, or QSECOFR, not DEMO",
    ],
    isSignOn: true,
  },
  {
    id: "go-audit",
    phase: "Navigate",
    title: "Open the audit menu",
    command: "GO AUDIT",
    intro:
      "IBM i operators live in menus and commands interchangeably. GO AUDIT routes you to the audit-focused menu on this synthetic claims system.",
    narrative:
      "Menus are not training wheels. They are how many IBM i shops still navigate decades of operational procedure. Understanding menu paths is part of literacy, not nostalgia.",
    ibmIConcept:
      "GO is the menu navigation verb. Menus are objects on the system (like MAIN, AUDIT, SECURITY) with numbered options that run CL commands or other menus.",
    whyUnique:
      "The lab reproduces menu numbering, spacing, and F3-exit behavior, not a web app facsimile with buttons labeled Audit.",
    controlAngle:
      "Audit programs often document menu paths (security admin reviews WRKUSRPRF weekly). You need to recognize those paths when you see them.",
    watchFor: ["AUDIT menu title", "Numbered options for audit workflows"],
    tips: [
      "Type the command on the ===> line at the bottom and press Enter",
      "F3 exits back one level when you need to go back",
    ],
    exitHint: "Press F3 to step back toward the MAIN menu when you are done here.",
    commandMatch: /^GO\s+AUDIT/i,
  },
  {
    id: "wrkusrprf",
    phase: "Evidence",
    title: "Work with user profiles",
    command: "WRKUSRPRF",
    intro:
      "You are opening the classic administration screen for browsing user profiles. A security officer uses the same pattern, but here you are reviewing, not changing.",
    narrative:
      "Privileged access reviews on IBM i begin with profiles: who exists, who is enabled, who has backup or security admin rights, who has not signed on in months.",
    ibmIConcept:
      "WRK* (work-with) screens are subfile lists: green-screen tables where you type option numbers beside rows (5=display, 4=delete, etc.). This interaction model is ubiquitous on IBM i.",
    whyUnique:
      "Catalog breadth here means WRKUSRPRF is not a screenshot. It is a live list backed by SQLite state, with drill-down options that route to DSP* commands like a real subfile.",
    controlAngle:
      "SOC / ISO controls around privileged access almost always require profile inventory evidence. This is where that inventory starts on IBM i.",
    watchFor: ["Column headers for user, status, class", "Option column on the left"],
    tips: [
      "Option 5 beside a user often drills into DSPUSRPRF",
      "Page Down if the list is long",
      "Press F3 to leave this list when you are done",
    ],
    exitHint: "Done reviewing? Press F3 to step back toward the AUDIT menu.",
    commandMatch: /^WRKUSRPRF/i,
    screenHint: "WRKUSRPRF",
    labMission: "CLAIMS-001",
    frameworkRefs: ["ISO 27001 A.9.2.5", "SOC 2 CC6.1"],
  },
  {
    id: "dsp-oldvendor",
    phase: "Evidence",
    title: "Display OLDVENDOR: dormant contractor profile",
    command: "DSPUSRPRF USRPRF(OLDVENDOR)",
    intro:
      "OLDVENDOR is the offboarding story in CLAIMS400: still enabled years after the vendor relationship ended.",
    narrative:
      "Offboarding failures are identity failures. The profile object is the receipt auditors ask for when TPRM claims access was removed.",
    ibmIConcept:
      "Previous sign-on date, status *ENABLED, and owner fields on DSPUSRPRF are the IBM i evidence for dormant access.",
    whyUnique:
      "Scenario seed dates (01/17/23 last sign-on) make the dormancy visible without fake tutorial banners on the green screen.",
    controlAngle:
      "ISO 27001 A.9.2.5 / NIST AC-2(3): prove contractor IDs are disabled or removed when work ends.",
    watchFor: ["Status *ENABLED", "Previous sign-on 01/17/23", "Owner *NONE", "Former vendor text"],
    tips: [
      "Compare to BACKUPADM on WRKUSRPRF. Different risk, same review technique.",
      "Press F3 to return to the profile list when finished.",
    ],
    exitHint: "Press F3 to go back to WRKUSRPRF or the menu.",
    commandMatch: /DSPUSRPRF.*OLDVENDOR/i,
    screenHint: "DSPUSRPRF",
    articleUrl:
      "https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie",
    labMission: "CLAIMS-002",
    frameworkRefs: ["ISO 27001 A.9.2.5", "NIST AC-2(3)", "COBIT BAI09.02"],
  },
  {
    id: "dsp-backupadm",
    phase: "Evidence",
    title: "Display BACKUPADM: a privileged profile",
    command: "DSPUSRPRF USRPRF(BACKUPADM)",
    intro:
      "BACKUPADM is a deliberately risky training persona: backup operators should not casually hold far-reaching special authorities. You are inspecting the profile detail screen.",
    narrative:
      "Auditors flag backup admin accounts because they bypass normal change control. On IBM i, that risk shows up as special authorities like *SAVSYS and *ALLOBJ on the profile, not hidden in a cloud IAM JSON file.",
    ibmIConcept:
      "DSPUSRPRF shows user class, group profile, status, last sign-on, initial menu, and the special authority list (*ALLOBJ, *SAVSYS, …). These fields map directly to IBM i security reference material.",
    whyUnique:
      "The display layout mirrors IBM i field order and naming. The side panel explains; the terminal does not lecture you. That is the same separation a real operator expects.",
    controlAngle:
      "For access reviews: capture profile name, status, special authorities, and last sign-on. A control is not we have a policy. It is demonstrable configuration.",
    watchFor: [
      "Special authorities list. Are any present?",
      "Status *ENABLED vs *DISABLED",
      "Last sign-on date (stale accounts are findings)",
    ],
    tips: [
      "F1 help is available on many screens in the lab",
      "Compare BACKUPADM to APCLERK later mentally. Contrast matters.",
      "Press F3 when you are done on this screen.",
    ],
    exitHint: "Press F3 to return to WRKUSRPRF or the menu.",
    commandMatch: /DSPUSRPRF.*BACKUPADM/i,
  },
  {
    id: "qsecurity",
    phase: "Evidence",
    title: "Display QSECURITY: system security level",
    command: "DSPSYSVAL SYSVAL(QSECURITY)",
    intro:
      "System values are global configuration knobs. QSECURITY is the security level (historically 20–40) that influences password rules, auditing defaults, and more.",
    narrative:
      "Checklist auditors ask for security level on IBM i because it frames how strict the partition baseline is. A finding might be QSECURITY not at expected value for policy.",
    ibmIConcept:
      "DSPSYSVAL displays one system value; WRKSYSVAL lists many. System values are not registry keys. They are a documented IBM i abstraction with audit and change implications.",
    whyUnique:
      "You can display and (as QSECOFR) change system values with audit side effects in this lab. That is rare outside expensive sandboxes.",
    controlAngle:
      "Map QSECURITY to your control library (e.g., baseline configuration / secure settings). Evidence is the displayed value plus change journal if someone altered it.",
    watchFor: ["Current value and description text", "Whether value matches policy expectation"],
    tips: [
      "Try DSPSYSVAL SYSVAL(QAUDCTL) later for audit control level",
      "System values often appear in hardening guides",
      "Press F3 when you are done on this screen.",
    ],
    exitHint: "Press F3 to return to the prior menu.",
    commandMatch: /DSPSYSVAL.*QSECURITY/i,
  },
  {
    id: "paymst",
    phase: "Evidence",
    title: "Display object authority on PAYMST",
    command: "DSPOBJAUT OBJ(PAYROLL/PAYMST) OBJTYPE(*FILE)",
    intro:
      "Files live in libraries (PAYROLL/PAYMST). Object authority determines who can read, change, or execute, separate from menu access.",
    narrative:
      "Segregation-of-duties findings often sound like payroll clerk can post to GL. On IBM i that is frequently an object authority problem: *PUBLIC authority, user-specific authorities, or group profiles.",
    ibmIConcept:
      "Libraries are namespaces (like PAYROLL). Objects have types (*FILE, *PGM, …). DSPOBJAUT is the standard authority review command. Table-based in the lab, conceptually faithful to IBM i.",
    whyUnique:
      "GRC tools rarely show *PUBLIC authority on a payroll file next to a 5250 session. Here you collect that evidence in context, not as an exported CSV detached from the system.",
    controlAngle:
      "Classic test: can someone who should only read payroll also change the file or run a program that bypasses controls? Object authority answers that.",
    watchFor: [
      "*PUBLIC authority row. Overly permissive?",
      "Individual user authorities on sensitive file",
      "Whether AP clerk profiles have more than read",
    ],
    tips: [
      "Library/object syntax is LIBRARY/OBJECT",
      "Object type matters. Always specify OBJTYPE for files.",
      "Press F3 to exit DSPOBJAUT when finished.",
    ],
    exitHint: "Press F3 to step back toward the AUDIT menu.",
    commandMatch: /DSPOBJAUT.*PAYMST/i,
    labMission: "CLAIMS-001",
    frameworkRefs: ["ISO 27001 A.9.1.2", "ISO 27701 Clause 8"],
  },
  {
    id: "dspfd",
    phase: "Evidence",
    title: "Display file description: where SSN lives",
    command: "DSPFD FILE(PAYROLL/PAYMST)",
    intro:
      "Object authority tells you who can open the file. DSPFD tells you what is inside: field names, types, and the SSN column in the record format.",
    narrative:
      "Privacy officers ask for data inventories. On IBM i, the inventory starts at DSPFD and DSPFFD, not a cloud console. Clause 8 operational privacy is literally visible in the field list.",
    ibmIConcept:
      "Physical files (*PF) have record formats and fields. PAYMST is the payroll master: EMPNO, SSN, PAYRATE, DEPT in this scenario.",
    whyUnique:
      "The lab marks *PII beside SSN on the green screen and ties it to the same SQLite state as DSPOBJAUT. Article proof, lab pudding.",
    controlAngle:
      "ISO 27701 Clause 8: prove you know which native files store personal data before you attest processing controls.",
    watchFor: ["SSN field in the list", "*PII marker", "Record format PAYR"],
    tips: [
      "Pair with WRKJOBSCDE next. Batch jobs read this file.",
      "Compare to your data map / RoPA",
      "Press F3 when you are done reviewing fields.",
    ],
    exitHint: "Press F3 to return to the prior screen.",
    commandMatch: /DSPFD.*PAYMST/i,
    screenHint: "DSPFD",
    articleUrl:
      "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia",
    labMission: "CLAIMS-003",
    frameworkRefs: ["ISO 27701 Clause 8"],
  },
  {
    id: "wrkjobscde",
    phase: "Evidence",
    title: "Work with job schedule: payroll batch",
    command: "WRKJOBSCDE",
    intro:
      "PII processing on IBM i is often batch: nightly close, weekly extracts, IFS exports. WRKJOBSCDE is where those schedules live.",
    narrative:
      "Auditors hear payroll runs at night in interviews. Operators prove it on WRKJOBSCDE. PAYIFSEXP in this lab exports PAYMST to IFS. That is a classic privacy finding path.",
    ibmIConcept:
      "Job schedule entries run CL commands on a timer under a named user profile (here PAYADMIN). Option 5 displays DSPJOBSCDE.",
    whyUnique:
      "PAYROLLNGT and PAYIFSEXP are scenario-seeded with realistic command text, not generic NIGHTLY/WEEKLY placeholders.",
    controlAngle:
      "Operational privacy: who approved the export job, how is output protected, and is access logged?",
    watchFor: ["PAYIFSEXP CPYTOIMPF command", "PAYADMIN user", "*ENABLED status"],
    tips: [
      "Option 5 on PAYIFSEXP",
      "Read the privacy note on DSPJOBSCDE",
      "Press F3 to leave the schedule list when done.",
    ],
    exitHint: "Press F3 to step back from WRKJOBSCDE.",
    commandMatch: /^WRKJOBSCDE/i,
    screenHint: "WRKJOBSCDE",
    articleUrl:
      "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia",
    labMission: "CLAIMS-003",
    frameworkRefs: ["ISO 27701 Clause 8", "Batch processing"],
  },
  {
    id: "wrklnk-payroll",
    phase: "Evidence",
    title: "IFS payroll path: paymst.sym",
    command: "WRKLNK OBJ('/payroll')",
    intro:
      "Integration teams use IFS symlinks to bridge native DB2 files and directories. Auditors must follow the path.",
    narrative:
      "Your Clause 8 article names IFS data flows. paymst.sym points at PAYROLL/PAYMST. That is the same file you just reviewed.",
    ibmIConcept:
      "WRKLNK lists object links in an IFS directory. SYMLNK entries show the native target path.",
    whyUnique:
      "Seeded /payroll/paymst.sym with PAYADMIN ownership. Realistic integration story on a synthetic partition.",
    controlAngle:
      "Privacy impact: native authority + IFS path + batch export = full data-flow evidence chain.",
    watchFor: ["paymst.sym", "SYMLNK target PAYMST.FILE", "Owner PAYADMIN"],
    tips: [
      "Compare IFS owner to DSPOBJAUT users",
      "Mention in WRKFINDING",
      "Press F3 when you are done in this directory.",
    ],
    exitHint: "Press F3 to return to the prior screen.",
    commandMatch: /WRKLNK.*payroll/i,
    screenHint: "WRKLNK",
    articleUrl:
      "https://www.linkedin.com/posts/john-flack_i-on-grc-iso-27701-clause-8-the-ibm-i-activity-7441139584916180992-Tfia",
    labMission: "CLAIMS-003",
    frameworkRefs: ["ISO 27701 Clause 8", "IFS integration"],
  },
  {
    id: "dspjrn",
    phase: "Evidence",
    title: "Display the security audit journal",
    command: "DSPJRN JRN(QSYS/QAUDJRN)",
    intro:
      "QAUDJRN is the archetypal security audit journal on IBM i. It records security-relevant events when auditing is configured: profile changes, authority changes, and more.",
    narrative:
      "Audit journal review is the bridge between IT operations and assurance. You are not done when you saw a screen. You ask what got logged when someone changed it.",
    ibmIConcept:
      "Journals are append-only logs with entries (JOENT), codes, severity, and timestamps. DSPJRN and WRKJRN are standard operator/auditor interfaces.",
    whyUnique:
      "Mutations in this lab write synthetic journal rows inspired by QAUDJRN. Later, when QSECOFR disables a profile, you can correlate cause (command) with effect (journal).",
    controlAngle:
      "Controls over logging and monitoring require evidence that security events are captured and reviewable, not just that SIEM exists somewhere else.",
    watchFor: ["Journal name QSYS/QAUDJRN", "Entry list with codes and timestamps", "Lab-generated entries marked synthetic"],
    tips: [
      "Scroll the subfile for older entries",
      "Press F3 to exit the journal when finished.",
    ],
    exitHint: "Press F3 to return to the AUDIT menu.",
    commandMatch: /DSPJRN/i,
  },
  {
    id: "finding",
    phase: "Conclude",
    title: "Document a finding",
    command: "WRKFINDING",
    intro:
      "Findings connect technical evidence to control language. The lab includes a finding editor so you practice writing what you would put in a workpaper.",
    narrative:
      "The failure mode for new GRC hires is collecting screenshots without conclusions. WRKFINDING forces the translation: observation to risk to recommendation.",
    ibmIConcept:
      "On real audits the tool might be TeamMate, ACL, or a ticket. On IBM i the skill is still narrative: what control, what evidence, what exception.",
    whyUnique:
      "Mission scoring, evidence checklists, and exportable packets are built into the same runtime as the 5250 session, not a separate LMS quiz.",
    controlAngle:
      "A finding should cite the command/screen evidence (profile, object authority, journal) and state impact in plain language stakeholders understand.",
    watchFor: ["Finding editor screen", "Fields for condition, risk, recommendation", "Decision impact field"],
    tips: [
      "Reference BACKUPADM, QSECURITY, PAYMST, or journal entries explicitly",
      "Fill Decision impact (15+ chars). SUBMITMSN requires it on scored paths.",
      "Keep one finding focused, not a laundry list",
      "Press F3 to cancel without saving if you need to go back.",
    ],
    exitHint: "Press F3 to exit the finding editor without saving.",
    commandMatch: /^WRKFINDING/i,
    articleUrl: "https://www.linkedin.com/pulse/soc-2-ibm-i-john-flack-0bj8e",
    labMission: "CLAIMS-008",
    frameworkRefs: ["SOC 2 CC6.1", "SOC 2 CC7.2", "Finding quality"],
  },
  {
    id: "submit",
    phase: "Conclude",
    title: "Close the demo: run SUBMITMSN",
    command: "SUBMITMSN",
    intro:
      "One last command closes the showroom loop. On scored paths, SUBMITMSN exports a mission report. Here it marks demo complete and points you to the gamified skill paths.",
    narrative:
      "The demo showed where evidence lives on IBM i. Scored paths add the game loop: evidence checklists, finding quality, mission scoring, campaign progress, and exportable workpapers. That is what you pick next.",
    ibmIConcept:
      "On production systems you would archive spool files, journals, and change tickets. Here SUBMITMSN compresses that into lab artifacts under data/reports and data/evidence-packets.",
    whyUnique:
      "Only Legacy Control Lab gives you the same green-screen commands in an unscored tour, then i on GRC article practice or mission scoring when you sign on as IONGRC, AUDIT, APCLERK, or QSECOFR.",
    controlAngle:
      "If you cannot produce a reproducible evidence trail, you do not have an audit. You have a conversation.",
    watchFor: [
      'Red "Demo Complete!" message on the green screen',
      "Pick i on GRC practice or a scored path card below",
    ],
    tips: [
      "Type SUBMITMSN on ===> and press Enter",
      "Sign off DEMO (SIGNOFF) before signing on IONGRC, AUDIT, APCLERK, or QSECOFR",
      "Training password is TRAIN for scored profiles; IONGRC password is IONGRC",
    ],
    exitHint: "After Demo Complete!, pick i on GRC or a scored path in the panel below.",
    commandMatch: /^SUBMITMSN/i,
    labMission: "CLAIMS-008",
  },
];

/** @deprecated Operator walkthrough removed from showroom — use operator skill path */
const OPERATOR_STEPS: DemoStep[] = [
  {
    id: "welcome",
    phase: "Orient",
    title: "Welcome — the other half of the story",
    command: "(Read first — you will sign on as QSECOFR next)",
    intro:
      "You just saw what an auditor can observe. This path shows what a security officer can change — and what gets logged when they do.",
    narrative:
      "Risk teams need both lenses. Without operator literacy, auditors over-trust interviews. Without audit literacy, operators dismiss GRC as paperwork. Legacy Control Lab trains the handshake.",
    ibmIConcept:
      "QSECOFR is the famed security officer profile on IBM i — broad special authorities, separate from everyday users. It is not the same as service tools (DST), which this lab deliberately does not simulate.",
    whyUnique:
      "A full synthetic QSECOFR lane with SECURITY menu, CHG* mutations, job log + journal side effects, and privileged reporting — in a browser, locally — does not exist elsewhere in the open ecosystem.",
    controlAngle:
      "Privileged access management controls assume you know what “break-glass” looks like on the platform. This is that look, safely.",
    watchFor: ["Prior AUDIT session signed off if you are switching lanes", "Sign-on screen ready"],
    tips: ["From AUDIT lane: type SIGNOFF on the command line first", "Then sign on QSECOFR / TRAIN"],
  },
  {
    id: "signon",
    phase: "Orient",
    title: "Sign on as QSECOFR",
    command: "User: QSECOFR   Password: TRAIN",
    commandNote: "Sign-on screen fields — not the ===> command line.",
    intro:
      "QSECOFR lands on the SECURITY menu — the operational home for security administration on this lab partition.",
    narrative:
      "This is the profile every IBM i shop respects and fears. Controls exist because this profile can bypass them if misused.",
    ibmIConcept:
      "Special authorities (*ALLOBJ, *SECADM, *AUDIT, …) are displayed on DSPUSRPRF and DSPPRVSSN. They are not RBAC roles in a SaaS sense — they are platform-native privilege.",
    whyUnique:
      "The terminal does not water down QSECOFR into a “learning mode” banner. It behaves like IBM i; this panel carries the teaching load.",
    controlAngle:
      "SOC 2 / ISO privileged access controls should reference who can obtain this class of access, how it is approved, and how use is logged.",
    watchFor: ["SECURITY menu after sign-on", "No tutorial overlay on the green screen"],
    tips: ["F3 from most screens returns toward SECURITY", "Coach on the right explains each screen live"],
    isSignOn: true,
  },
  {
    id: "dsp-qsecofr",
    phase: "Evidence",
    title: "Display the QSECOFR profile",
    command: "DSPUSRPRF USRPRF(QSECOFR)",
    intro:
      "Before you change anything, look in the mirror: what can this session actually do?",
    narrative:
      "Assessors ask operators to demonstrate least privilege — but first you must document what full privilege looks like on the platform.",
    ibmIConcept:
      "User class *SECOFR and the special authority list are the IBM i vocabulary for “this is god mode on the partition (not the network, not the datacenter).”",
    whyUnique:
      "DSPUSRPRF layout follows IBM i conventions — status line, field blocks, green-screen density — not a React card titled “User Details.”",
    controlAngle:
      "Emergency access reviews compare active QSECOFR usage to policy; you need baseline profile documentation.",
    watchFor: ["User class *SECOFR", "Long special authority list", "Status *ENABLED"],
    tips: ["Contrast this screen mentally with BACKUPADM from the auditor path", "Note initial menu SECURITY"],
    commandMatch: /DSPUSRPRF.*QSECOFR/i,
    screenHint: "DSPUSRPRF",
  },
  {
    id: "dspprvssn",
    phase: "Evidence",
    title: "Privileged session summary",
    command: "DSPPRVSSN",
    intro:
      "DSPPRVSSN is a lab command that summarizes what this session can do right now — authorities, libraries, runtime metadata.",
    narrative:
      "Modern PAM tools show session recording; IBM i operators traditionally infer privilege from profile + adopted authority. This screen makes the session explicit for training.",
    ibmIConcept:
      "Session identity on IBM i includes current library, job name, and effective authorities for the running job — subtleties that matter during elevation events.",
    whyUnique:
      "Purpose-built for governance storytelling — connects abstract “privileged user” labels to a 5250 session summary auditors can screenshot.",
    controlAngle:
      "Periodic privileged session review: who is signed on with elevated rights right now?",
    watchFor: ["Special authorities echoed", "Session/job identifiers", "System name CLAIMS400"],
    tips: ["Run this after any CHG* command to see if session context changed", "Compare to auditor’s limited view"],
    commandMatch: /^DSPPRVSSN/i,
  },
  {
    id: "go-security",
    phase: "Navigate",
    title: "Open the SECURITY menu",
    command: "GO SECURITY",
    intro:
      "SECURITY is the menu hub for administration tasks — profiles, authorities, system values, journals.",
    narrative:
      "Operators do not memorize 300 commands on day one. They memorize menus, then commands, then option numbers.",
    ibmIConcept:
      "Menu SECxxx options map to CL commands (DSPUSRPRF, WRKUSRPRF, …). This is the operational UX IBM i admins recognize instantly.",
    whyUnique:
      "Fifteen-option SECURITY menu with two-column layout was a Phase 6.5 fidelity target — because recognition matters for credibility.",
    controlAngle:
      "Change management often references “security menu path used” — you are learning that path.",
    watchFor: ["SECURITY menu header", "Options for profiles, authority, system values"],
    tips: ["Option numbers can be typed in the selection field", "F3 returns toward your initial menu"],
    commandMatch: /^GO\s+SECURITY/i,
  },
  {
    id: "anzprfact",
    phase: "Evidence",
    title: "Analyze inactive profiles",
    command: "ANZPRFACT INACT(90)",
    intro:
      "Before disabling accounts, operators often run inactive-profile analysis to see who exceeds the threshold.",
    narrative:
      "This is the scheduled hygiene step your Offboarding article describes — not just finding OLDVENDOR, but proving the sweep exists.",
    ibmIConcept:
      "ANZPRFACT with INACT(n) lists profiles whose last sign-on exceeds n days. CHGACTPRFL can exempt justified privileged IDs like BACKUPADM.",
    whyUnique:
      "The lab computes idle days from seeded last-sign-on dates and shows candidates in an IBM-style column layout.",
    controlAngle:
      "Access termination controls need both detection (inactive analysis) and exemption governance (activity profile list).",
    watchFor: ["INACT threshold 90 days", "OLDVENDOR in candidate list", "Exempt profiles line after CHGACTPRFL"],
    tips: ["Run CHGACTPRFL USRPRF(BACKUPADM) STATUS(*ACTIVE) before disable if policy requires exemption"],
    commandMatch: /ANZPRFACT/i,
    screenHint: "ANZPRFACT",
    articleUrl:
      "https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie",
    labMission: "CLAIMS-002",
    frameworkRefs: ["ISO 27001 A.9.2.6", "NIST AC-2(3)"],
  },
  {
    id: "chgactprfl",
    phase: "Mutate",
    title: "Exempt BACKUPADM on the activity profile list",
    command: "CHGACTPRFL USRPRF(BACKUPADM) STATUS(*ACTIVE)",
    intro:
      "Privileged backup operators may be legitimately idle but still required. CHGACTPRFL documents that exemption on IBM i.",
    narrative:
      "Auditors distinguish “dormant vendor” from “stale but approved break-glass.” This command is how operators mark the difference.",
    ibmIConcept:
      "The activity profile list prevents automated inactive-profile disable from touching exempted profiles.",
    whyUnique:
      "CHGACTPRFL returns an activity list screen with CPI9897 — not a generic web toast.",
    controlAngle:
      "Privileged access reviews must show both candidates for removal and documented exemptions.",
    watchFor: ["BACKUPADM *ACTIVE on list", "CPI9897 completion message"],
    tips: ["DSPUSRPRF USRPRF(BACKUPADM) shows Activity list exempt *YES afterward"],
    commandMatch: /CHGACTPRFL.*BACKUPADM/i,
    articleUrl:
      "https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie",
    labMission: "CLAIMS-002",
  },
  {
    id: "chg-oldvendor",
    phase: "Mutate",
    title: "Disable OLDVENDOR — make a governed change",
    command: "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)",
    intro:
      "OLDVENDOR is a stale vendor profile in the scenario. Disabling it is a realistic security hygiene action — and it should leave fingerprints.",
    narrative:
      "This is the moment the demo stops being read-only. GRC is not only about finding problems — it is about proving change is controlled and logged.",
    ibmIConcept:
      "CHGUSRPRF mutates the user profile object. Status *DISABLED prevents sign-on. Real IBM i shops pair this with ticket IDs and approvals.",
    whyUnique:
      "The mutation updates SQLite state, writes synthetic audit journal rows, and job log messages — cause and effect in one runtime, instantly.",
    controlAngle:
      "Access termination / vendor offboarding controls: demonstrate disable action + log evidence + ticket reference.",
    watchFor: [
      "Completion message on terminal status line",
      "No CPF authority failure (you have rights as QSECOFR)",
    ],
    tips: [
      "DSPUSRPRF USRPRF(OLDVENDOR) afterward to verify status",
      "Remember what auditors will see in DSPJRN",
    ],
    commandMatch: /CHGUSRPRF.*OLDVENDOR/i,
    articleUrl:
      "https://www.linkedin.com/pulse/ibm-i-offboarding-profiles-you-didnt-revoke-john-flack-oplie",
    labMission: "CLAIMS-002",
    frameworkRefs: ["ISO 27001 A.9.2.5", "Vendor offboarding"],
  },
  {
    id: "dspjoblog",
    phase: "Mutate",
    title: "Display the job log",
    command: "DSPJOBLOG",
    intro:
      "Job logs capture messages for the active job — including command diagnostics and lab-generated narrative of what happened.",
    narrative:
      "Operators troubleshoot from job logs; auditors request them after incidents. Seeing your CHGUSRPRF echoed here closes the loop.",
    ibmIConcept:
      "Every interactive session is a job on IBM i. DSPJOBLOG is the first place an admin looks when a command “worked but something feels off.”",
    whyUnique:
      "Side effects are not fake toasts in a web UI — they are job log + journal patterns modeled on IBM i conventions.",
    controlAngle:
      "Logging & monitoring controls often require job-level traceability for privileged commands.",
    watchFor: ["CHGUSRPRF or profile change referenced", "Timestamped messages"],
    tips: ["Contrast with SIEM — this is partition-native evidence", "F10 or page keys may scroll messages"],
    commandMatch: /^DSPJOBLOG/i,
  },
  {
    id: "dspjrn",
    phase: "Mutate",
    title: "Audit journal — proof the change was recorded",
    command: "DSPJRN JRN(QSYS/QAUDJRN)",
    intro:
      "Return to the same journal the auditor path reviewed — now look for entries caused by your session.",
    narrative:
      "This is the “aha” for GRC audiences: the operator action and the auditor evidence are the same object viewed from two roles.",
    ibmIConcept:
      "Audit journal entries carry journal codes tying to security events. Real reviews filter by user, time, and code.",
    whyUnique:
      "Cross-lane narrative in one Docker image — AUDIT collects; QSECOFR generates; journal connects them. That is the training story no checklist PDF replicates.",
    controlAngle:
      "Immutable audit trail / logging controls — show that privileged changes produce reviewable records.",
    watchFor: ["New entries after CHGUSRPRF", "User QSECOFR on entries", "Synthetic lab markers in text"],
    tips: ["Imagine exporting this for a workpaper", "Pair with DSPEVDDIFF next"],
    commandMatch: /DSPJRN/i,
  },
  {
    id: "dspevddiff",
    phase: "Mutate",
    title: "Evidence diff — before and after",
    command: "DSPEVDDIFF TYPE(*USRPRF)",
    intro:
      "DSPEVDDIFF shows what changed in session state — the lab’s governance microscope for mutations.",
    narrative:
      "Auditors live in diffs: what was configured vs what is configured now. This command makes that visible without a database query.",
    ibmIConcept:
      "Change detection on IBM i in production might use journal exits, SIEM forwarding, or change management tickets — the need is the same.",
    whyUnique:
      "Purpose-built for teaching state mutation — rare even in commercial IBM i training VMs, which often reset silently.",
    controlAngle:
      "Configuration management / change detection controls — demonstrate you can identify what changed, when, and by whom.",
    watchFor: ["OLDVENDOR status change", "Field-level before/after", "USRPRF object type"],
    tips: ["Reference this in a finding if you switch back to auditor lane", "GENRPT next packages the story"],
    commandMatch: /DSPEVDDIFF/i,
    articleUrl: "https://www.linkedin.com/pulse/can-you-blue-team-ibm-i-john-flack-w5bse",
    frameworkRefs: ["Change detection", "Privileged session review"],
  },
  {
    id: "genrpt",
    phase: "Conclude",
    title: "Generate privileged session report",
    command: "GENRPT TYPE(*PRIV)",
    intro:
      "Close with an operator deliverable — what this powerful session did and why it matters to governance.",
    narrative:
      "Executives do not read 5250 screens. They read reports. Operators and auditors translate green-screen work into artifacts like this.",
    ibmIConcept:
      "On IBM i, reports often land as spool files (*OUTQ). Here GENRPT writes markdown/json under data/reports for easy sharing in training.",
    whyUnique:
      "End-to-end: privileged action → journal → diff → report, in under five minutes, on a laptop, with no IBM i partition fee.",
    controlAngle:
      "Privileged access review meetings need summaries tied to evidence — not vibes.",
    watchFor: ["Report generated confirmation", "Path or filename in message"],
    tips: [
      "Use Continue as AUDIT or QSECOFR below to keep working with the live coach",
      "Re-run the auditor path to see if your change affects their evidence story",
    ],
    commandMatch: /GENRPT.*PRIV/i,
  },
];

export function demoStepsForPath(_path: DemoPath): DemoStep[] {
  return PRODUCT_DEMO_STEPS;
}

export function normalizeDemoPath(pathParam?: string | null): DemoPath {
  if (pathParam === "product" || pathParam === "auditor") return "product";
  return "product";
}

export function buildDemoTrainerPayload(
  path: DemoPath,
  stepIndex = 0,
  systemName = "CLAIMS400",
  screenId?: string,
) {
  const steps = demoStepsForPath(path);
  const index = Math.max(0, Math.min(stepIndex, steps.length - 1));
  const rawStep = steps[index]!;
  const step = {
    ...rawStep,
    command: hydrateSignOnCopy(rawStep.command, systemName),
    commandNote: rawStep.commandNote
      ? hydrateSignOnCopy(rawStep.commandNote, systemName)
      : undefined,
    tips: (rawStep.tips ?? []).map((tip) => hydrateSignOnCopy(tip, systemName)),
    exitHint: rawStep.exitHint
      ? hydrateSignOnCopy(rawStep.exitHint, systemName)
      : undefined,
  };
  const pathIntro =
    "Sign on as DEMO / TRAIN for an unscored product walkthrough. Pick a scored skill path when you are ready.";

  return {
    path,
    pathIntro,
    stepIndex: index,
    stepCount: steps.length,
    isLastStep: index >= steps.length - 1,
    uniquenessSummary:
      "Legacy Control Lab is a local IBM i-style governance range. Real command fidelity, synthetic audit evidence, two authority lanes, and exportable workpapers. No IBM hardware required.",
    screenGuide: resolveDemoScreenGuide(index, screenId),
    step: {
      id: step.id,
      phase: step.phase,
      title: step.title,
      command: step.command,
      commandNote: step.commandNote,
      exitHint: step.exitHint,
      intro: step.intro,
      narrative: step.narrative,
      ibmIConcept: step.ibmIConcept,
      whyUnique: step.whyUnique,
      controlAngle: step.controlAngle,
      watchFor: step.watchFor,
      tips: step.tips,
      isSignOn: step.isSignOn ?? false,
      articleUrl: step.articleUrl,
      labMission: step.labMission,
      frameworkRefs: step.frameworkRefs,
    },
    steps: steps.map((s, i) => ({ id: s.id, title: s.title, phase: s.phase, index: i })),
  };
}

export function detectDemoStepAdvance(
  path: DemoPath,
  stepIndex: number,
  lastCommand?: string,
  screenId?: string,
  signedOnUser?: string,
): number | null {
  const steps = demoStepsForPath(path);
  const step = steps[stepIndex];
  if (!step) return null;

  const trimmedCommand = lastCommand?.trim() ?? "";

  if (isDemoSignedOn(signedOnUser) && isPostSignOnScreen(screenId)) {
    const signOnStepIndex = steps.findIndex((row) => row.isSignOn);
    const signedOnTarget = demoSignedOnTargetStep(path);
    if (signOnStepIndex >= 0 && stepIndex <= signOnStepIndex && signedOnTarget > stepIndex) {
      return signedOnTarget;
    }
  }

  if (step.commandMatch && trimmedCommand && step.commandMatch.test(trimmedCommand)) {
    return Math.min(stepIndex + 1, steps.length - 1);
  }
  if (step.screenHint && screenId && screenId.toUpperCase().includes(step.screenHint)) {
    if (stepIndex === 0) return stepIndex;
    // Shared screens (e.g. DSPUSRPRF for OLDVENDOR then BACKUPADM) must not advance
    // until this step's command was actually run.
    if (step.commandMatch && !step.commandMatch.test(trimmedCommand)) {
      return null;
    }
    return Math.min(stepIndex + 1, steps.length - 1);
  }
  return null;
}

export type DemoScreenGuide = {
  headline: string;
  bullets: string[];
  matched: boolean;
};

function onScreenBullets(step: DemoStep): string[] {
  switch (step.id) {
    case "wrkusrprf":
      return [
        "Type option 5 beside a user row, then press Enter to display that profile.",
        "Use Page Down if the list is longer than one screen.",
        "Press F3 when you are done to step back toward the menu.",
      ];
    case "dsp-oldvendor":
    case "dsp-backupadm":
      return [
        "Read status, last sign-on, and special authorities on this screen.",
        "Press F3 to return to the profile list or menu when finished.",
      ];
    case "qsecurity":
      return ["Note the displayed value and description.", "Press F3 to go back when done."];
    case "paymst":
      return ["Review *PUBLIC and named user authorities.", "Press F3 to exit DSPOBJAUT."];
    case "dspfd":
      return ["Find the SSN field in the record format list.", "Press F3 when you are finished."];
    case "wrkjobscde":
      return ["Type option 5 beside PAYIFSEXP to display that schedule entry.", "Press F3 to leave the schedule list."];
    case "wrklnk-payroll":
      return ["Look for paymst.sym and its native target.", "Press F3 to return to the prior screen."];
    case "dspjrn":
      return ["Scroll the journal entries with Page Down if needed.", "Press F3 to exit the journal display."];
    case "finding":
      return ["Fill in the finding fields on this screen.", "Press F3 to cancel without saving if you need to go back."];
    case "submit":
      return [
        "Type SUBMITMSN on ===> and press Enter.",
        'Look for Demo Complete! in red at the bottom of the menu.',
        "Then pick a scored skill path in the help panel.",
      ];
    case "go-audit":
      return [
        "You should see numbered AUDIT menu options.",
        "Type the next command on ===> or pick a menu option, then press Enter.",
        "Press F3 to return to the prior menu.",
      ];
    default:
      return step.exitHint ? [step.exitHint] : ["Press F3 to back out one screen when you are done here."];
  }
}

export function resolveDemoScreenGuide(
  stepIndex: number,
  screenId?: string,
  lastCommand?: string,
): DemoScreenGuide {
  const steps = PRODUCT_DEMO_STEPS;
  const step = steps[stepIndex];
  if (!step) {
    return { headline: "Follow the steps in this panel.", bullets: [], matched: false };
  }

  if (step.id === "submit" && isDemoSubmitComplete(lastCommand)) {
    return {
      headline: "Demo complete. Time for a scored path.",
      bullets: [
        'The green screen should show Demo Complete! in red at the bottom of the menu.',
        "In 60 seconds you'll be signed off automatically and the coach panel will close.",
        "Pick a path below to continue without waiting, or type SIGNOFF on ===> now.",
        "Scored paths turn on evidence checklists, findings, mission scoring, and campaign progress.",
      ],
      matched: true,
    };
  }

  if (step.id === "submit") {
    return {
      headline: "Last step: run SUBMITMSN to finish the demo.",
      bullets: [
        "Type SUBMITMSN on the ===> command line and press Enter.",
        "You will not get a scored report in demo mode. You will get Demo Complete! instead.",
        "Then use Pick a scored skill path below to start the gamified coach.",
      ],
      matched: false,
    };
  }

  const screen = (screenId ?? "DISCONNECTED").trim().toUpperCase();
  const onSignOn = screen === "DISCONNECTED" || screen.includes("SIGNON") || screen === "SIGNON";

  if (step.id === "welcome" || step.isSignOn) {
    if (onSignOn) {
      return {
        headline: "You are on the sign-on screen.",
        bullets: [
          "Click inside the green screen if the keyboard does not respond.",
          "Tab to User, type DEMO, Tab to Password, type TRAIN, then press Enter.",
          "Do not type credentials on the ===> command line.",
        ],
        matched: screen.includes("SIGNON") || screen === "DISCONNECTED",
      };
    }
    return {
      headline: "Next: sign on with DEMO / TRAIN.",
      bullets: [
        "Use the credentials card at the top of this panel.",
        "Wait for the sign-on screen in the green screen on the left.",
      ],
      matched: false,
    };
  }

  if (step.screenHint && screen.includes(step.screenHint.toUpperCase())) {
    return {
      headline: `Good. You are on the right screen for this step.`,
      bullets: onScreenBullets(step),
      matched: true,
    };
  }

  if (step.id === "go-audit" && screen.includes("AUDIT") && !screen.includes("AUDITMENU")) {
    return {
      headline: "You are on the AUDIT menu.",
      bullets: onScreenBullets(step),
      matched: true,
    };
  }

  if (step.id === "go-audit" && screen === "MAIN") {
    return {
      headline: "From the MAIN menu, open the audit path.",
      bullets: [
        "Type GO AUDIT on the ===> command line and press Enter.",
        "Or use the menu option shown in your step card below.",
      ],
      matched: false,
    };
  }

  const commandPreview = step.command.startsWith("(") ? step.title : step.command;
  return {
    headline: `This step: ${step.title}`,
    bullets: [
      `Run: ${commandPreview}`,
      "If you are lost, press F3 until you see the ===> command line, then type the command below.",
      step.exitHint ?? "Press F3 to back out one screen when you finish reviewing.",
    ],
    matched: false,
  };
}
