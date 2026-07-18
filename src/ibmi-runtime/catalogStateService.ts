import type { CommandDefinition } from "./commandCatalog.js";
import type { ParsedCommand } from "./commandParser.js";
import { getParameter, getQualifiedObject } from "./commandParser.js";
import { catalogVerbFamily } from "../screen-runtime/screens/catalogCommandScreens.js";
import {
  deleteCatalogLabEntity,
  getCatalogLabEntity,
  upsertCatalogLabEntity,
} from "../db/repositories/catalogLabRepository.js";
import {
  deleteObject,
  getObject,
  insertObject,
  updateObject,
} from "../db/repositories/objectRepository.js";
import { libraryExists, insertLibrary } from "../db/repositories/libraryRepository.js";
import { updateLinkServerStatus } from "./networkService.js";

export type CatalogStateMutationResult =
  | { ok: true; before: Record<string, unknown>; after: Record<string, unknown> }
  | { ok: false; message: string };

function entityTypeForCategory(category: string): string {
  switch (category) {
    case "journal_audit":
      return "journal";
    case "message_queue":
      return "message_queue";
    case "network_tcpip":
      return "tcp_server";
    case "database_file":
      return "database_file";
    case "job_batch":
      return "job_entity";
    case "ifs":
      return "ifs_path";
    case "ptf_license":
      return "ptf";
    case "spool_print":
      return "spool_entity";
    case "library_object":
      return "library_object";
    case "authority":
      return "authority";
    case "user_profile":
      return "user_profile";
    case "system_value":
      return "system_value";
    default:
      return category || "catalog_entity";
  }
}

function primaryEntityId(parsed: ParsedCommand, definition: CommandDefinition): string {
  const qualified = getQualifiedObject(parsed, "OBJ");
  if (qualified.library && qualified.object) return `${qualified.library}/${qualified.object}`;
  const file = getQualifiedObject(parsed, "FILE");
  if (file.library && file.object) return `${file.library}/${file.object}`;
  return (
    getParameter(parsed, "OBJ") ??
    getParameter(parsed, "FILE") ??
    getParameter(parsed, "LIB") ??
    getParameter(parsed, "USRPRF") ??
    getParameter(parsed, "SYSVAL") ??
    getParameter(parsed, "MSGQ") ??
    getParameter(parsed, "JOBD") ??
    getParameter(parsed, "JOBQ") ??
    getParameter(parsed, "OUTQ") ??
    getParameter(parsed, "JRN") ??
    getParameter(parsed, "SBS") ??
    getParameter(parsed, "SERVER") ??
    getParameter(parsed, "JOB") ??
    definition.name
  ).trim().toUpperCase();
}

function readLabState(
  systemName: string,
  entityType: string,
  entityId: string,
): Record<string, unknown> {
  return getCatalogLabEntity(systemName, entityType, entityId)?.state ?? { status: "*ACTIVE" };
}

