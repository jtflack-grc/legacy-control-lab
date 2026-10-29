/**
 * Synthetic QSH filesystem. Original LCL implementation: no POSIX subprocesses.
 *
 * The only physical IO is confined to QOPENSYS_ROOT. Virtual permissions are
 * checked independently of the service account's operating-system privileges.
 * Deliberately limited: no symlinks, pipelines, execution, or host paths.
 */
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync,
  renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { posix, relative, resolve, sep } from "node:path";
import { defaultQshellHome, getQOpenSysRoot } from "./qshellPaths.js";
import type { QshellExecResult } from "./qshellTypes.js";

type State = { cwd: string; env: Record<string, string> };
type Entry = { owner: string; mode: number };
type Entries = Record<string, Entry>;

const META_FILE = ".lcl-synthetic-permissions.json";
const MAX_FILE_BYTES = 128 * 1024;
const COMMANDS = new Set([
  "pwd", "pwdx", "cd", "ls", "cat", "echo", "which",
  "mkdir", "touch", "chmod", "cp", "mv", "rm", "id",
]);

function success(lines: string[] = []): QshellExecResult {
  return { lines, exitCode: 0 };
}
function fail(verb: string, detail: string): QshellExecResult {
  return { lines: [verb + ": " + detail], exitCode: 1 };
}
function userOf(state: State): string {
  return (state.env.USER || "audit").toLowerCase();
}
function isOfficer(state: State): boolean {
  return userOf(state) === "qsecofr";
}

function rootPath(): string {
  const root = getQOpenSysRoot();
  mkdirSync(root, { recursive: true });
  return realpathSync(root);
}

/** The virtual root is NOT the operating-system root. */
function filePath(raw: string, state: State, root: string): string | undefined {
  if (!raw || raw.includes("\0") || raw.includes("\\") || raw.length > 1024) return undefined;
  const token = raw === "~" ? (state.env.HOME || defaultQshellHome(userOf(state)))
    : raw.startsWith("~/") ? (state.env.HOME || defaultQshellHome(userOf(state))) + raw.slice(1)
    : raw;
  let virtual = posix.normalize(token.startsWith("/") ? token : posix.join(state.cwd, token));
  virtual = virtual.replace(/^\/qopensys(?=\/|$)/i, "/QOpenSys");
  let suffix: string;
  if (virtual === "/" || virtual === "/QOpenSys") suffix = "";
  else if (virtual.startsWith("/QOpenSys/")) suffix = virtual.slice("/QOpenSys/".length);
  else if (virtual === "/home" || virtual.startsWith("/home/") ||
           virtual === "/tmp" || virtual.startsWith("/tmp/")) suffix = virtual.slice(1);
  else return undefined;

  if (suffix.split("/").includes(META_FILE)) return undefined;
  const physical = resolve(root, suffix);
  if (physical !== root && !physical.startsWith(root + sep)) return undefined;

  // Never follow a symlink, even in an intermediate component. A dangling link
  // is unsafe as well; existsSync alone does not detect dangling symlinks.
  const parts = relative(root, physical).split(sep).filter(Boolean);
  let cursor = root;
  for (const part of parts) {
    cursor = resolve(cursor, part);
    try {
      if (lstatSync(cursor).isSymbolicLink()) return undefined;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") break;
      return undefined;
    }
  }
  return physical;
}

function displayPath(root: string, physical: string): string {
  const rel = relative(root, physical).replace(/\\/g, "/");
  if (!rel) return "/QOpenSys";
  if (rel === "home" || rel.startsWith("home/") || rel === "tmp" || rel.startsWith("tmp/"))
    return "/" + rel;
  return "/QOpenSys/" + rel;
}

function loadEntries(root: string): Entries {
  try {
    const raw = JSON.parse(readFileSync(resolve(root, META_FILE), "utf8")) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const entries: Entries = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!value || typeof value !== "object") continue;
      const row = value as Partial<Entry>;
      if (typeof row.owner !== "string" || typeof row.mode !== "number" ||
          !Number.isInteger(row.mode) || row.mode < 0 || row.mode > 0o777) continue;
      entries[key] = { owner: row.owner.toLowerCase(), mode: row.mode };
    }
    return entries;
  } catch {
    return {};
  }
}

