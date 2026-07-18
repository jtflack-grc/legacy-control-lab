import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import {
  defaultQshellHome,
  getQOpenSysRoot,
  normalizePasePath,
  toHostPath,
  toPasePath,
} from "./qshellPaths.js";
import type { QshellExecResult } from "./qshellTypes.js";

const SYNTHETIC_ALLOWED = new Set(["pwd", "cd", "ls", "cat", "echo", "which"]);

function resolveSyntheticCwd(stateCwd: string, home: string): string {
  return normalizePasePath(stateCwd, home);
}

function hostPathForSynthetic(pasePath: string, home: string): string | undefined {
  const normalized = normalizePasePath(pasePath, home);
  const lower = normalized.toLowerCase();
  if (
    lower.startsWith("/usr/") ||
    lower === "/usr" ||
    lower.startsWith("/bin") ||
    lower.startsWith("/etc") ||
    lower.startsWith("/sbin")
  ) {
    return undefined;
  }
  return toHostPath(normalized, home);
}

function assertWithinRoot(hostPath: string): boolean {
  const root = resolve(getQOpenSysRoot());
  const resolved = resolve(hostPath);
  return resolved === root || resolved.startsWith(`${root}${sep}`);
}

export function runSyntheticShell(
  commandLine: string,
  state: { cwd: string; env: Record<string, string> },
): QshellExecResult {
  const home = state.env.HOME ?? defaultQshellHome("audit");
  const line = commandLine.trim();
  if (!line) return { lines: [], exitCode: 0 };

  const parts = line.split(/\s+/);
  const verb = parts[0]?.toLowerCase() ?? "";

  if (!SYNTHETIC_ALLOWED.has(verb)) {
    return {
      lines: [
        `qsh: ${verb}: not available in synthetic QSH mode.`,
        "Set LCL_QSH_MODE=host for local POSIX passthrough (local dev only).",
      ],
      exitCode: 127,
    };
  }

  if (verb === "pwd" || verb === "pwdx") {
    return { lines: [state.cwd], exitCode: 0 };
  }

  if (verb === "echo") {
    return { lines: [line.replace(/^echo\s+/i, "")], exitCode: 0 };
  }

  if (verb === "which") {
    const name = parts[1];
    if (!name) return { lines: [], exitCode: 1 };
    const stub = toHostPath(`/QOpenSys/usr/bin/${name}`, home);
    if (existsSync(stub)) {
      return { lines: [`/qopensys/usr/bin/${name}`], exitCode: 0 };
    }
    return { lines: [], exitCode: 1 };
  }

  if (verb === "cd") {
    const target = line.replace(/^cd\s+/i, "").trim() || home;
    const host = hostPathForSynthetic(target, home);
    if (!host || !assertWithinRoot(host)) {
      return { lines: [`cd: ${target}: No such file or directory`], exitCode: 1 };
    }
    if (!existsSync(host)) {
      return { lines: [`cd: ${target}: No such file or directory`], exitCode: 1 };
    }
    state.cwd = toPasePath(host, home);
    return { lines: [], exitCode: 0 };
  }

  if (verb === "ls") {
    const target = parts.slice(1).find((part) => !part.startsWith("-")) ?? state.cwd;
    const host = hostPathForSynthetic(target, home);
    if (!host || !assertWithinRoot(host)) {
      return { lines: [`ls: cannot access '${target}': No such file or directory`], exitCode: 1 };
    }
    if (!existsSync(host)) {
      return { lines: [`ls: cannot access '${target}': No such file or directory`], exitCode: 1 };
    }
    const stat = statSync(host);
    if (!stat.isDirectory()) {
      return { lines: [target.split("/").pop() ?? target], exitCode: 0 };
    }
    const entries = readdirSync(host).sort();
    return { lines: entries.length ? entries : ["."], exitCode: 0 };
  }

  if (verb === "cat") {
    const target = parts[1];
    if (!target) {
      return { lines: ["cat: missing operand"], exitCode: 1 };
    }
    const host = hostPathForSynthetic(target, home);
    if (!host || !assertWithinRoot(host) || !existsSync(host)) {
      return { lines: [`cat: ${target}: No such file or directory`], exitCode: 1 };
    }
    try {
      const content = readFileSync(host, "utf8");
      return { lines: content.replace(/\r/g, "").split("\n").filter((row, i, arr) => i < arr.length - 1 || row.length > 0), exitCode: 0 };
    } catch {
      return { lines: [`cat: ${target}: cannot read`], exitCode: 1 };
    }
  }

  return { lines: [`qsh: ${verb}: not implemented`], exitCode: 127 };
}

export function syntheticQshAvailable(): boolean {
  return true;
}
