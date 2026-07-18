export type SourceMember = {
  library: string;
  file: string;
  member: string;
  sourceType: string;
  text: string;
  lines: string[];
};

export type ProgramReference = {
  program: string;
  library: string;
  file: string;
  fileLibrary: string;
  usage: string;
};

const sourceCatalog = new Map<string, SourceMember[]>();
const referenceCatalog = new Map<string, ProgramReference[]>();

export function reloadSourceMemberCatalog(systemName: string, members: SourceMember[]): void {
  sourceCatalog.set(
    systemName,
    members.map((member) => ({ ...member, lines: [...member.lines] })),
  );
}

export function reloadProgramReferenceCatalog(systemName: string, refs: ProgramReference[]): void {
  referenceCatalog.set(systemName, refs.map((ref) => ({ ...ref })));
}

export function listSourceMembers(systemName: string, library?: string, file?: string): SourceMember[] {
  const all = sourceCatalog.get(systemName) ?? [];
  return all.filter((member) => {
    if (library && member.library.toUpperCase() !== library.toUpperCase()) return false;
    if (file && member.file.toUpperCase() !== file.toUpperCase()) return false;
    return true;
  });
}

export function getSourceMember(
  systemName: string,
  library: string,
  file: string,
  member: string,
): SourceMember | undefined {
  return listSourceMembers(systemName, library, file).find(
    (entry) => entry.member.toUpperCase() === member.toUpperCase(),
  );
}

export function listSourceFiles(systemName: string, library = "CLAIMS400"): string[] {
  const files = new Set(
    listSourceMembers(systemName, library).map((member) => member.file.toUpperCase()),
  );
  return [...files].sort();
}

export function listProgramReferences(systemName: string, program?: string): ProgramReference[] {
  const all = referenceCatalog.get(systemName) ?? [];
  if (!program) return all;
  return all.filter((ref) => ref.program.toUpperCase() === program.toUpperCase());
}
