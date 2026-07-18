import {
  findObjects as findObjectRows,
  getObject as getObjectRow,
  listObjects as listObjectRows,
  type CatalogObjectRow,
  type ObjectFilter,
} from "../db/repositories/objectRepository.js";

export type CatalogObject = CatalogObjectRow;

export function listCatalogObjects(systemName = "CLAIMS400"): CatalogObject[] {
  return listObjectRows(systemName);
}

export function getCatalogObject(
  systemName: string,
  library: string,
  object: string,
): CatalogObject | undefined {
  return getObjectRow(systemName, library, object);
}

export function filterCatalogObjects(systemName: string, filter: ObjectFilter): CatalogObject[] {
  return findObjectRows(systemName, filter);
}

export function listObjectsByOwner(
  systemName: string,
  owner: string,
  objType = "*ALL",
): CatalogObject[] {
  const normalizedOwner = owner.trim().toUpperCase();
  const typeFilter = objType.trim().toUpperCase();
  return findObjectRows(systemName, {
    owner: normalizedOwner,
    ...(typeFilter && typeFilter !== "*ALL" ? { type: typeFilter } : {}),
  });
}

/** @deprecated Use listCatalogObjects */
export function listObjects(systemName = "CLAIMS400"): CatalogObject[] {
  return listCatalogObjects(systemName);
}