function applyParamPatch(
  state: Record<string, unknown>,
  parsed: ParsedCommand,
): Record<string, unknown> {
  const next = { ...state };
  for (const [key, value] of Object.entries(parsed.parameters)) {
    if (value?.trim()) next[key.toLowerCase()] = value.trim().toUpperCase();
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

function mutateLibraryObject(
  systemName: string,
  definition: CommandDefinition,
  parsed: ParsedCommand,
  family: string,
): CatalogStateMutationResult {
  const lib = getParameter(parsed, "LIB");
  const qualified = getQualifiedObject(parsed, "OBJ");
  const file = getQualifiedObject(parsed, "FILE");

  if (family === "create" && lib && !qualified.object && !file.object) {
    if (libraryExists(systemName, lib)) {
      return { ok: false, message: `CPF2111 - Library ${lib.toUpperCase()} already exists.` };
    }
    const before = { exists: false };
    insertLibrary(systemName, lib, getParameter(parsed, "TEXT") ?? "Lab library");
    return { ok: true, before, after: { exists: true, library: lib.toUpperCase() } };
  }

  const objectLib = qualified.library ?? file.library ?? lib;
  const objectName = qualified.object ?? file.object;
  if (objectLib && objectName) {
    const existing = getObject(systemName, objectLib, objectName);
    if (family === "delete") {
      if (!existing) return { ok: false, message: `CPF2105 - Object ${objectLib}/${objectName} not found.` };
      deleteObject(systemName, objectLib, objectName);
      return {
        ok: true,
        before: { ...existing },
        after: { deleted: true, library: objectLib, object: objectName },
      };
    }
    if (family === "create") {
      if (existing) return { ok: false, message: `CPF2105 - Object ${objectLib}/${objectName} already exists.` };
      const objectType = getParameter(parsed, "OBJTYPE") ?? getParameter(parsed, "TYPE") ?? "*FILE";
      insertObject(systemName, objectLib, objectName, objectType, {
        owner: getParameter(parsed, "OWN") ?? undefined,
        text: getParameter(parsed, "TEXT") ?? undefined,
        publicAuth: getParameter(parsed, "AUT") ?? undefined,
      });
      const after = getObject(systemName, objectLib, objectName);
      return { ok: true, before: { exists: false }, after: after ?? { exists: true } };
    }
    if (!existing) return { ok: false, message: `CPF2105 - Object ${objectLib}/${objectName} not found.` };
    const before = { ...existing };
    updateObject(systemName, objectLib, objectName, {
      ...(getParameter(parsed, "AUT") ? { publicAuth: getParameter(parsed, "AUT") } : {}),
      ...(getParameter(parsed, "OWN") ? { owner: getParameter(parsed, "OWN") } : {}),
      ...(getParameter(parsed, "TEXT") ? { text: getParameter(parsed, "TEXT") } : {}),
      ...(getParameter(parsed, "OBJTYPE") ? { type: getParameter(parsed, "OBJTYPE") } : {}),
    });
    const after = getObject(systemName, objectLib, objectName) ?? before;
    return { ok: true, before, after };
  }

  return mutateLabEntity(systemName, definition, parsed, family);
}

function mutateNetwork(
  systemName: string,
  definition: CommandDefinition,
  parsed: ParsedCommand,
  family: string,
): CatalogStateMutationResult {
  const server = getParameter(parsed, "SERVER") ?? primaryEntityId(parsed, definition);
  const before = readLabState(systemName, "tcp_server", server);
  if (family === "control" || family === "action") {
    const status = definition.name.startsWith("END") || definition.name.startsWith("STP") ? "*STOPPED" : "*RUNNING";
    updateLinkServerStatus(server, status);
    const after = { ...before, status, server: server.toUpperCase() };
    upsertCatalogLabEntity(systemName, "tcp_server", server, after);
    return { ok: true, before, after };
  }
  const after = applyParamPatch(before, parsed);
  upsertCatalogLabEntity(systemName, "tcp_server", server, after);
  return { ok: true, before, after };
}

function mutateLabEntity(
  systemName: string,
  definition: CommandDefinition,
  parsed: ParsedCommand,
  family: string,
): CatalogStateMutationResult {
  const entityType = entityTypeForCategory(definition.category);
  const entityId = primaryEntityId(parsed, definition);
  const before = readLabState(systemName, entityType, entityId);

  if (family === "delete") {
    const removed = deleteCatalogLabEntity(systemName, entityType, entityId);
    if (!removed && Object.keys(before).length <= 1 && before.status === "*ACTIVE") {
      return { ok: false, message: `CPF2105 - ${entityId} not found.` };
    }
    return { ok: true, before, after: { deleted: true, entityId } };
  }

  if (family === "create") {
    const after = {
      ...applyParamPatch({ status: "*ACTIVE", command: definition.name }, parsed),
      entityId,
      createdAt: new Date().toISOString(),
    };
    upsertCatalogLabEntity(systemName, entityType, entityId, after);
    return { ok: true, before: { exists: false }, after };
  }

  const after = applyParamPatch(
    {
      ...before,
      status:
        family === "control"
          ? definition.name.startsWith("END") || definition.name.startsWith("STP")
            ? "*ENDED"
            : "*ACTIVE"
          : (before.status as string | undefined) ?? "*ACTIVE",
    },
    parsed,
  );
  upsertCatalogLabEntity(systemName, entityType, entityId, after);
  return { ok: true, before, after };
}

/** Apply a SQLite-backed state change for catalog-engine mutations. */
export function applyCatalogLabMutation(
  systemName: string,
  definition: CommandDefinition,
  parsed: ParsedCommand,
): CatalogStateMutationResult {
  const family = catalogVerbFamily(definition.name);

  if (definition.category === "library_object") {
    return mutateLibraryObject(systemName, definition, parsed, family);
  }
  if (definition.category === "network_tcpip") {
    return mutateNetwork(systemName, definition, parsed, family);
  }
  if (definition.category === "ifs") {
    const path = getParameter(parsed, "OBJ") ?? getParameter(parsed, "PATH") ?? primaryEntityId(parsed, definition);
    const entityType = "ifs_path";
    const entityId = path.trim().toUpperCase();
    const before = readLabState(systemName, entityType, entityId);
    if (family === "delete") {
      deleteCatalogLabEntity(systemName, entityType, entityId);
      return { ok: true, before, after: { deleted: true, path: entityId } };
    }
    const after = applyParamPatch(
      { ...before, path: entityId, permissions: getParameter(parsed, "DTAAUT") ?? before.permissions },
      parsed,
    );
    upsertCatalogLabEntity(systemName, entityType, entityId, after);
    return { ok: true, before, after };
  }

  return mutateLabEntity(systemName, definition, parsed, family);
}
