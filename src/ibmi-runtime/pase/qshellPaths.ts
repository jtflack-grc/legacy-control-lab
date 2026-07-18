import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { seedQOpenSysLayout } from "./seedQOpenSys.js";

/** Lab root for /QOpenSys — maps to Linux filesystem inside Docker. */
export function getQOpenSysRoot(): string {
  const fromEnv = process.env.QOPENSYS_ROOT?.trim();
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "qopensys");
}

/** Normalize path; accept lowercase /qopensys and ~ */
export function normalizePasePath(path: string, home = "/home"): string {
  let trimmed = path.trim().replace(/\\/g, "/");
  if (!trimmed) return ".";
  if (trimmed === "~") return home;
  if (trimmed.startsWith("~/")) return `${home}${trimmed.slice(1)}`;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("/qopensys")) {
    trimmed = `/QOpenSys${trimmed.slice(9)}`;
  }
  return trimmed;
}

/** Translate an IFS/PASE path to a host path under the container. */
export function toHostPath(pasePath: string, home = defaultQshellHome("audit")): string {
  const normalized = normalizePasePath(pasePath, home);
  const root = getQOpenSysRoot();

  if (normalized.toLowerCase().startsWith("/qopensys")) {
    const suffix = normalized.slice("/QOpenSys".length) || "/";
    return suffix === "/" ? root : join(root, suffix.replace(/^\//, ""));
  }
  if (normalized === "/home") return join(root, "home");
  if (normalized.toLowerCase().startsWith("/home/")) {
    return join(root, "home", normalized.slice("/home/".length));
  }
  if (normalized.startsWith("/tmp")) return normalized;
  if (normalized.startsWith("/usr/") || normalized.startsWith("/bin") || normalized.startsWith("/etc")) {
    return normalized;
  }
  if (normalized.startsWith("/")) {
    return join(root, normalized.slice(1));
  }
  return join(root, normalized);
}

/** Translate a host path back to a PASE-style path for prompts and pwd. */
export function toPasePath(hostPath: string, home = defaultQshellHome("audit")): string {
  const root = getQOpenSysRoot().replace(/\\/g, "/");
  const normalized = hostPath.replace(/\\/g, "/");
  const homeRoot = `${root}/home`;

  if (normalized.startsWith(homeRoot)) {
    return `/home${normalized.slice(homeRoot.length) || ""}`.toLowerCase();
  }
  if (normalized.startsWith(root)) {
    const rel = normalized.slice(root.length) || "/";
    const qPath = rel.startsWith("/") ? `/qopensys${rel}` : `/qopensys/${rel}`;
    return qPath.toLowerCase();
  }
  if (normalized.startsWith("/tmp")) return normalized;
  if (normalized.startsWith("/usr/") || normalized.startsWith("/bin") || normalized.startsWith("/etc")) {
    return normalized;
  }
  return normalized;
}

export function defaultQshellHome(userName: string): string {
  return `/home/${userName.trim().toLowerCase()}`;
}

export function ensureQshellHome(userName: string): string {
  seedQOpenSysLayout();
  const hostHome = toHostPath(defaultQshellHome(userName));
  if (!existsSync(hostHome)) {
    mkdirSync(hostHome, { recursive: true });
  }
  mkdirSync(toHostPath("/tmp"), { recursive: true });
  mkdirSync(join(getQOpenSysRoot(), "usr", "bin"), { recursive: true });
  mkdirSync(getQOpenSysRoot(), { recursive: true });
  return hostHome;
}

const PASE_PATH_PATTERN =
  /(?:~\/|\/(?:qopensys|QOpenSys|home|tmp|usr|bin|etc)(?:\/[^\s;&|><"'`$]*)?)/gi;

/** Rewrite PASE paths in a shell command to host paths (case-insensitive /qopensys). */
export function translateShellCommand(command: string, home: string): string {
  const hostPath = (pasePath: string) => toHostPath(pasePath, home).replace(/\\/g, "/");
  return command.replace(PASE_PATH_PATTERN, (match) => {
    if (match.startsWith("~/")) {
      return hostPath(`${home}/${match.slice(2)}`);
    }
    return hostPath(match);
  });
}

export function shellPathEnv(): string {
  const qopensysBin = toHostPath("/QOpenSys/usr/bin").replace(/\\/g, "/");
  const qopensysSbin = toHostPath("/QOpenSys/usr/sbin").replace(/\\/g, "/");
  return `${qopensysBin}:${qopensysSbin}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`;
}
