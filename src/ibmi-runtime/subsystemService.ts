export type SubsystemEntry = {
  name: string;
  status: string;
  description: string;
};

const catalogs = new Map<string, SubsystemEntry[]>();

export function reloadSubsystemCatalog(systemName: string, entries: SubsystemEntry[]): void {
  catalogs.set(systemName, entries.map((entry) => ({ ...entry })));
}

export function listSubsystems(systemName: string): SubsystemEntry[] {
  return catalogs.get(systemName) ?? [];
}

export function updateSubsystemStatus(systemName: string, name: string, status: string): boolean {
  const list = catalogs.get(systemName);
  if (!list) return false;
  const entry = list.find((item) => item.name === name.trim().toUpperCase());
  if (!entry) return false;
  entry.status = status;
  return true;
}
