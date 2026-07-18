export type PhysicalFileField = {
  name: string;
  type: string;
  length: number;
  decimals: number;
  text: string;
};

export type PhysicalFile = {
  library: string;
  name: string;
  recordFormat: string;
  fileType: string;
  member: string;
  textDescription: string;
  recordLength: number;
  fields: PhysicalFileField[];
};

export type PhysicalFileSeed = PhysicalFile;

const catalogs = new Map<string, PhysicalFile[]>();

export function reloadPhysicalFileCatalog(systemName: string, files: PhysicalFileSeed[]): void {
  catalogs.set(systemName, files.map((file) => ({ ...file, fields: [...file.fields] })));
}

export function listPhysicalFiles(systemName = "CLAIMS400"): PhysicalFile[] {
  return catalogs.get(systemName) ?? [];
}

export function getPhysicalFile(
  systemName: string,
  library: string,
  name: string,
): PhysicalFile | undefined {
  const lib = library.toUpperCase();
  const file = name.toUpperCase();
  return listPhysicalFiles(systemName).find(
    (entry) => entry.library.toUpperCase() === lib && entry.name.toUpperCase() === file,
  );
}
