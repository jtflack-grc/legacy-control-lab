import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { MenuRouteResult } from "../ibmi-runtime/commandHandlers.js";

export type { MenuRouteResult };

export type ProbeExpectation = {
  kind: "screen" | "message" | "any";
  screenId?: string;
  messageIncludes?: string;
  messageExcludes?: string[];
};

export type TrainerProbe = {
  id: string;
  group: string;
  description: string;
  menu?: IbmiSession["currentMenu"];
  /** Force session user (e.g. QSECOFR for operator lane probes). */
  sessionUser?: string;
  input?: string;
  /** IBM i command names exercised by this probe (for catalog coverage). */
  covers?: string[];
  expect: ProbeExpectation;
  /** Run custom steps (e.g. subfile option). Return value overrides default route result. */
  run?: (ctx: TrainerProbeContext) => MenuRouteResult | undefined;
};

export type TrainerProbeContext = {
  session: IbmiSession;
  route: (session: IbmiSession, input: string) => MenuRouteResult;
};

export type ProbeOutcome = "pass" | "fail" | "error";

export type TrainerProbeResult = {
  probe: TrainerProbe;
  outcome: ProbeOutcome;
  actualKind?: MenuRouteResult["kind"];
  screenId?: string;
  message?: string;
  detail?: string;
};

export type TrainerReport = {
  ranAt: string;
  systemName: string;
  summary: { pass: number; fail: number; error: number; total: number };
  coverage: {
    implementedTotal: number;
    coveredTotal: number;
    unprobedCommands: string[];
    missingSamples: string[];
  };
  results: TrainerProbeResult[];
  failures: TrainerProbeResult[];
};
