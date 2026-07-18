import { spawnSync } from "node:child_process";

import { existsSync } from "node:fs";

import { findSystemGitBash, getProjectRoot, resolveQshShellEnvPath } from "./qshellShellPaths.js";



export type QshShellRunner = {

  command: string;

  args: string[];

  label: string;

};



let cachedRunner: QshShellRunner | null | undefined;



function canRun(command: string, args: string[]): boolean {

  const result = spawnSync(command, args, { stdio: "ignore", timeout: 3000, windowsHide: true });

  return result.status === 0;

}



function shellArgs(runner: QshShellRunner, script: string): string[] {

  if (runner.command === "wsl.exe") return [...runner.args, "-c", script];

  return ["-c", script];

}



function runnerFromBash(bashPath: string, label: string): QshShellRunner {

  return { command: bashPath, args: [], label };

}



function wslRunner(): QshShellRunner {

  return { command: "wsl.exe", args: ["sh"], label: "wsl sh" };

}



function probeWsl(): QshShellRunner | undefined {

  if (canRun("wsl.exe", ["sh", "-c", "true"])) return wslRunner();

  return undefined;

}



function probeEnvShell(fromEnv: string, root: string): QshShellRunner | undefined {

  const lower = fromEnv.toLowerCase();

  if (lower === "wsl" || lower === "wsl.exe") return probeWsl();



  if (lower.endsWith("cmd.exe")) return undefined;



  const resolved = resolveQshShellEnvPath(fromEnv, root);

  if (existsSync(resolved) && canRun(resolved, ["-c", "true"])) {

    return runnerFromBash(resolved, "QSH_SHELL");

  }

  return undefined;

}



/** Resolve a POSIX shell for QSH (env → Linux sh → WSL → optional system Git bash). */

export function resolveQshShell(): QshShellRunner | undefined {

  if (cachedRunner !== undefined) return cachedRunner ?? undefined;



  const root = getProjectRoot();

  const fromEnv = process.env.QSH_SHELL?.trim();

  if (fromEnv) {

    const envRunner = probeEnvShell(fromEnv, root);

    if (envRunner) {

      cachedRunner = envRunner;

      return cachedRunner;

    }

  }



  if (canRun("/bin/sh", ["-c", "true"])) {

    cachedRunner = { command: "/bin/sh", args: [], label: "/bin/sh" };

    return cachedRunner;

  }



  if (process.platform === "win32") {

    const wsl = probeWsl();

    if (wsl) {

      cachedRunner = wsl;

      return cachedRunner;

    }



    const system = findSystemGitBash();

    if (system && canRun(system, ["-c", "true"])) {

      cachedRunner = runnerFromBash(system, "system git bash");

      return cachedRunner;

    }



    if (canRun("bash", ["-c", "true"])) {

      cachedRunner = { command: "bash", args: [], label: "bash" };

      return cachedRunner;

    }

  } else if (canRun("bash", ["-c", "true"])) {

    cachedRunner = { command: "bash", args: [], label: "bash" };

    return cachedRunner;

  }



  cachedRunner = null;

  return undefined;

}



export function qshShellAvailable(): boolean {

  const runner = resolveQshShell();

  if (!runner) return false;

  return canRun(runner.command, shellArgs(runner, "true"));

}



export function describeQshShell(): { available: boolean; label?: string; hint?: string } {

  resetQshShellCache();

  const runner = resolveQshShell();

  if (runner) {

    return { available: true, label: runner.label };

  }



  if (process.platform === "win32") {

    return {

      available: false,

      hint: "Install WSL and run npm run setup:qsh --fix, or set QSH_SHELL=wsl in .env. Docker dev needs no extra setup.",

    };

  }



  return {

    available: false,

    hint: "Install bash or run the lab in Docker (uses /bin/sh).",

  };

}



export function qshShellUnavailableMessage(): string {

  const { hint } = describeQshShell();

  return ["qsh: no POSIX shell found on this host.", hint ?? "Run: npm run setup:qsh"].join(" ");

}



export function runQshShellCommand(

  script: string,

  options: { cwd: string; env: NodeJS.ProcessEnv; timeout: number; maxBuffer: number },

): { stdout: string; stderr: string; status: number } {

  const runner = resolveQshShell();

  if (!runner) {

    return { stdout: "", stderr: qshShellUnavailableMessage(), status: 127 };

  }



  const result = spawnSync(runner.command, shellArgs(runner, script), {

    cwd: options.cwd,

    env: options.env,

    encoding: "utf8",

    timeout: options.timeout,

    maxBuffer: options.maxBuffer,

    stdio: ["ignore", "pipe", "pipe"],

    windowsHide: true,

  });



  return {

    stdout: String(result.stdout ?? ""),

    stderr: String(result.stderr ?? ""),

    status: result.status ?? (result.error ? 1 : 0),

  };

}



/** Reset cached probe (tests). */

export function resetQshShellCache(): void {

  cachedRunner = undefined;

}


