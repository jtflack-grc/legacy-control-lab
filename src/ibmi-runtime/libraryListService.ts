import { libraryExists as libraryExistsInCatalog } from "../db/repositories/libraryRepository.js";
import type { IbmiSession } from "./sessionService.js";

export type LibraryListSections = {
  system: string[];
  product: string[];
  current: string;
  user: string[];
};

export function getLibraryListSections(session: IbmiSession): LibraryListSections {
  return {
    system: [...session.libraryList.system],
    product: [...session.libraryList.product],
    current: session.libraryList.current ?? session.currentLibrary,
    user: [...session.libraryList.user],
  };
}

export function addLibraryEntry(
  session: IbmiSession,
  libraryName: string,
  systemName = session.systemName,
): { ok: true } | { ok: false; message: string } {
  const lib = libraryName.trim().toUpperCase();
  if (!lib) {
    return { ok: false, message: "CPF0006 - Library name required." };
  }

  if (!libraryExistsInCatalog(systemName, lib)) {
    return { ok: false, message: `CPF2105 - Library ${lib} not found.` };
  }

  const allEntries = [
    ...session.libraryList.system,
    ...session.libraryList.product,
    ...session.libraryList.user,
  ];
  if (session.libraryList.current) {
    allEntries.push(session.libraryList.current);
  }

  if (allEntries.includes(lib)) {
    return { ok: false, message: `CPF2110 - Library ${lib} already in library list.` };
  }

  session.libraryList.user.push(lib);
  return { ok: true };
}

export function removeLibraryEntry(
  session: IbmiSession,
  libraryName: string,
): { ok: true } | { ok: false; message: string } {
  const lib = libraryName.trim().toUpperCase();
  if (!lib) {
    return { ok: false, message: "CPF0006 - Library name required." };
  }

  const index = session.libraryList.user.indexOf(lib);
  if (index === -1) {
    return { ok: false, message: `CPF2105 - Library ${lib} not found in user portion of library list.` };
  }

  session.libraryList.user.splice(index, 1);
  return { ok: true };
}

export function displayLibraryList(session: IbmiSession): LibraryListSections {
  return getLibraryListSections(session);
}

export function libraryExists(systemName: string, libraryName: string): boolean {
  return libraryExistsInCatalog(systemName, libraryName);
}
