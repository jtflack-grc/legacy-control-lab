import { existsSync } from "node:fs";

import path from "node:path";

import { fileURLToPath } from "node:url";



const moduleDir = path.dirname(fileURLToPath(import.meta.url));



/** Repo root (works from src/ and dist/ after build). */

export function getProjectRoot(): string {

  const fromModule = path.resolve(moduleDir, "..", "..", "..");

  const hasPackage = existsSync(path.join(fromModule, "package.json"));

  if (hasPackage) return fromModule;

  return process.cwd();

}



export function systemGitBashCandidates(): string[] {

  return [

    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Git", "bin", "bash.exe"),

    process.env["ProgramFiles(x86)"] &&

      path.join(process.env["ProgramFiles(x86)"], "Git", "bin", "bash.exe"),

    "C:\\Program Files\\Git\\bin\\bash.exe",

  ].filter((entry): entry is string => Boolean(entry));

}



export function findSystemGitBash(): string | undefined {

  return systemGitBashCandidates().find((candidate) => existsSync(candidate));

}



/** Resolve QSH_SHELL env value (absolute or relative to project root). */

export function resolveQshShellEnvPath(raw: string, root = getProjectRoot()): string {

  const trimmed = raw.trim();

  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();

  if (lower === "wsl" || lower === "wsl.exe") return trimmed;

  if (path.isAbsolute(trimmed)) return trimmed;

  const normalized = trimmed.replace(/^\.\//, "");

  return path.resolve(root, normalized);

}



/** Relative POSIX-style path for .env when shell lives under the repo. */

export function relativeEnvShellPath(shellPath: string, root = getProjectRoot()): string {

  const rel = path.relative(root, shellPath);

  return rel.split(path.sep).join("/");

}


