import type { ScreenId } from "../screen-runtime/screen.js";
import type { MissionProgress } from "../missions/missionEngine.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import { APP_NAME } from "../branding.js";
import { buildOperatorCoachContext, type OperatorScreenGuide } from "./operatorCoach.js";
import { AUDITOR_INSIGHTS, type CoachInsight } from "./coachInsights.js";
import {
  articleForMission,
  articleForScreen,
  type GrcArticleLink,
} from "../grc/iOnGrcArticles.js";
import {
  disconnectedSignOnHint,
  getTrainingProfileCredentials,
  type TrainingProfileCredentials,
} from "./signOnCredentials.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { getMissionAttempt, listExpectedFindings } from "../db/repositories/missionRepository.js";
import {
  buildCampaignProgress,
  buildCampaignQuest,
  buildCampaignTracks,
  buildMissionProgression,
  buildPlaybookGuide,
  buildSignalsFeed,
  buildSubmitDebrief,
  computeInvestigationLeads,
  computeMissionPhase,
  computeMissionReadiness,
  type CampaignProgressSummary,
  type CampaignQuest,
  type CampaignTrackDetail,
  type InvestigationLead,
  type MissionPhase,
  type MissionProgression,
  type MissionReadiness,
  type PlaybookGuide,
  type SignalEntry,
  type SubmitDebrief,
} from "../missions/missionGamification.js";
import { detectDemoStepAdvance, isDemoSubmitComplete, resolveDemoScreenGuide, type DemoPath } from "./demoTrainer.js";
import {
  isIongrcSubmitComplete,
  resolveIongrcScreenGuide,
} from "./iongrcTrainer.js";
import { packIdForMission } from "../grc/articlePacks.js";
import { previewMissionScoreForAttempt } from "../missions/missionEngine.js";
import {
  buildAchievementBadges,
  getMissionPackaging,
  type AchievementBadge,
  type MissionPackaging,
} from "./missionPackaging.js";
import type { EvidenceFocusPanel } from "../grc/evidenceFocusPanels.js";
import {
  buildEvidenceFocusPanel,
  isAuditorEvidenceFocusScreen,
  isOperatorEvidenceFocusScreen,
} from "./evidenceFocus.js";

export {
  AUDITOR_EVIDENCE_FOCUS_SCREENS,
  AUDITOR_GAME_SCREENS,
  AUDITOR_SQL_FOCUS_SCREENS,
  isAuditorEvidenceFocusScreen,
  isAuditorSqlFocusScreen,
  isEvidenceFocusScreen,
  isOperatorEvidenceFocusScreen,
} from "./evidenceFocus.js";

export type CoachContextPayload = {
  lane?: SessionLane;
  mode?: "auditor" | "operator";
  guidanceMode?: string;
  screenId: ScreenId | "DISCONNECTED";
  hints: string[];
  insight?: CoachInsight;
  screenGuide?: OperatorScreenGuide;
  contextArticle?: GrcArticleLink;
  coachEvents?: Array<{ eventKey: string; message: string }>;
  signOnCredentials?: TrainingProfileCredentials;
  missionPhase?: MissionPhase;
  readiness?: MissionReadiness;
  investigationLeads?: InvestigationLead[];
  signals?: SignalEntry[];
  submitDebrief?: SubmitDebrief;
  campaignProgress?: CampaignProgressSummary[];
  campaignTracks?: CampaignTrackDetail[];
  playbookGuide?: PlaybookGuide;
  missionProgression?: MissionProgression;
  campaignQuest?: CampaignQuest;
  missionPackaging?: MissionPackaging;
  achievements?: AchievementBadge[];
  campaignDashboard?: {
    skillPathLabel: string;
    campaignTitle: string;
    completed: number;
    total: number;
    nextMissionId?: string;
    nextMissionTitle?: string;
  };
  demoStepAdvance?: number | null;
  demoScreenGuide?: ReturnType<typeof resolveDemoScreenGuide>;
  demoComplete?: boolean;
  iongrcStepAdvance?: number | null;
  iongrcScreenGuide?: ReturnType<typeof resolveIongrcScreenGuide>;
  iongrcComplete?: boolean;
  iongrcPackId?: string;
  iongrcPointer?: string;
  focusFindingComposer?: boolean;
  missionProgress?: {
    missionId: string;
    attemptId: string;
    evidence: Array<{
      key: string;
      description: string;
      commandPattern: string;
      collected: boolean;
      optional: boolean;
    }>;
    evidenceTags: string[];
    coveragePercent: number;
  };
  findings?: Array<{
    id: string;
    title: string;
    severity: string;
    decisionImpact: string | null;
  }>;
  evidenceFocus?: EvidenceFocusPanel;
  /** @deprecated Use evidenceFocus — kept for older clients */
  sqlEvidenceEngineering?: EvidenceFocusPanel;
};

