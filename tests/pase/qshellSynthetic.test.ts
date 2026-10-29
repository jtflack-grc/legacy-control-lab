import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSyntheticShell } from "../../src/ibmi-runtime/pase/qshellSynthetic.js";

type TestState = { cwd: string; env: Record<string, string> };
let root = "";
let oldRoot: string | undefined;
let audit: TestState;
let clerk: TestState;

const run = (command: string, state = audit) => runSyntheticShell(command, state);

beforeEach(() => {
  oldRoot = process.env.QOPENSYS_ROOT;
  root = mkdtempSync(join(tmpdir(), "lcl-pase-"));
  process.env.QOPENSYS_ROOT = root;
  mkdirSync(join(root, "home", "audit"), { recursive: true });
  mkdirSync(join(root, "home", "clerk"), { recursive: true });
  audit = { cwd: "/home/audit", env: { USER: "audit", HOME: "/home/audit" } };
  clerk = { cwd: "/home/clerk", env: { USER: "clerk", HOME: "/home/clerk" } };
});

afterEach(() => {
  if (oldRoot === undefined) delete process.env.QOPENSYS_ROOT;
  else process.env.QOPENSYS_ROOT = oldRoot;
  rmSync(root, { recursive: true, force: true });
});

describe("synthetic PASE filesystem", () => {
  it("creates directories and writes, appends, reads, copies and moves files", () => {
    expect(run("mkdir -p training/notes").exitCode).toBe(0);
    expect(run('echo "control evidence" > training/notes/a.txt').exitCode).toBe(0);
    expect(run('echo "reviewed" >> training/notes/a.txt').exitCode).toBe(0);
    expect(run("cat training/notes/a.txt").lines).toEqual(["control evidence", "reviewed"]);
    expect(run("cp training/notes/a.txt training/notes/b.txt").exitCode).toBe(0);
    expect(run("mv training/notes/b.txt training/notes/c.txt").exitCode).toBe(0);
    expect(run("cat training/notes/c.txt").lines).toEqual(["control evidence", "reviewed"]);
    expect(existsSync(join(root, "home", "audit", "training", "notes", "b.txt"))).toBe(false);
    expect(run("rm training/notes/c.txt").exitCode).toBe(0);
    expect(run("cat training/notes/c.txt").exitCode).toBe(1);
  });

  it("enforces simulated owner and public permissions regardless of OS user", () => {
    expect(run('echo secret > private.txt').exitCode).toBe(0);
    expect(run("chmod 600 private.txt").exitCode).toBe(0);
    expect(run("cat /home/audit/private.txt", clerk).exitCode).toBe(1);
    expect(run('echo stolen > /home/audit/private.txt', clerk).exitCode).toBe(1);
    expect(run("chmod 644 /home/audit/private.txt", clerk).exitCode).toBe(1);
    expect(run("cat private.txt").lines).toEqual(["secret"]);
    expect(run("chmod 400 private.txt").exitCode).toBe(0);
    expect(run("echo new > private.txt").exitCode).toBe(1);
    expect(run("chmod 600 private.txt").exitCode).toBe(0);
    expect(run("echo new > private.txt").exitCode).toBe(0);
  });

  it("requires directory write and traverse rights for new files", () => {
    expect(run("mkdir restricted").exitCode).toBe(0);
    expect(run("chmod 500 restricted").exitCode).toBe(0);
    expect(run("touch restricted/no.txt").exitCode).toBe(1);
    expect(run("chmod 700 restricted").exitCode).toBe(0);
    expect(run("touch restricted/yes.txt").exitCode).toBe(0);
    expect(run("cat /home/audit/restricted/yes.txt", clerk).exitCode).toBe(1);
    expect(run("ls -l restricted").lines[0]).toContain("yes.txt");
  });

  it("cannot reach actual OS paths or follow symlinks, including dangling links", () => {
    const outside = join(tmpdir(), "outside-lcl-" + Date.now());
    mkdirSync(outside, { recursive: true });
    try {
      symlinkSync(outside, join(root, "home", "audit", "shortcut"));
      symlinkSync(join(outside, "missing.txt"), join(root, "home", "audit", "dangling"));
      expect(run("echo no > shortcut/escape.txt").exitCode).toBe(1);
      expect(run("cat dangling").exitCode).toBe(1);
      expect(run("cat /etc/passwd").exitCode).toBe(1);
      expect(run("touch ../../../../etc/passwd").exitCode).toBe(1);
      expect(run("cd /usr/bin").exitCode).toBe(1);
      expect(existsSync(join(outside, "escape.txt"))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("persists virtual permissions without exposing the metadata file", () => {
    expect(run("touch report.txt").exitCode).toBe(0);
    expect(run("chmod 600 report.txt").exitCode).toBe(0);
    expect(run("ls -l").lines.some(s => s.includes("600 audit report.txt"))).toBe(true);
    expect(run("ls /QOpenSys").lines).not.toContain(".lcl-synthetic-permissions.json");
    expect(run("cat /QOpenSys/.lcl-synthetic-permissions.json").exitCode).toBe(1);
    expect(readFileSync(join(root, ".lcl-synthetic-permissions.json"), "utf8")).toContain("report.txt");
  });

  it("refuses unsupported process execution in synthetic mode", () => {
    expect(run("sh -c id").exitCode).toBe(127);
    expect(run("python3 -c print(1)").exitCode).toBe(127);
    expect(run("id").lines).toEqual(["user=audit (synthetic PASE)"]);
  });
});
