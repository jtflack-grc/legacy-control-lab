import { existsSync, readdirSync, rmSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { IbmiSession } from "../sessionService.js";
import { executeCatalogCommand } from "../commandRuntime.js";
import { getLabMessage, listLabMessages } from "../messageCatalog.js";
import { getMessages } from "../messageService.js";
import { resolveIfsLinkPath } from "../ifsLinkService.js";
import type { QshellExecResult, QshellSessionState } from "./qshellTypes.js";
import { defaultPaseCcsid, getPaseCcsid, setPaseCcsid } from "./paseCcsidService.js";
import { formatPasePsOutput } from "./pasePsFormat.js";
import { defaultQshellHome, getQOpenSysRoot, toHostPath, toPasePath } from "./qshellPaths.js";

function expandPaseVars(line: string, state: QshellSessionState): string {
  const home = state.env.HOME ?? defaultQshellHome("audit");
  return line
    .replace(/\$\$/g, String(process.pid))
    .replace(/\$PPID/g, String(process.ppid))
    .replace(/\$HOME/g, home)
    .replace(/\$PWD/g, state.cwd)
    .replace(/\$USER/g, state.env.USER ?? "audit");
}

function parseArgs(line: string, verb: string): string[] {
  const rest = line.replace(new RegExp(`^${verb}\\s*`, "i"), "").trim();
  if (!rest) return [];
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (const ch of rest) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

export function bridgeSystem(line: string, session: IbmiSession): QshellExecResult {
  let cl = line.replace(/^system\s+/i, "").trim();
  cl = cl.replace(/^(-\w+\s*)+/, "").trim();
  cl = cl.replace(/^['"]|['"]$/g, "");
  if (!cl) {
    return { lines: ["system: CL command required.", "Usage: system [-i] CMD ..."], exitCode: 1 };
  }
  const route = executeCatalogCommand(session, cl.split(/\s+/)[0]!.toUpperCase(), cl);
  if (route.kind === "message") {
    return { lines: [route.message], exitCode: route.message.startsWith("CPF") ? 1 : 0 };
  }
  if (route.kind === "screen") {
    return { lines: [`system: ${cl} → screen ${route.screen.id}`], exitCode: 0 };
  }
  return { lines: [`system: ${cl}`], exitCode: 0 };
}

export function bridgeGetJobId(line: string, session: IbmiSession, state: QshellSessionState): QshellExecResult {
  const expanded = expandPaseVars(line, state);
  const args = parseArgs(expanded, "getjobid");
  const pidToken = args[0] ?? "$$";
  const pid =
    pidToken === "$$" || !pidToken
      ? process.pid
      : Number.parseInt(pidToken, 10);
  if (!Number.isFinite(pid)) {
    return { lines: ["getjobid: invalid process identifier."], exitCode: 1 };
  }
  const job = session.job;
  const user = (session.userName ?? "QUSER").toUpperCase().slice(0, 10);
  return {
    lines: [`${job.jobNumber}/${user}/${job.jobName} ${pid}`],
    exitCode: 0,
  };
}

export function bridgeSetCcsid(line: string, state: QshellSessionState): QshellExecResult {
  const args = parseArgs(line, "setccsid");
  if (args.length < 2) {
    return {
      lines: ["Usage: setccsid ccsid path", "Example: setccsid 819 /qopensys/claims/readme.txt"],
      exitCode: 1,
    };
  }
  const ccsid = Number.parseInt(args[0]!, 10);
  const pasePath = args.slice(1).join(" ");
  const home = state.env.HOME ?? defaultQshellHome("audit");
  const result = setPaseCcsid(pasePath, ccsid, home);
  if (!result.ok) {
    return { lines: [result.message], exitCode: 1 };
  }
  return {
    lines: [`CCSID ${ccsid} set for ${normalizeDisplayPath(pasePath, home)}.`],
    exitCode: 0,
  };
}

function normalizeDisplayPath(pasePath: string, home: string): string {
  return toPasePath(toHostPath(pasePath, home), home);
}

export function bridgeDspCat(line: string, state: QshellSessionState): QshellExecResult {
  const args = parseArgs(line, "dspcat");
  const home = state.env.HOME ?? defaultQshellHome("audit");

  if (args.length === 0) {
    const catalog = join(getQOpenSysRoot(), "usr/lib/nls/msg/C/en_US/claimsc400.msg");
    if (!existsSync(catalog)) {
      return { lines: ["dspcat: message catalog not found in /qopensys/usr/lib/nls/msg."], exitCode: 1 };
    }
    return { lines: [`Message catalog: /qopensys/usr/lib/nls/msg/C/en_US/claimsc400.msg`], exitCode: 0 };
  }

  const token = args[0]!.toUpperCase();
  const lab = getLabMessage(token);
  if (lab) {
    return {
      lines: [
        `${lab.messageId}  ${lab.severity.toUpperCase()}`,
        lab.shortText,
        lab.secondLevelText ?? "",
      ].filter(Boolean),
      exitCode: 0,
    };
  }

  const pasePath = args[0]!.startsWith("/") ? args[0]! : join("/qopensys/usr/lib/nls/msg/C/en_US", args[0]!);
  const host = toHostPath(pasePath, home);
  if (!existsSync(host)) {
    const listed = listLabMessages()
      .slice(0, 8)
      .map((entry) => `  ${entry.messageId}  ${entry.shortText.slice(0, 50)}`);
    return {
      lines: [`dspcat: catalog ${args[0]} not found.`, "Lab message IDs:", ...listed],
      exitCode: 1,
    };
  }

  return { lines: [`dspcat: ${normalizeDisplayPath(pasePath, home)} (see attr for CCSID)`], exitCode: 0 };
}

export function bridgeDspMsg(line: string, session: IbmiSession): QshellExecResult {
  const args = parseArgs(line, "dspmsg");
  if (args.length === 0) {
    const messages = getMessages("QSYSOPR", session).slice(0, 5);
    return {
      lines: messages.map((entry) => `${entry.messageId}  ${entry.text}`),
      exitCode: 0,
    };
  }

  const token = args[0]!.toUpperCase();
  const lab = getLabMessage(token);
  if (lab) {
    return { lines: [`${lab.messageId}  ${lab.shortText}`], exitCode: 0 };
  }

  const route = executeCatalogCommand(session, "DSPMSG", `DSPMSG MSGID(${token})`);
  if (route.kind === "message") {
    return { lines: [route.message], exitCode: 0 };
  }
  return { lines: [`dspmsg: ${token}`], exitCode: 0 };
}

export function bridgeAttr(line: string, session: IbmiSession, state: QshellSessionState): QshellExecResult {
  const longForm = /\s-l(\s|$)/i.test(line);
  const args = parseArgs(line.replace(/\s-l\b/i, ""), "attr");
  if (args.length === 0) {
    return { lines: ["Usage: attr [-l] path"], exitCode: 1 };
  }
  const pasePath = args.join(" ");
  const home = state.env.HOME ?? defaultQshellHome("audit");
  const host = toHostPath(pasePath, home);
  const display = normalizeDisplayPath(pasePath, home);

  const ifs = resolveIfsLinkPath(session.systemName, display);
  if (ifs) {
    const lines = [
      `Object . . . . . . . . . . . : ${display}`,
      `Owner  . . . . . . . . . . . : ${ifs.owner}`,
      `Data authority . . . . . . . : ${ifs.dataAuthority}`,
      `Link type  . . . . . . . . . : ${ifs.linkType}`,
      `Target . . . . . . . . . . . : ${ifs.target}`,
      `Text . . . . . . . . . . . . : ${ifs.textDescription}`,
    ];
    if (longForm) lines.push(`CCSID  . . . . . . . . . . . : ${getPaseCcsid(display, home)}`);
    return { lines, exitCode: 0 };
  }

  if (!existsSync(host)) {
    return { lines: [`CPF9810 - Object ${display} not found.`], exitCode: 1 };
  }

  const stats = statSync(host);
  const lines = [
    `Object . . . . . . . . . . . : ${display}`,
    `Type . . . . . . . . . . . . : ${stats.isDirectory() ? "*DIR" : "*STMF"}`,
    `Size . . . . . . . . . . . . : ${stats.size}`,
    `CCSID  . . . . . . . . . . . : ${getPaseCcsid(display, home)}`,
    `Modified . . . . . . . . . . : ${stats.mtime.toISOString()}`,
  ];
  if (longForm) {
    lines.push(`Default PASE CCSID . . . . : ${defaultPaseCcsid()}`);
    lines.push(`Path (host)  . . . . . . . : ${host.replace(/\\/g, "/")}`);
  }
  return { lines, exitCode: 0 };
}

export function bridgeClrTmp(state: QshellSessionState): QshellExecResult {
  const root = getQOpenSysRoot();
  const tmpDirs = [join(root, "tmp"), toHostPath("/tmp", state.env.HOME ?? defaultQshellHome("audit"))];
  let removed = 0;

  for (const dir of tmpDirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.startsWith("qsh") && !entry.startsWith("pase")) continue;
      const target = join(dir, entry);
      try {
        const stats = statSync(target);
        if (stats.isDirectory()) rmSync(target, { recursive: true, force: true });
        else unlinkSync(target);
        removed += 1;
      } catch {
        /* skip locked files */
      }
    }
  }

  return {
    lines: [`clrtmp: removed ${removed} PASE temporary object(s).`],
    exitCode: 0,
  };
}

export function bridgeSysval(line: string, session: IbmiSession): QshellExecResult {
  const args = parseArgs(line, "sysval");
  const name = args[0]?.toUpperCase();
  if (!name) {
    return { lines: ["Usage: sysval SYSVALNAME  or  system DSPSYSVAL SYSVAL(...)"], exitCode: 1 };
  }
  return bridgeSystem(`system DSPSYSVAL SYSVAL(${name})`, session);
}

export function bridgePs(session: IbmiSession): QshellExecResult {
  return { lines: formatPasePsOutput(session), exitCode: 0 };
}

export function bridgeStub(name: string, note: string): QshellExecResult {
  return { lines: [`${name}: ${note}`], exitCode: 0 };
}

export function bridgeQshInvoke(
  line: string,
  verb: string,
): { command: string } | { error: QshellExecResult } {
  const expanded = line.replace(new RegExp(`^${verb}\\s*`, "i"), "").trim();
  if (!expanded) {
    return { error: { lines: [`${verb}: command required.`], exitCode: 1 } };
  }
  const unwrapped = expanded.replace(/^['"]|['"]$/g, "");
  const fromDashC = unwrapped.match(/^-c\s+(.+)$/i);
  return { command: fromDashC?.[1] ?? unwrapped };
}