function saveEntries(root: string, entries: Entries): void {
  writeFileSync(resolve(root, META_FILE), JSON.stringify(entries, null, 2) + "\n", { mode: 0o600 });
}
function key(root: string, physical: string): string {
  return relative(root, physical).replace(/\\/g, "/") || ".";
}
function entryFor(root: string, physical: string, entries: Entries): Entry {
  const item = entries[key(root, physical)];
  if (item) return item;
  const rel = key(root, physical);
  const homeMatch = /^home\/([^/]+)(\/|$)/.exec(rel);
  return {
    owner: homeMatch ? homeMatch[1]!.toLowerCase() : "qsecofr",
    mode: existsSync(physical) && lstatSync(physical).isDirectory() ? 0o755 : 0o644,
  };
}

/** Only owner and other bits are modeled; group membership is out of scope. */
function allowed(root: string, physical: string, entries: Entries, state: State, bit: number): boolean {
  if (isOfficer(state)) return true;
  const entry = entryFor(root, physical, entries);
  const effective = entry.owner === userOf(state) ? (entry.mode >> 6) & 7 : entry.mode & 7;
  return (effective & bit) === bit;
}
function traversable(root: string, physical: string, entries: Entries, state: State): boolean {
  let current = physical;
  while (current !== root) {
    current = resolve(current, "..");
    if (!existsSync(current) || !lstatSync(current).isDirectory() ||
        !allowed(root, current, entries, state, 1)) return false;
  }
  return allowed(root, root, entries, state, 1);
}
function canRead(root: string, physical: string, entries: Entries, state: State): boolean {
  return traversable(root, physical, entries, state) &&
    allowed(root, physical, entries, state, 4);
}
function canWrite(root: string, physical: string, entries: Entries, state: State): boolean {
  return traversable(root, physical, entries, state) &&
    allowed(root, physical, entries, state, 2);
}
function canCreate(root: string, physical: string, entries: Entries, state: State): boolean {
  const parent = resolve(physical, "..");
  return existsSync(parent) && lstatSync(parent).isDirectory() &&
    traversable(root, parent, entries, state) &&
    allowed(root, parent, entries, state, 3);
}
function setCreated(root: string, physical: string, entries: Entries, state: State, dir: boolean): void {
  entries[key(root, physical)] = { owner: userOf(state), mode: dir ? 0o755 : 0o644 };
  saveEntries(root, entries);
}

/** Whitespace and quotes only. Metacharacters are NOT executed. */
function tokenize(input: string): string[] | undefined {
  const tokens: string[] = [];
  let part = "";
  let active = false;
  let quote: "'" | '"' | undefined;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quote) {
      if (ch === quote) quote = undefined;
      else if (ch === "\\" && quote === '"' && i + 1 < input.length) part += input[++i]!;
      else part += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; active = true; continue; }
    if (ch === "\\") { if (i + 1 >= input.length) return undefined; part += input[++i]!; active = true; continue; }
    if (/\s/.test(ch)) {
      if (active) { tokens.push(part); part = ""; active = false; }
    } else { part += ch; active = true; }
  }
  if (quote) return undefined;
  if (active) tokens.push(part);
  return tokens;
}

