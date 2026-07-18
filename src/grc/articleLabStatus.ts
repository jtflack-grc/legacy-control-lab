import type { CorpusArticle } from "./articleCorpus.js";
import { getArticlePack, computePackCoverage } from "./articlePacks.js";
import { getGuidedPathForArticle } from "./guidedPaths.js";

export type ArticleLabStatus = "full-lab" | "guided" | "mission-only" | "read-only";

export type ArticleMissionBridge = {
  missionId: string;
  label: string;
  signOn: string;
  hint: string;
};

/** Shipped AUDIT missions that prove the article theme. */
export const ARTICLE_MISSION_MAP: Record<string, ArticleMissionBridge> = {
  offboarding: {
    missionId: "CLAIMS-002",
    label: "Offboarding & dormant access",
    signOn: "AUDIT / TRAIN",
    hint: "Scored offboarding mission — WRKUSRPRF through WRKFINDING with evidence export.",
  },
  "clause-5": {
    missionId: "CLAIMS-006",
    label: "Clause 5 — profile ownership",
    signOn: "AUDIT / TRAIN",
    hint: "Prove data-owner accountability on PAYADMIN and related profiles.",
  },
  "clause-6": {
    missionId: "CLAIMS-004",
    label: "Clause 6 — privacy risk planning",
    signOn: "AUDIT / TRAIN",
    hint: "Authorization lists, DSPSECAUD, and journal monitoring.",
  },
  "clause-8": {
    missionId: "CLAIMS-003",
    label: "Clause 8 — operational privacy",
    signOn: "AUDIT / TRAIN",
    hint: "DSPOBJAUT, DSPFFD, batch, and IFS paths on PAYROLL objects.",
  },
  "blue-team": {
    missionId: "CLAIMS-005",
    label: "Blue Team — detect & respond",
    signOn: "AUDIT / TRAIN",
    hint: "WRKACTJOB, DSPAUDJRNE, DSPJOBLOG — scored detect mission.",
  },
  "red-team": {
    missionId: "CLAIMS-007",
    label: "Red Team — boundaries",
    signOn: "APCLERK / TRAIN",
    hint: "Limited-user escape attempts documented as findings.",
  },
  soc2: {
    missionId: "CLAIMS-008",
    label: "SOC 2 trust criteria",
    signOn: "AUDIT / TRAIN",
    hint: "CC6/CC7 mapped to green-screen evidence.",
  },
  "black-swan": {
    missionId: "CLAIMS-009",
    label: "Black Swan — availability",
    signOn: "AUDIT / TRAIN",
    hint: "Jobs, messages, and system status under stress narrative.",
  },
  coso: {
    missionId: "CLAIMS-010",
    label: "COSO control environment",
    signOn: "AUDIT / TRAIN",
    hint: "Control atlas, monitoring, and decision-ready findings.",
  },
  "iso27001-series": {
    missionId: "CLAIMS-001",
    label: "ISO 27001 access review",
    signOn: "AUDIT / TRAIN",
    hint: "Shipped access-review story — blog series index links here.",
  },
};

const READ_ONLY_IDS = new Set(["alignment", "ot-dont-blink"]);

export function resolveArticleLabStatus(article: CorpusArticle): ArticleLabStatus {
  if (READ_ONLY_IDS.has(article.id) || !article.commands?.length) {
    return "read-only";
  }
  if (getGuidedPathForArticle(article.id)) {
    return "guided";
  }
  if (article.indexed && article.sourceFile) {
    const pack = getArticlePack(article.id);
    if (pack) {
      const coverage = computePackCoverage(pack);
      if (
        coverage.fullStepCount === coverage.totalStepCount &&
        coverage.blockingGaps.length === 0
      ) {
        return "full-lab";
      }
    }
    if (article.sourceType === "pulse") {
      return "full-lab";
    }
    return "full-lab";
  }
  if (ARTICLE_MISSION_MAP[article.id]) {
    return "mission-only";
  }
  return "mission-only";
}

export function labStatusLabel(status: ArticleLabStatus): string {
  switch (status) {
    case "full-lab":
      return "Full lab";
    case "guided":
      return "Guided path";
    case "mission-only":
      return "Mission only";
    case "read-only":
      return "Read only";
  }
}

export function missionBridgeForArticle(articleId: string): ArticleMissionBridge | undefined {
  return ARTICLE_MISSION_MAP[articleId];
}