const SCREEN_HINTS: Partial<Record<ScreenId, string[]>> = {
  MAIN: [
    `This is the post-sign-on hub for the full ${APP_NAME} suite.`,
    "Option 1 opens the governance mission (AUDIT) menu for evidence collection.",
    "Options 2–4 cover range systems, campaigns, and the scorebook.",
    "Options 5–8 reach IBM i evidence paths: security, jobs, spool, and SQL.",
    "Option 9 lists lab command groups; option 12 opens the facilitator workshop.",
    "Type any catalog command on the ===> line — F4 prompts parameters.",
  ],
  AUDIT: [
    "Governance mission menu — work through options in order, or jump to 10 for evidence coverage.",
    "Menu 8 records findings; menu 11 submits the mission. F12 returns to the MAIN hub.",
  ],
  SECURITY: [
    "Security menu — operational IBM i administration entry point for the QSECOFR lane.",
    "Use menu options or type commands directly on the ===> line.",
    "Option 12 opens service tools displays (conceptual only in this lab).",
  ],
  SECTOOLS: [
    "Service tools menu — distinguishes QSECOFR profile from service tools user ID.",
    "DSPSTCONC explains the distinction; this lab does not implement real SST.",
  ],
  DSPPRVSSN: [
    "Privileged session display — profile, authorities, job, and session metadata.",
  ],
  DSPSTCONC: [
    "QSECOFR user profile and QSECOFR service tools user ID are not the same thing.",
  ],
  WRKUSRPRF: [
    "Review privileged profiles: BACKUPADM, OLDVENDOR, and disabled QPGMR.",
    "Option 5 displays profile detail; option 8 shows object authority.",
  ],
  DSPUSRPRF: [
    "Compare last sign-on dates with job role. Stale privileged access is a common finding.",
  ],
  DSPSYSVAL: [
    "QSECURITY level alone does not prove access governance is effective.",
    "Pair system values with profile and authority evidence.",
  ],
  DSPOBJAUT: [
    "PAYROLL/PAYMST public authority is part of the control story on CLAIMS400.",
    "Excessive *CHANGE authority increases blast radius.",
  ],
  DSPJRN: [
    "Audit evidence shows activity; it does not prove quarterly access recertification.",
    "Look for password failures, authority failures, and profile events.",
  ],
  DSPFD: [
    "PAYMST includes SSN — map this field list to your data inventory.",
    "Clause 8 lab path: pair DSPFD with DSPOBJAUT on the same file.",
  ],
  WRKJOBSCDE: [
    "Review PAYROLLNGT and PAYIFSEXP — batch is where PII leaves the green screen.",
    "Option 5 displays DSPJOBSCDE with the scheduled command text.",
  ],
  WRKLNK: [
    "Under /payroll, paymst.sym links to PAYROLL/PAYMST — follow integration paths.",
    "IFS + native file authority are separate controls; review both.",
  ],
  WRKAUTL: [
    "Option 5 on PAYROLL opens DSPAUTL — compare to DSPOBJAUT on PAYMST.",
    "Run EDTAUTL AUTL(PAYROLL) for Clause 10 list remediation.",
  ],
  WRKOBJOWN: [
    "WRKOBJOWN USRPRF(PAYADMIN) — PAYMST ownership vs data-owner accountability.",
    "WRKOBJOWN USRPRF(QPGMR) — disabled profile still owning source files.",
    "Ownership chains can escalate privilege via adopted authority — see DSPPGMADP path.",
    "QMGTOOLS SCTMNU RTVOBJLST complements WRKOBJOWN for support-driven ownership reports.",
    "Option 2 → EDTOBJAUT; option 9 → CHGOBJOWN from command line.",
  ],
  EDTAUTL: [
    "PAYROLL autl: option 4 removes a user; F6 adds via ADDAUTLE on command line.",
    "Clause 10: retain DSPAUTL before/after when remediating list membership.",
  ],
  DSPAUTL: [
    "PAYROLL list should exclude *PUBLIC; members should match payroll roles.",
  ],
  ANZPRFACT: [
    "INACT(90) lists dormant profiles — tie to the Offboarding article path.",
  ],
  DSPSECAUD: [
    "QAUDCTL and AF entries on one screen — Clause 6 monitoring evidence.",
    "Compare to DSPSYSVAL SYSVAL(QAUDCTL) if you need the raw system value.",
  ],
  DSPAUDJRNE: [
    "ENTTYP(AF PW) filters authority and password events — Blue Team triage.",
    "Look for OLDVENDOR AF and BACKUPADM PW in seeded journal.",
  ],
  DSPAUT: [
    "WRKUSRPRF option 8 routes here — special authorities are Clause 6 risk inputs.",
  ],
  FINDING: [
    "Saved findings appear here — compose new findings in the coach panel.",
    "Reference concrete evidence from your checklist before SUBMITMSN.",
  ],
  SUBMITMSN: [
    "Scoring weights evidence coverage, issue identification, interpretation, and finding quality.",
    "Reports export to data/reports/ as Markdown and JSON.",
  ],
  WRKSQLSVC: [
    "IBM i Services catalog — option 5 displays sample SQL, option 6 runs RUNSQL.",
    "F7/F8 pages services; coach rail shows the full evidence-engineering query pack.",
    "Queries use QSYS2 column names from IBM i Services — repeatable on a real partition.",
  ],
  DSPSQLSVC: [
    "Sample SQL for this service view — press F12 to return to WRKSQLSVC.",
    "Option 6 on WRKSQLSVC runs the query and shows tabular results on RUNSQL.",
  ],
  RUNSQL: [
    "Results come from live scenario SQLite state — not a screenshot.",
    "F7/F8 pages rows; compare SQL output to green-screen DSP* commands.",
    "Use WRKSQLSVC (MAIN menu 8) for the full GRC query catalog with previews.",
  ],
  CMDSQL: [
    "WRKSQLSVC lists 20+ GRC-engineering queries with option 1 to run.",
    "RUNSQL is read-only — ideal for access, privacy, detect, and ops evidence.",
  ],
  HELP: ["Type a catalog command on the ===> line or use the AUDIT menu."],
  WRKMBRPDM: [
    "Browse QCLSRC/NIGHTRUN and QRPGLESRC/CLMMAINT for source-level control evidence.",
    "Option 5 or DSPPFM shows member source without a full SEU editor.",
  ],
  DSPPGMREF: [
    "Program-to-file references show which data CLMMAINT and PAYAUTHR can touch.",
    "Cross-reference PAYAUTHR → PAYROLL/PAYMST for segregation-of-duties review.",
  ],
  DSPJOBLOG: [
    "Job logs capture sign-on, command execution, and authority failures.",
    "Compare interactive AUDIT activity with batch BACKUPADM jobs.",
  ],
  EDTOBJAUT: [
    "APCLERK with LMTCPB(*YES) should get CPF9902 — no edit panel on PAYMST.",
    "Red Team CLAIMS-007: denial plus AF journal entry is the finding evidence.",
  ],
  GRTOBJAUT: [
    "Self-grant on PAYROLL/PAYMST is the classic escape attempt for limited users.",
    "Pair denial message with DSPOBJAUT to show authority unchanged.",
  ],
  DSPNETA: [
    "Read-only network recon — Telnet and host-server listeners without admin rights.",
    "Red team path: recon is allowed; escalation to PAYMST authority is not.",
  ],
  WRKSPLF: ["Spooled reports may contain sensitive payroll or audit output."],
  DSPSPLF: ["Review who owns the spool file and whether output queue controls are adequate."],
  DSPPTF: [
    "PTF currency supports patch-management evidence for ITGC missions.",
    "Check Status (Permanent/Temporary) and Action pending for IPL requirements.",
    "Cover letter may mandate maintenance-window IPL — document in WRKFINDING.",
  ],
  WRKPTFGRP: [
    "SF99740 = cumulative package; SF99739 = HIPER group; SF99704 = database group on V7R4.",
    "Compare installed Level to IBM PSP / SYSTOOLS.GROUP_PTF_CURRENCY on production.",
    "MFPTF (missing fix) means a group member was not applied — common audit finding.",
    "QMGTOOLS CMPGRPPTF/CMPHIPER are support tools; WRKPTFGRP is the operator audit path.",
  ],
  WRKSBS: ["Subsystem status shows QINTER, QBATCH, QSERVER, and QHTTPSVR activity."],
  WRKMSGQ: ["QSYSOPR messages often surface authority failures before journal review."],
  STRPDM: ["PDM is the classic IBM i path to libraries, objects, and source members."],
  DSPPFM: ["Source members are evidence artifacts — they do not need to compile in the lab."],
  WRKACTJOB: ["Look for QUSER database and network server jobs alongside BACKUPADM batch work."],
  WRKSYSSTS: ["Job counts here should align with what you see on WRKACTJOB."],
  WRKDSKSTS: ["ASP 1 SSD units carry most interactive workload in this lab partition."],
  WRKSYSACT: ["Watch % CPU and interactive response during backup or batch spikes."],
  DSPEVDDIFF: [
    "This screen summarizes mutable state changes during your attempt.",
    "Use TYPE(*USRPRF), TYPE(*OBJAUT), or TYPE(*SYSVAL) to narrow the diff.",
  ],
  CAMPAIGN: ["Campaign mode lists upcoming missions in the IBM i Access Governance arc."],
};

