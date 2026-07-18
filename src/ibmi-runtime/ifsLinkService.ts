export type IfsLink = {
  directory: string;
  name: string;
  linkType: string;
  target: string;
  owner: string;
  dataAuthority: string;
  textDescription: string;
};

export type IfsLinkSeed = IfsLink;

const catalogs = new Map<string, IfsLink[]>();

function normalizeDirectory(path: string): string {
  const trimmed = path.trim() || "/";
  if (trimmed === "/") return "/";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function reloadIfsLinkCatalog(systemName: string, links: IfsLinkSeed[]): void {
  catalogs.set(systemName, links.map((link) => ({ ...link })));
}

export function listIfsLinks(systemName: string, directory: string): IfsLink[] {
  const dir = normalizeDirectory(directory);
  return (catalogs.get(systemName) ?? []).filter((link) => normalizeDirectory(link.directory) === dir);
}

export function getIfsLink(systemName: string, directory: string, name: string): IfsLink | undefined {
  const dir = normalizeDirectory(directory);
  const entryName = name.toLowerCase();
  return listIfsLinks(systemName, dir).find((link) => link.name.toLowerCase() === entryName);
}

export function getIfsLinkCatalog(systemName: string): IfsLink[] {
  return (catalogs.get(systemName) ?? []).map((link) => ({ ...link }));
}

export function updateIfsLinkAuthority(
  systemName: string,
  fullPath: string,
  dataAuthority: string,
): { ok: true; before: IfsLink; after: IfsLink } | { ok: false; message: string } {
  const link = resolveIfsLinkPath(systemName, fullPath);
  if (!link) {
    return { ok: false, message: `CPF2204 - IFS object ${fullPath} not found.` };
  }
  const before = { ...link };
  link.dataAuthority = dataAuthority.trim().toUpperCase();
  return { ok: true, before, after: { ...link } };
}

export function resolveIfsLinkPath(systemName: string, fullPath: string): IfsLink | undefined {
  const normalized = normalizeDirectory(fullPath);
  const slash = normalized.lastIndexOf("/");
  const directory = slash <= 0 ? "/" : normalized.slice(0, slash);
  const name = slash < 0 ? normalized : normalized.slice(slash + 1);
  if (!name) return undefined;
  return getIfsLink(systemName, directory, name);
}
