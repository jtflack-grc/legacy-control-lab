import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getQOpenSysRoot, toHostPath } from "./qshellPaths.js";

const DEFAULT_PASE_CCSID = 819;
const STORE_DIR = ".pase";
const STORE_FILE = "ccsids.json";

type CcsidStore = Record<string, number>;

function storePath(): string {
  return join(getQOpenSysRoot(), STORE_DIR, STORE_FILE);
}

function loadStore(): CcsidStore {
  const path = storePath();
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CcsidStore;
  } catch {
    return {};
  }
}

function saveStore(store: CcsidStore): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeKey(pasePath: string, home: string): string {
  return toHostPath(pasePath, home).replace(/\\/g, "/").toLowerCase();
}

export function getPaseCcsid(pasePath: string, home: string): number {
  const store = loadStore();
  return store[normalizeKey(pasePath, home)] ?? DEFAULT_PASE_CCSID;
}

export function setPaseCcsid(pasePath: string, ccsid: number, home: string): { ok: true } | { ok: false; message: string } {
  if (!Number.isFinite(ccsid) || ccsid <= 0) {
    return { ok: false, message: "setccsid: CCSID must be a positive number." };
  }
  const host = toHostPath(pasePath, home);
  if (!existsSync(host)) {
    return { ok: false, message: `CPF9810 - Object ${pasePath} not found.` };
  }
  const store = loadStore();
  store[normalizeKey(pasePath, home)] = Math.trunc(ccsid);
  saveStore(store);
  return { ok: true };
}

export function defaultPaseCcsid(): number {
  return DEFAULT_PASE_CCSID;
}

/** Reset store (tests). */
export function resetPaseCcsidStore(): void {
  const path = storePath();
  if (existsSync(path)) writeFileSync(path, "{}\n", "utf8");
}