export type CoachContextOptions = {
  guidanceMode?: string;
  personaId?: string;
  lane?: SessionLane;
  systemName?: string;
  userName?: string;
  helpArticle?: GrcArticleLink;
  previousCollectedKeys?: string[];
  lastCommand?: string;
  demoPath?: DemoPath;
  demoStepIndex?: number;
  iongrcPackId?: string;
  iongrcStepIndex?: number;
  playbookPath?: PlaybookGuide["path"];
  skillPath?: string;
  focusFindingComposer?: boolean;
  sessionId?: string;
};

function mapMissionProgress(progress: MissionProgress) {
  return {
    missionId: progress.missionId,
    attemptId: progress.attemptId,
    evidence: progress.requirements.map((req) => ({
      key: req.requirementKey,
      description: req.description,
      commandPattern: req.commandPattern,
      collected: progress.collected.some((row) => row.requirementKey === req.requirementKey),
      optional: req.optional,
    })),
    evidenceTags: progress.evidenceTags,
    coveragePercent: Math.round(progress.evidenceCoverage.score),
  };
}

function buildAuditorGamification(
  progress: MissionProgress | undefined,
  coachEvents: Array<{ eventKey: string; message: string }> | undefined,
  options?: CoachContextOptions,
) {
  if (!progress) return {};

  const findings = listFindings(progress.attemptId);
  const readiness = computeMissionReadiness(progress, findings);
  const attempt = getMissionAttempt(progress.attemptId);
  const submitted = Boolean(attempt?.submittedAt);
  const missionPhase = computeMissionPhase(readiness, submitted);
  const expected = listExpectedFindings(progress.missionId);
  const collectedKeys = progress.collected.map((row) => row.requirementKey);
  const investigationLeads =
    guidanceHidesLeads(options?.guidanceMode)
      ? undefined
      : computeInvestigationLeads(expected, findings, collectedKeys, progress.evidenceTags);
  const signals = buildSignalsFeed(progress, coachEvents, options?.previousCollectedKeys ?? []);
  const findingsSummary = findings.map((finding) => ({
    id: finding.id,
    title: finding.title,
    severity: finding.severity,
    decisionImpact: finding.decisionImpact,
  }));

  let submitDebrief: SubmitDebrief | undefined;
  let missionProgression: MissionProgression | undefined;
  if (submitted && attempt?.totalScore != null) {
    const breakdown = previewMissionScoreForAttempt(progress.attemptId);
    submitDebrief = buildSubmitDebrief(
      progress.attemptId,
      progress.missionId,
      collectedKeys,
      progress.evidenceTags,
      breakdown ?? {
        totalScore: attempt.totalScore,
        evidenceScore: attempt.evidenceScore ?? 0,
        issuesScore: attempt.issuesScore ?? 0,
        interpretationScore: attempt.interpretationScore ?? 0,
        findingQualityScore: attempt.findingQualityScore ?? 0,
        matchedFindingKeys: [],
        partialFindingKeys: [],
        missedFindingKeys: [],
        evidenceLinkedThemes: [],
      },
    );
    if (options?.userName && options?.systemName) {
      missionProgression = buildMissionProgression(
        options.userName,
        options.systemName,
        progress.missionId,
        attempt.totalScore,
        {
          playbookPath: options.playbookPath,
          attemptId: progress.attemptId,
        },
      );
    }
  }

  const playbookGuide = buildPlaybookGuide(progress.missionId, options?.playbookPath);
  const campaignTracks = options?.userName
    ? buildCampaignTracks(options.userName, progress.missionId)
    : undefined;
  const campaignQuest = options?.userName
    ? buildCampaignQuest(options.userName, {
        missionId: progress.missionId,
        missionPhase,
        submitted,
      })
    : undefined;

  const requiredTotal = progress.requirements.filter((req) => !req.optional).length;
  const optionalTotal = progress.requirements.filter((req) => req.optional).length;
  const missionPackaging = getMissionPackaging(progress.missionId, {
    required: requiredTotal,
    optional: optionalTotal,
  });

  const primaryTrack = campaignTracks?.[0];
  const campaignDashboard = primaryTrack
    ? {
        skillPathLabel: missionPackaging.skillPathLabel,
        campaignTitle: primaryTrack.title,
        completed: primaryTrack.completed,
        total: primaryTrack.total,
        nextMissionId: primaryTrack.missions.find((m) => m.status === "open")?.missionId,
        nextMissionTitle: primaryTrack.missions.find((m) => m.status === "open")?.title,
      }
    : undefined;

  const achievements = buildAchievementBadges({
    disciplineBeforeFinding: disciplineTrackedFromFindings(findings, progress),
    requiredEvidenceComplete: readiness.requiredEvidenceComplete,
    missionPhase,
    totalScore: attempt?.totalScore ?? null,
    campaignComplete: campaignQuest?.campaignComplete === true,
  });

  return {
    missionPhase,
    readiness,
    investigationLeads,
    signals,
    submitDebrief,
    missionProgression,
    campaignQuest,
    missionPackaging,
    achievements,
    campaignDashboard,
    playbookGuide,
    missionProgress: mapMissionProgress(progress),
    findings: findingsSummary,
    campaignProgress: options?.userName ? buildCampaignProgress(options.userName) : undefined,
    campaignTracks,
  };
}