export function runSyntheticShell(commandLine: string, state: State): QshellExecResult {
  const line = commandLine.trim();
  if (!line) return success();
  const tokens = tokenize(line);
  if (!tokens || tokens.length === 0) return fail("qsh", "unbalanced quotes or escape");
  const [rawVerb, ...args] = tokens;
  const verb = rawVerb!.toLowerCase();
  if (!COMMANDS.has(verb)) {
    return { lines: ["qsh: " + verb + ": not available in synthetic QSH mode."], exitCode: 127 };
  }

  try {
    const root = rootPath();
    const entries = loadEntries(root);
    const locate = (item: string) => filePath(item, state, root);
    const denied = (item: string) => fail(verb, item + ": Permission denied or outside synthetic filesystem");
    const missing = (item: string) => fail(verb, item + ": No such file or directory");

    if (verb === "pwd" || verb === "pwdx") return success([state.cwd]);
    if (verb === "id") return success(["user=" + userOf(state) + " (synthetic PASE)"]);
    if (verb === "which") {
      const target = args[0]?.toLowerCase();
      return target && COMMANDS.has(target) ? success(["/QOpenSys/usr/bin/" + target]) : fail(verb, target || "command required");
    }

    if (verb === "echo") {
      const i = args.findIndex(item => item === ">" || item === ">>");
      if (i < 0) return success([args.join(" ")]);
      if (i !== args.length - 2) return fail(verb, "expected > or >> followed by one path");
      const destination = locate(args[i + 1]!);
      if (!destination) return denied(args[i + 1]!);
      if (existsSync(destination) && (!lstatSync(destination).isFile() || !canWrite(root, destination, entries, state)))
        return denied(args[i + 1]!);
      if (!existsSync(destination) && !canCreate(root, destination, entries, state)) return denied(args[i + 1]!);
      const existing = args[i] === ">>" && existsSync(destination) ? readFileSync(destination, "utf8") : "";
      const next = existing + args.slice(0, i).join(" ") + "\n";
      if (Buffer.byteLength(next) > MAX_FILE_BYTES) return fail(verb, "synthetic file size limit exceeded");
      const created = !existsSync(destination);
      writeFileSync(destination, next);
      if (created) setCreated(root, destination, entries, state, false);
      return success();
    }

    if (verb === "cd") {
      const name = args[0] || state.env.HOME || defaultQshellHome(userOf(state));
      const target = locate(name);
      if (!target) return denied(name);
      if (!existsSync(target) || !lstatSync(target).isDirectory()) return missing(name);
      if (!traversable(root, target, entries, state) || !allowed(root, target, entries, state, 1)) return denied(name);
      state.cwd = displayPath(root, target);
      return success();
    }

    if (verb === "ls") {
      const long = args.includes("-l");
      const name = args.find(item => !item.startsWith("-")) || state.cwd;
      const target = locate(name);
      if (!target) return denied(name);
      if (!existsSync(target)) return missing(name);
      if (!canRead(root, target, entries, state)) return denied(name);
      if (!lstatSync(target).isDirectory()) return success([posix.basename(name)]);
      if (!allowed(root, target, entries, state, 1)) return denied(name);
      const files = readdirSync(target).filter(item => item !== META_FILE && !item.startsWith(".")).sort();
      return success(files.map(item => {
        if (!long) return item;
        const p = resolve(target, item);
        if (!locate(displayPath(root, p))) return item + " (inaccessible)";
        const e = entryFor(root, p, entries);
        return (lstatSync(p).isDirectory() ? "d" : "-") + e.mode.toString(8).padStart(3, "0") + " " + e.owner + " " + item;
      }));
    }

    if (verb === "cat") {
      if (args.length === 0) return fail(verb, "file required");
      const lines: string[] = [];
      for (const name of args) {
        const target = locate(name);
        if (!target) return denied(name);
        if (!existsSync(target)) return missing(name);
        if (!lstatSync(target).isFile() || !canRead(root, target, entries, state)) return denied(name);
        if (lstatSync(target).size > MAX_FILE_BYTES) return fail(verb, "synthetic file size limit exceeded");
        const content = readFileSync(target, "utf8").replace(/\r/g, "");
        lines.push(...content.split("\n").filter((row, i, arr) => i < arr.length - 1 || row !== ""));
      }
      return success(lines);
    }

    if (verb === "mkdir") {
      const recursive = args.includes("-p");
      const names = args.filter(a => a !== "-p");
      if (names.length === 0) return fail(verb, "directory required");
      for (const name of names) {
        const target = locate(name);
        if (!target) return denied(name);
        if (existsSync(target)) {
          if (recursive && lstatSync(target).isDirectory()) continue;
          return fail(verb, name + ": File exists");
        }
        const pending: string[] = [];
        let cursor = target;
        while (!existsSync(cursor) && cursor !== root) { pending.unshift(cursor); cursor = resolve(cursor, ".."); }
        if (!recursive && pending.length !== 1) return missing(name);
        for (const dir of pending) {
          if (!canCreate(root, dir, entries, state)) return denied(name);
          mkdirSync(dir);
          setCreated(root, dir, entries, state, true);
        }
      }
      return success();
    }

    if (verb === "touch") {
      if (args.length === 0) return fail(verb, "file required");
      for (const name of args) {
        const target = locate(name);
        if (!target) return denied(name);
        if (existsSync(target)) {
          if (!lstatSync(target).isFile() || !canWrite(root, target, entries, state)) return denied(name);
        } else {
          if (!canCreate(root, target, entries, state)) return denied(name);
          writeFileSync(target, "");
          setCreated(root, target, entries, state, false);
        }
      }
      return success();
    }

    if (verb === "chmod") {
      if (args.length !== 2 || !/^[0-7]{3}$/.test(args[0]!)) return fail(verb, "usage: chmod MODE(000-777) FILE");
      const name = args[1]!;
      const target = locate(name);
      if (!target) return denied(name);
      if (!existsSync(target)) return missing(name);
      if (!isOfficer(state) && entryFor(root, target, entries).owner !== userOf(state)) return denied(name);
      entries[key(root, target)] = { ...entryFor(root, target, entries), mode: Number.parseInt(args[0]!, 8) };
      saveEntries(root, entries);
      return success();
    }

    if (verb === "cp" || verb === "mv") {
      if (args.length !== 2) return fail(verb, "usage: " + verb + " SOURCE DESTINATION");
      const src = locate(args[0]!);
      let dst = locate(args[1]!);
      if (!src || !dst) return denied(!src ? args[0]! : args[1]!);
      if (!existsSync(src)) return missing(args[0]!);
      if (!lstatSync(src).isFile()) return fail(verb, "only regular files are supported");
      if (existsSync(dst) && lstatSync(dst).isDirectory()) dst = resolve(dst, posix.basename(src));
      if (!locate(displayPath(root, dst))) return denied(args[1]!);
      if (src === dst) return success();
      if (verb === "cp" && !canRead(root, src, entries, state)) return denied(args[0]!);
      if (verb === "mv" && !canCreate(root, src, entries, state)) return denied(args[0]!);
      if (existsSync(dst)) {
        if (!lstatSync(dst).isFile()) return denied(args[1]!);
        if (verb === "cp" && !canWrite(root, dst, entries, state)) return denied(args[1]!);
      }
      if (!canCreate(root, dst, entries, state)) return denied(args[1]!);
      if (lstatSync(src).size > MAX_FILE_BYTES) return fail(verb, "synthetic file size limit exceeded");
      const created = !existsSync(dst);
      if (verb === "cp") {
        writeFileSync(dst, readFileSync(src));
        if (created) setCreated(root, dst, entries, state, false);
      } else {
        renameSync(src, dst);
        const sourceEntry = entryFor(root, src, entries);
        delete entries[key(root, src)];
        entries[key(root, dst)] = sourceEntry;
        saveEntries(root, entries);
      }
      return success();
    }

    if (verb === "rm") {
      const force = args.includes("-f");
      const names = args.filter(item => item !== "-f");
      if (names.length === 0) return fail(verb, "file required (-r not yet supported)");
      for (const name of names) {
        const target = locate(name);
        if (!target) return denied(name);
        if (!existsSync(target)) { if (force) continue; return missing(name); }
        if (!lstatSync(target).isFile() || !canCreate(root, target, entries, state)) return denied(name);
        unlinkSync(target);
        delete entries[key(root, target)];
        saveEntries(root, entries);
      }
      return success();
    }

    return fail("qsh", verb + ": not implemented");
  } catch (error) {
    // Never leak host filesystem paths in a lab message.
    const code = (error as NodeJS.ErrnoException).code;
    return fail(verb, code ? "synthetic filesystem error (" + code + ")" : "synthetic filesystem error");
  }
}

export function syntheticQshAvailable(): boolean {
  return true;
}
