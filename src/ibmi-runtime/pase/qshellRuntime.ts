import type { IbmiSession } from "../sessionService.js";
import {
  bridgeAttr,
  bridgeClrTmp,
  bridgeDspCat,
  bridgeDspMsg,
  bridgeGetJobId,
  bridgePs,
  bridgeQshInvoke,
  bridgeSetCcsid,
  bridgeStub,
  bridgeSysval,
  bridgeSystem,
} from "./paseIbmBridges.js";
import { resolveQshellCommand } from "./qshellCommandMap.js";
import {
  defaultQshellHome,
  ensureQshellHome,
  shellPathEnv,
  toHostPath,
  toPasePath,
  translateShellCommand,
} from "./qshellPaths.js";
import { seedQOpenSysLayout } from "./seedQOpenSys.js";
import { resolveQshMode, qshModeLabel } from "./qshMode.js";
import { runSyntheticShell, syntheticQshAvailable } from "./qshellSynthetic.js";
import {
  qshShellUnavailableMessage,
  resolveQshShell,
  runQshShellCommand,
  qshShellAvailable as hostQshShellAvailable,
} from "./qshellShell.js";
import type { QshellExecResult, QshellSessionState } from "./qshellTypes.js";

export type { QshellExecResult, QshellSessionState } from "./qshellTypes.js";

export function qshShellAvailable(): boolean {
  const mode = resolveQshMode();
  if (mode === "disabled") return false;
  if (mode === "synthetic") return syntheticQshAvailable();
  return hostQshShellAvailable();
}

const MAX_SCROLL_LINES = 400;
const OUTPUT_LINE_WIDTH = 74;
const EXEC_TIMEOUT_MS = 15000;
const MAX_BUFFER = 4 * 1024 * 1024;