function disciplineTrackedFromFindings(
  findings: ReturnType<typeof listFindings>,
  progress: MissionProgress,
): boolean {
  if (findings.length === 0) return false;
  const requiredKeys = progress.requirements.filter((req) => !req.optional).map((r) => r.requirementKey);
  const collectedKeys = progress.collected.map((row) => row.requirementKey);
  return requiredKeys.every((key) => collectedKeys.includes(key));
}

function guidanceHidesLeads(guidanceMode?: string): boolean {
  const mode = (guidanceMode ?? "coach").toLowerCase();
  return mode === "assessment" || mode === "expert";
}

function resolveContextArticle(
  screenId: ScreenId | "DISCONNECTED",
  helpArticle?: GrcArticleLink,
  progress?: MissionProgress,
): GrcArticleLink | undefined {
  if (helpArticle) return helpArticle;
  if (screenId !== "DISCONNECTED") {
    const screenArticle = articleForScreen(screenId);
    if (screenArticle) return screenArticle;
  }
  if (progress?.missionId) {
    return articleForMission(progress.missionId);
  }
  return undefined;
}

export function buildCoachContext(
  screenId: ScreenId | "DISCONNECTED",
  progress?: MissionProgress,
  coachEvents?: Array<{ eventKey: string; message: string }>,
  options?: CoachContextOptions,
): CoachContextPayload {
  const lane = options?.lane ?? "auditor";
  const guidanceMode = (options?.guidanceMode ?? (lane === "operator" ? "tutorial" : "coach")).toLowerCase();
  const systemName = options?.systemName ?? "CLAIMS400";
  const signOnCredentials = getTrainingProfileCredentials(systemName);

  if (lane === "operator" && guidanceMode !== "expert") {
    const operator = buildOperatorCoachContext(screenId, systemName, options?.userName);
    const evidenceFocus =
      screenId !== "DISCONNECTED" && isOperatorEvidenceFocusScreen(screenId)
        ? buildEvidenceFocusPanel(screenId, systemName, options)
        : undefined;
    return {
      lane: "operator",
      mode: "operator",
      screenId: operator.screenId,
      screenGuide: operator.screenGuide,
      hints: [
        ...operator.hints,
        "Article context and ISO mapping → sign on IONGRC.",
      ],
      signOnCredentials,
      evidenceFocus,
    };
  }

  if (lane === "iongrc" || guidanceMode === "iongrc") {
    const packId =
      options?.iongrcPackId ??
      (progress?.missionId ? packIdForMission(progress.missionId) : undefined);
    const iongrcComplete =
      options?.userName?.trim().toUpperCase() === "IONGRC" && isIongrcSubmitComplete(options?.lastCommand);
    return {
      lane: "iongrc",
      mode: "auditor",
      guidanceMode: "iongrc",
      screenId,
      hints:
        screenId === "DISCONNECTED"
          ? [
              disconnectedSignOnHint(systemName),
              "i on GRC practice desk — stock IBM i Main Menu. Navigate and run commands; article excerpts follow the active screen.",
            ]
          : [
              "i on GRC articles appear in the panel for this screen and command.",
              "Press F3 to step back through menus toward the Main Menu.",
            ],
      iongrcStepAdvance: null,
      iongrcComplete,
      iongrcPackId: packId,
      iongrcScreenGuide: resolveIongrcScreenGuide(
        screenId === "DISCONNECTED" ? undefined : screenId,
        options?.lastCommand,
      ),
      signOnCredentials,
    };
  }

  if (lane === "demo" || guidanceMode === "demo") {
    const demoHints =
      screenId === "DISCONNECTED"
        ? [
            disconnectedSignOnHint(systemName),
            "Showroom demo. No mission scoring. Use the Five-Minute Demo panel or pick a skill path from the launcher.",
          ]
        : (SCREEN_HINTS[screenId] ?? [
            "Showroom walkthrough. Commands work, but SUBMITMSN and mission scoring are disabled for DEMO.",
          ]);
    let demoStepAdvance: number | null = null;
    if (options?.demoPath != null && options.demoStepIndex != null) {
      demoStepAdvance = detectDemoStepAdvance(
        options.demoPath,
        options.demoStepIndex,
        options.lastCommand,
        screenId === "DISCONNECTED" ? undefined : screenId,
        options.userName,
      );
    }
    const demoComplete =
      options?.userName?.trim().toUpperCase() === "DEMO" && isDemoSubmitComplete(options?.lastCommand);
    return {
      lane: "demo",
      mode: "auditor",
      guidanceMode: "demo",
      screenId,
      hints: demoHints,
      demoStepAdvance,
      demoComplete,
      demoScreenGuide:
        options?.demoStepIndex != null
          ? resolveDemoScreenGuide(
              options.demoStepIndex,
              screenId === "DISCONNECTED" ? undefined : screenId,
              options.lastCommand,
            )
          : undefined,
      signOnCredentials,
      evidenceFocus:
        screenId !== "DISCONNECTED" && isAuditorEvidenceFocusScreen(screenId)
          ? buildEvidenceFocusPanel(screenId, systemName, options)
          : undefined,
    };
  }

  if (guidanceMode === "assessment") {
    const gamification = buildAuditorGamification(progress, coachEvents, options);
    return enrichPathGamification(
      {
        lane: "auditor",
        mode: "auditor",
        guidanceMode,
        screenId,
        hints: ["Assessment mode — investigation leads hidden. Use your own judgment."],
        ...gamification,
      },
      progress,
      options,
    );
  }

  if (guidanceMode === "expert") {
    const gamification = buildAuditorGamification(progress, coachEvents, options);
    return enrichPathGamification(
      {
        lane: "auditor",
        mode: "auditor",
        guidanceMode,
        screenId,
        hints: ["Expert mode — minimal coach support."],
        ...gamification,
      },
      progress,
      options,
    );
  }

  const hints = [
    ...(screenId === "DISCONNECTED"
      ? [disconnectedSignOnHint(systemName)]
      : (SCREEN_HINTS[screenId] ?? [
          "Use the green-screen session; the coach panel follows your context.",
        ])),
  ];

  if (options?.personaId === "executive_reviewer") {
    hints.push("Executive reviewer persona — focus on risk summary and management decisions.");
  }

  if (screenId === "DSPUSRPRF") {
    hints.push("If you opened BACKUPADM, note *ALLOBJ / *SAVSYS with a stale last sign-on.");
  }
  if (screenId === "DSPSYSVAL") {
    hints.push("If QSECURITY is on screen, ask whether the control owner can defend effective governance.");
  }

  const article = screenId !== "DISCONNECTED" ? articleForScreen(screenId) : undefined;
  if (article?.hook && lane !== "auditor") {
    hints.push(`i on GRC: ${article.hook}`);
  }

  const iongrcPackId = progress?.missionId ? packIdForMission(progress.missionId) : undefined;
  const iongrcPointer = iongrcPackId
    ? `Read and practice this topic in IONGRC — sign on IONGRC / IONGRC and open pack "${iongrcPackId}".`
    : "Full i on GRC article context → sign on IONGRC / IONGRC.";

  const gamification = buildAuditorGamification(progress, coachEvents, options);
  const events = coachEvents?.slice(-3);

  let demoStepAdvance: number | null = null;
  let demoScreenGuide: ReturnType<typeof resolveDemoScreenGuide> | undefined;
  let demoComplete: boolean | undefined;
  if (options?.demoPath != null && options.demoStepIndex != null) {
    demoStepAdvance = detectDemoStepAdvance(
      options.demoPath,
      options.demoStepIndex,
      options.lastCommand,
      screenId === "DISCONNECTED" ? undefined : screenId,
      options.userName,
    );
    demoScreenGuide = resolveDemoScreenGuide(
      options.demoStepIndex,
      screenId === "DISCONNECTED" ? undefined : screenId,
      options.lastCommand,
    );
    demoComplete =
      options.userName?.trim().toUpperCase() === "DEMO" && isDemoSubmitComplete(options.lastCommand);
  }

  return enrichPathGamification(
    {
      lane: "auditor",
      mode: "auditor",
      guidanceMode,
      screenId,
      hints,
      insight: AUDITOR_INSIGHTS[screenId],
      coachEvents: events,
      ...gamification,
      demoStepAdvance,
      demoScreenGuide,
      demoComplete,
      focusFindingComposer: options?.focusFindingComposer,
      iongrcPackId,
      iongrcPointer,
      signOnCredentials,
      evidenceFocus:
        lane === "auditor" && isAuditorEvidenceFocusScreen(screenId)
          ? buildEvidenceFocusPanel(screenId, systemName, options)
          : undefined,
    },
    progress,
    options,
  );
}

