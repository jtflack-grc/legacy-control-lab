import type { ScreenId } from "../screen-runtime/screen.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import { findLiveSession, resolveLiveSessionForLab } from "./liveSessionRegistry.js";
import {
  buildCommandAtlasPanel,
  buildJournalEvidencePanel,
  buildOperatorEvidencePanel,
  buildPdmEvidencePanel,
  evidenceFocusFromSqlPanel,
  type EvidenceFocusPanel,
} from "../grc/evidenceFocusPanels.js";
import { buildSqlEvidenceEngineeringPanel } from "../grc/grcSqlEvidenceCatalog.js";

export type EvidenceFocusOptions = {
  sessionId?: string;
  userName?: string;
};

/** Mission-loop screens — keep gamification rail; never evidence-focus mode. */
export const AUDITOR_GAME_SCREENS = new Set<ScreenId>([
  "AUDIT",
  "DSPMISSION",
  "WRKFINDING",
  "FINDING",
  "DSPEVID",
  "SUBMITMSN",
  "WRKCTRL",
  "MAPCTRL",
  "WORKSHOP",
  "MAIN",
]);

export const AUDITOR_SQL_FOCUS_SCREENS = new Set<ScreenId>([
  "WRKSQLSVC",
  "RUNSQL",
  "CMDSQL",
  "DSPSQLSVC",
]);

export const AUDITOR_JOURNAL_FOCUS_SCREENS = new Set<ScreenId>([
  "DSPJRN",
  "DSPAUDJRNE",
  "DSPSECAUD",
]);

export const AUDITOR_ATLAS_FOCUS_SCREENS = new Set<ScreenId>(["HELP"]);

export const AUDITOR_PDM_FOCUS_SCREENS = new Set<ScreenId>([
  "STRPDM",
  "WRKMBRPDM",
  "DSPPFM",
  "DSPPGMREF",
]);

export const OPERATOR_EVIDENCE_FOCUS_SCREENS = new Set<ScreenId>([
  "DSPEVDDIFF",
  "DSPPRVSSN",
]);

export const AUDITOR_EVIDENCE_FOCUS_SCREENS = new Set<ScreenId>([
  ...AUDITOR_SQL_FOCUS_SCREENS,
  ...AUDITOR_JOURNAL_FOCUS_SCREENS,
  ...AUDITOR_ATLAS_FOCUS_SCREENS,
  ...AUDITOR_PDM_FOCUS_SCREENS,
]);

/** @deprecated Use isAuditorEvidenceFocusScreen */
export function isAuditorSqlFocusScreen(screenId: ScreenId | "DISCONNECTED"): boolean {
  return screenId !== "DISCONNECTED" && AUDITOR_SQL_FOCUS_SCREENS.has(screenId);
}

export function isAuditorEvidenceFocusScreen(screenId: ScreenId | "DISCONNECTED"): boolean {
  return screenId !== "DISCONNECTED" && AUDITOR_EVIDENCE_FOCUS_SCREENS.has(screenId);
}

export function isOperatorEvidenceFocusScreen(screenId: ScreenId | "DISCONNECTED"): boolean {
  return screenId !== "DISCONNECTED" && OPERATOR_EVIDENCE_FOCUS_SCREENS.has(screenId);
}

export function isEvidenceFocusScreen(
  lane: SessionLane | undefined,
  screenId: ScreenId | "DISCONNECTED",
): boolean {
  if (screenId === "DISCONNECTED") return false;
  if (lane === "operator") return isOperatorEvidenceFocusScreen(screenId);
  return isAuditorEvidenceFocusScreen(screenId);
}

function resolveLiveSession(systemName: string, options?: EvidenceFocusOptions) {
  if (options?.sessionId) {
    return resolveLiveSessionForLab(
      {
        sessionId: options.sessionId,
        systemName,
        userName: options.userName ?? "AUDIT",
      },
      systemName,
    );
  }
  if (options?.userName) {
    return findLiveSession(systemName, options.userName);
  }
  return undefined;
}

export function buildEvidenceFocusPanel(
  screenId: ScreenId,
  systemName: string,
  options?: EvidenceFocusOptions,
): EvidenceFocusPanel | undefined {
  const session = resolveLiveSession(systemName, options);

  if (AUDITOR_SQL_FOCUS_SCREENS.has(screenId)) {
    return evidenceFocusFromSqlPanel(buildSqlEvidenceEngineeringPanel(systemName, session));
  }
  if (AUDITOR_JOURNAL_FOCUS_SCREENS.has(screenId)) {
    return buildJournalEvidencePanel(screenId, systemName, session);
  }
  if (AUDITOR_ATLAS_FOCUS_SCREENS.has(screenId)) {
    return buildCommandAtlasPanel();
  }
  if (AUDITOR_PDM_FOCUS_SCREENS.has(screenId)) {
    return buildPdmEvidencePanel(screenId);
  }
  if (OPERATOR_EVIDENCE_FOCUS_SCREENS.has(screenId)) {
    return buildOperatorEvidencePanel(screenId);
  }
  return undefined;
}
