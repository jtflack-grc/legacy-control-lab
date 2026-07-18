import {
  grantObjectAuthority as grantInDb,
  listObjectAuthorities,
  revokeObjectAuthority as revokeInDb,
  updateObjectPublicAuthority,
} from "../db/repositories/objectAuthorityRepository.js";
import { getObject as getObjectRow } from "../db/repositories/objectRepository.js";
import { listObjects as listObjectRows } from "../db/repositories/objectRepository.js";
import type { CatalogObject } from "./objectCatalogService.js";

export type ObjectAuthorityEntry = {
  userName: string;
  authority: string;
  note?: string;
};

export type ObjectAuthorityDisplay = {
  library: string;
  object: string;
  type: string;
  publicAuthority: string;
  owner: string;
  privateAuthorities: ObjectAuthorityEntry[];
};

export type AuthorityFinding = {
  library: string;
  object: string;
  type: string;
  publicAuthority: string;
  owner: string | null;
  issue: string;
};

export function getObjectAuthorityDisplay(
  systemName: string,
  library: string,
  object: string,
  targetUser?: string,
): ObjectAuthorityDisplay | undefined {
  const row = getObjectRow(systemName, library, object);
  if (!row) return undefined;

  const owner = row.owner ?? "QSECOFR";
  const privateAuthorities: ObjectAuthorityEntry[] = [{ userName: owner, authority: "*ALL", note: "Owner" }];

  for (const grant of listObjectAuthorities(systemName, row.library, row.object)) {
    if (grant.userName === owner) continue;
    privateAuthorities.push({ userName: grant.userName, authority: grant.authority });
  }

  if (targetUser && !privateAuthorities.some((entry) => entry.userName === targetUser)) {
    privateAuthorities.push({
      userName: targetUser,
      authority: deriveUserAuthority(row, targetUser),
    });
  }

  return {
    library: row.library,
    object: row.object,
    type: row.type,
    publicAuthority: row.publicAuth,
    owner,
    privateAuthorities,
  };
}

export function grantObjectAuthority(
  systemName: string,
  library: string,
  object: string,
  userName: string,
  authority: string,
): { ok: true } | { ok: false; message: string } {
  if (!getObjectRow(systemName, library, object)) {
    return { ok: false, message: `CPF2204 - Object ${library}/${object} not found.` };
  }
  if (userName.trim().toUpperCase() === "*PUBLIC") {
    updateObjectPublicAuthority(systemName, library, object, authority);
    return { ok: true };
  }
  grantInDb(systemName, library, object, userName, authority);
  return { ok: true };
}

export function revokeObjectAuthority(
  systemName: string,
  library: string,
  object: string,
  userName: string,
): { ok: true } | { ok: false; message: string } {
  if (!getObjectRow(systemName, library, object)) {
    return { ok: false, message: `CPF2204 - Object ${library}/${object} not found.` };
  }
  if (userName.trim().toUpperCase() === "*PUBLIC") {
    updateObjectPublicAuthority(systemName, library, object, "*EXCLUDE");
    return { ok: true };
  }
  if (!revokeInDb(systemName, library, object, userName)) {
    return { ok: false, message: `CPF2204 - Private authority for ${userName} not found.` };
  }
  return { ok: true };
}

export function listAuthorityFindings(systemName: string): AuthorityFinding[] {
  return listObjectRows(systemName)
    .filter(
      (obj) =>
        obj.publicAuth === "*EXCLUDE" ||
        obj.publicAuth === "*ALL" ||
        (obj.library === "PAYROLL" && obj.object === "PAYMST" && obj.publicAuth === "*CHANGE"),
    )
    .map((obj) => ({
      library: obj.library,
      object: obj.object,
      type: obj.type,
      publicAuthority: obj.publicAuth,
      owner: obj.owner,
      issue:
        obj.library === "PAYROLL" && obj.object === "PAYMST"
          ? "Payroll master has excessive public authority"
          : obj.publicAuth === "*EXCLUDE"
            ? "Public authority is *EXCLUDE"
            : "Public authority is *ALL",
    }));
}

function deriveUserAuthority(object: CatalogObject, userName: string): string {
  if (object.owner?.toUpperCase() === userName.toUpperCase()) {
    return "*ALL";
  }
  if (object.publicAuth === "*EXCLUDE") {
    return "*EXCLUDE";
  }
  return object.publicAuth;
}

export function checkObjectAuthority(): boolean {
  return true;
}
