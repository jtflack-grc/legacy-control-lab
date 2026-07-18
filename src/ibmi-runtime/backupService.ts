import { listLibraries } from "../db/repositories/libraryRepository.js";

const savedLibraries = new Map<string, Set<string>>();

export function resetBackupState(systemName: string): void {
  savedLibraries.delete(systemName);
}

export function libraryExists(systemName: string, library: string): boolean {
  const lib = library.toUpperCase();
  return listLibraries(systemName).some((name) => name.toUpperCase() === lib);
}

export function isLibrarySaved(systemName: string, library: string): boolean {
  return savedLibraries.get(systemName)?.has(library.toUpperCase()) ?? false;
}

export function saveLibrary(
  systemName: string,
  library: string,
): { ok: true; message: string } | { ok: false; message: string } {
  const lib = library.trim().toUpperCase();
  if (!lib) {
    return { ok: false, message: "CPF0006 - Library name required." };
  }
  if (!libraryExists(systemName, lib)) {
    return { ok: false, message: `CPF2105 - Library ${lib} not found.` };
  }
  const set = savedLibraries.get(systemName) ?? new Set<string>();
  set.add(lib);
  savedLibraries.set(systemName, set);
  return {
    ok: true,
    message: `Library ${lib} saved to QGPL/SAV${lib}.`,
  };
}

export function restoreLibrary(
  systemName: string,
  library: string,
): { ok: true; message: string } | { ok: false; message: string } {
  const lib = library.trim().toUpperCase();
  if (!lib) {
    return { ok: false, message: "CPF0006 - Library name required." };
  }
  if (!isLibrarySaved(systemName, lib)) {
    return {
      ok: false,
      message: `CPF3780 - Save file QGPL/SAV${lib} not found. Run SAVLIB LIB(${lib}) first.`,
    };
  }
  return {
    ok: true,
    message: `Library ${lib} restored from QGPL/SAV${lib}.`,
  };
}