function firstWord(line: string): string {
  return line.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function ensureQshellSession(session: IbmiSession): QshellSessionState {
  const user = session.userName ?? "AUDIT";
  const home = defaultQshellHome(user);
  seedQOpenSysLayout();
  ensureQshellHome(user);

  if (!session.qshellContext) {
    const mode = resolveQshMode();
    const shell = mode === "host" ? resolveQshShell() : undefined;
    const bootLines = [
      "QSH Version 1.0 (Legacy Control Lab — PASE for i bridge)",
      "PASE CCSID 819 (ASCII). Paths under /qopensys and /home.",
      `QSH mode: ${qshModeLabel(mode)}`,
      `Current directory is ${home}`,
    ];
    if (mode === "host" && shell) {
      bootLines.push(`Host shell: ${shell.label}`);
    } else if (mode === "host") {
      bootLines.push(qshShellUnavailableMessage());
    } else if (mode === "synthetic") {
      bootLines.push("POSIX tools (ls, pwd, cat, cd) use the partition /qopensys mirror only.");
    }

    session.qshellContext = {
      cwd: home,
      env: {
        HOME: home,
        USER: user.toLowerCase(),
        LOGNAME: user.toLowerCase(),
        SHELL: "/qopensys/usr/bin/qsh",
        PATH: "/qopensys/usr/bin:/qopensys/usr/sbin:/usr/bin:/bin",
        LANG: "en_US.UTF-8",
        PASE_LOCALE: "en_US",
        PASE_CCSID: "819",
      },
      lines: bootLines,
      scrollOffset: 0,
    };
  }
  return session.qshellContext;
}

function appendLines(state: QshellSessionState, lines: string[]): void {
  for (const line of lines) {
    if (line.length <= OUTPUT_LINE_WIDTH) {
      state.lines.push(line);
      continue;
    }
    for (let i = 0; i < line.length; i += OUTPUT_LINE_WIDTH) {
      state.lines.push(line.slice(i, i + OUTPUT_LINE_WIDTH));
    }
  }
  while (state.lines.length > MAX_SCROLL_LINES) {
    state.lines.shift();
    state.scrollOffset = Math.max(0, state.scrollOffset - 1);
  }
}

function shellEnv(state: QshellSessionState): NodeJS.ProcessEnv {
  const home = state.env.HOME ?? defaultQshellHome("audit");
  return {
    ...process.env,
    ...state.env,
    HOME: toHostPath(home, home),
    PATH: shellPathEnv(),
    PWD: toHostPath(state.cwd, home),
  };
}

function runShell(command: string, state: QshellSessionState): QshellExecResult {
  const mode = resolveQshMode();
  if (mode === "disabled") {
    return {
      lines: ["QSH is disabled (LCL_QSH_MODE=disabled)."],
      exitCode: 127,
    };
  }
  if (mode === "synthetic") {
    return runSyntheticShell(command, state);
  }

  const home = state.env.HOME ?? defaultQshellHome("audit");
  const translated = translateShellCommand(command, home);
  const cwd = toHostPath(state.cwd, home);

  const result = runQshShellCommand(translated, {
    cwd,
    env: shellEnv(state),
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
  });

  const lines: string[] = [];
  const out = result.stdout.replace(/\r/g, "");
  const errOut = result.stderr.replace(/\r/g, "");
  if (out.trim()) lines.push(...out.replace(/\n$/, "").split("\n"));
  if (errOut.trim()) lines.push(...errOut.replace(/\n$/, "").split("\n"));

  return { lines, exitCode: result.status };
}

function syncCwdFromPwd(state: QshellSessionState): void {
  const home = state.env.HOME ?? defaultQshellHome("audit");
  const result = runShell("pwd", state);
  const hostPwd = result.lines[result.lines.length - 1]?.trim();
  if (hostPwd) {
    state.cwd = toPasePath(hostPwd, home);
  }
}

function runIbmBridge(
  verb: string,
  line: string,
  session: IbmiSession,
  state: QshellSessionState,
): QshellExecResult | undefined {
  switch (verb) {
    case "system":
      return bridgeSystem(line, session);
    case "getjobid":
      return bridgeGetJobId(line, session, state);
    case "setccsid":
      return bridgeSetCcsid(line, state);
    case "dspcat":
      return bridgeDspCat(line, state);
    case "dspmsg":
      return bridgeDspMsg(line, session);
    case "attr":
      return bridgeAttr(line, session, state);
    case "clrtmp":
      return bridgeClrTmp(state);
    case "sysval":
      return bridgeSysval(line, session);
    case "ps":
      if (!/\s-/.test(line.trim())) return bridgePs(session);
      return undefined;
    case "qsh":
    case "qsh_out":
    case "qsh_inout": {
      const invoked = bridgeQshInvoke(line, verb);
      if ("error" in invoked) return invoked.error;
      return executeSegment(invoked.command, session, state);
    }
    case "admin":
      return bridgeStub("admin", "SCCS admin not implemented in lab. Use native git.");
    case "setmaps":
      return bridgeStub("setmaps", "Code-page maps not required in ASCII PASE lab (CCSID 819).");
    case "runcat":
      return bridgeStub("runcat", "Message catalog runner — use dspcat MSGID.");
    case "rtl_enable":
      return bridgeStub("rtl_enable", "RTL layout not applicable in lab.");
    case "exit":
    case "logout":
      return { lines: ["QSH session ended."], exitCode: 0 };
    default:
      return undefined;
  }
}

function executeSegment(commandLine: string, session: IbmiSession, state: QshellSessionState): QshellExecResult {
  const line = commandLine.trim();
  if (!line) return { lines: [], exitCode: 0 };

  const verb = firstWord(line);
  const binding = resolveQshellCommand(verb);

  if (binding.kind === "unsupported") {
    return { lines: [binding.note ?? `qsh: ${verb}: not available`], exitCode: 127 };
  }

  if (binding.kind === "builtin") {
    const bridged = runIbmBridge(verb, line, session, state);
    if (bridged) return bridged;
  }

  if (verb === "cd") {
    const target = line.replace(/^cd\s+/i, "").trim() || state.env.HOME || defaultQshellHome("audit");
    if (resolveQshMode() === "synthetic") {
      return runSyntheticShell(`cd ${target}`, state);
    }
    const home = state.env.HOME ?? defaultQshellHome("audit");
    const translated = translateShellCommand(`cd ${target} && pwd`, home);
    const result = runShell(translated, state);
    if (result.exitCode === 0) {
      const hostPwd = result.lines[result.lines.length - 1]?.trim();
      if (hostPwd) state.cwd = toPasePath(hostPwd, home);
      return { lines: [], exitCode: 0 };
    }
    return result;
  }

  const result = runShell(line, state);

  if (verb === "pwd" || verb === "pwdx") {
    if (resolveQshMode() === "synthetic") {
      return runSyntheticShell(verb, state);
    }
    const home = state.env.HOME ?? defaultQshellHome("audit");
    return {
      lines: result.lines.map((row) => toPasePath(row.trim(), home)),
      exitCode: result.exitCode,
    };
  }

  if (result.exitCode === 0 && verb !== "cd") {
    syncCwdFromPwd(state);
  }

  return result;
}

export function executeQshellLine(session: IbmiSession, rawLine: string): QshellExecResult {
  const state = ensureQshellSession(session);
  const line = rawLine.trimEnd();
  if (!line.trim()) return { lines: [], exitCode: 0 };

  appendLines(state, [`$ ${line.trim()}`]);

  const segments = line.split(";").map((part) => part.trim()).filter(Boolean);
  let last: QshellExecResult = { lines: [], exitCode: 0 };
  for (const segment of segments) {
    last = executeSegment(segment, session, state);
    if (last.lines.length) appendLines(state, last.lines);
    if (last.exitCode !== 0) break;
  }
  return last;
}

export function visibleQshellLines(state: QshellSessionState, rows: number): string[] {
  const total = state.lines.length;
  const maxOffset = Math.max(0, total - rows);
  state.scrollOffset = Math.min(state.scrollOffset, maxOffset);
  const start = Math.max(0, total - rows - state.scrollOffset);
  return state.lines.slice(start, start + rows);
}

export function scrollQshell(state: QshellSessionState, delta: number, rows: number): void {
  const maxOffset = Math.max(0, state.lines.length - rows);
  state.scrollOffset = Math.min(maxOffset, Math.max(0, state.scrollOffset + delta));
}