function enrichPathGamification(
  payload: CoachContextPayload,
  progress?: MissionProgress,
  options?: CoachContextOptions,
): CoachContextPayload {
  if (
    !payload.evidenceFocus &&
    options?.systemName &&
    payload.screenId !== "DISCONNECTED"
  ) {
    if (payload.lane === "auditor" && isAuditorEvidenceFocusScreen(payload.screenId)) {
      payload.evidenceFocus = buildEvidenceFocusPanel(
        payload.screenId,
        options.systemName,
        options,
      );
    } else if (payload.lane === "operator" && isOperatorEvidenceFocusScreen(payload.screenId)) {
      payload.evidenceFocus = buildEvidenceFocusPanel(
        payload.screenId,
        options.systemName,
        options,
      );
    }
  }
  if (payload.evidenceFocus) {
    payload.sqlEvidenceEngineering = payload.evidenceFocus;
  }
  const missionId = progress?.missionId ?? payload.missionProgress?.missionId;
  if (!payload.playbookGuide) {
    payload.playbookGuide = buildPlaybookGuide(missionId, options?.playbookPath);
  }
  if (!payload.campaignTracks && options?.userName) {
    payload.campaignTracks = buildCampaignTracks(options.userName, missionId);
  }
  if (!payload.campaignQuest && options?.userName) {
    payload.campaignQuest = buildCampaignQuest(options.userName, {
      missionId,
      missionPhase: payload.missionPhase,
      submitted: payload.missionPhase === "complete",
    });
  }
  return payload;
}
