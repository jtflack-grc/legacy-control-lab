import type { IbmiSession } from "./sessionService.js";

export type SessionLane = "auditor" | "operator" | "demo" | "iongrc";

const OPERATOR_USERS = new Set(["QSECOFR"]);
const DEMO_USERS = new Set(["DEMO"]);
const IONGRC_USERS = new Set(["IONGRC"]);
const OPERATOR_MENUS = new Set(["SECURITY", "SECTOOLS"]);

export function resolveSessionLane(
  userName: string,
  userClass?: string,
  initialMenu?: string,
): SessionLane {
  const user = userName.trim().toUpperCase();
  if (DEMO_USERS.has(user)) {
    return "demo";
  }
  if (IONGRC_USERS.has(user)) {
    return "iongrc";
  }
  if (OPERATOR_USERS.has(user) || userClass === "*SECOFR") {
    return "operator";
  }
  const menu = (initialMenu ?? "").trim().toUpperCase();
  if (OPERATOR_MENUS.has(menu)) {
    return "operator";
  }
  return "auditor";
}

export function sessionLane(session: IbmiSession): SessionLane {
  return session.lane ?? resolveSessionLane(session.userName ?? "", undefined, session.initialMenu);
}

export function homeMenuForLane(lane: SessionLane): IbmiSession["currentMenu"] {
  if (lane === "operator") return "SECURITY";
  if (lane === "iongrc") return "IBMMAIN";
  return "MAIN";
}

export function defaultPersonaForLane(lane: SessionLane): string {
  if (lane === "operator") return "operator";
  if (lane === "demo") return "demo";
  if (lane === "iongrc") return "iongrc";
  return "auditor";
}

export function defaultGuidanceForLane(lane: SessionLane): string {
  if (lane === "operator") return "tutorial";
  if (lane === "demo") return "demo";
  if (lane === "iongrc") return "iongrc";
  return "coach";
}
