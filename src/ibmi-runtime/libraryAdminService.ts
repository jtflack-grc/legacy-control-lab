import {
  insertLibrary as insertLibraryRow,
  libraryExists as libraryExistsInDb,
  listLibraries as listLibrariesInDb,
} from "../db/repositories/libraryRepository.js";
import type { IbmiSession } from "./sessionService.js";
import { getLibraryListSections } from "./libraryListService.js";

export type LibrarySummary = {
  name: string;
  type: string;
  text: string;
  aspDevice?: string;
};

export function listLibrariesForWork(session: IbmiSession): LibrarySummary[] {
  const names = listLibrariesInDb(session.systemName);
  const sections = getLibraryListSections(session);
  const inList = new Set([
    ...sections.system,
    ...sections.product,
    sections.current,
    ...sections.user,
  ]);
  return names.map((name) => ({
    name,
    type: inList.has(name) ? "PROD" : "TEST",
    text: name === "QSYS" ? "System library" : "Application library",
    aspDevice: "*SYSBAS",
  }));
}

export function changeCurrentLibrary(
  session: IbmiSession,
  libraryName: string,
): { ok: true } | { ok: false; message: string } {
  const lib = libraryName.trim().toUpperCase();
  if (!lib) return { ok: false, message: "CPF0006 - Library name required." };
  if (!libraryExistsInDb(session.systemName, lib)) {
    return { ok: false, message: `CPF2105 - Library ${lib} not found.` };
  }
  session.libraryList.current = lib;
  session.currentLibrary = lib;
  return { ok: true };
}

export function createLibrary(
  systemName: string,
  libraryName: string,
  text = "Lab library",
): { ok: true } | { ok: false; message: string } {
  const lib = libraryName.trim().toUpperCase();
  if (!lib) return { ok: false, message: "CPF0006 - Library name required." };
  if (libraryExistsInDb(systemName, lib)) {
    return { ok: false, message: `CPF2111 - Library ${lib} already exists.` };
  }
  insertLibraryRow(systemName, lib, text);
  return { ok: true };
}

export function getLibraryDescription(systemName: string, libraryName: string): LibrarySummary | undefined {
  const lib = libraryName.trim().toUpperCase();
  if (!libraryExistsInDb(systemName, lib)) return undefined;
  return {
    name: lib,
    type: lib === "QSYS" || lib === "QGPL" ? "PROD" : "PROD",
    text: lib === "CLAIMS400" ? "Claims processing application library" : `${lib} library`,
    aspDevice: "*SYSBAS",
  };
}
