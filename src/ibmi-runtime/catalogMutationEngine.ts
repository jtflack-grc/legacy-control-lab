import type { CommandDefinition } from "./commandCatalog.js";
import type { IbmiSession } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { getParameter, getQualifiedObject } from "./commandParser.js";
import type { MenuRouteResult } from "./commandHandlers.js";
import { applyMutation } from "../runtime/runtimeMutationService.js";
import type { RuntimeEntityType } from "../runtime/types.js";
import { catalogVerbFamily } from "../screen-runtime/screens/catalogCommandScreens.js";

export function isCatalogMutatingCommand(commandName: string): boolean {
  const family = catalogVerbFamily(commandName);
  return family === "change" || family === "create" || family === "delete" || family === "action" || family === "control" || family === "backup";
}
import { changeCurrentLibrary, createLibrary as createLibraryEntry } from "./libraryAdminService.js";
import { addLibraryEntry, removeLibraryEntry } from "./libraryListService.js";
import {
  endJob,
  holdJob,
  releaseJob,
  submitBatchJob,
} from "./jobService.js";
import { sendMessage } from "./messageService.js";
import { updateSpooledFileStatus, deleteSpooledFile } from "../db/repositories/spoolRepository.js";
import { listSpooledFiles } from "./spoolService.js";
import { changeSystemValue } from "./systemValueService.js";
import { changeUserProfile } from "./userProfileService.js";
import { grantObjectAuthority, revokeObjectAuthority } from "./authorityService.js";
import { saveLibrary, restoreLibrary } from "./backupService.js";
import { updateSubsystemStatus } from "./subsystemService.js";
import { resolveEvidenceTags } from "../missions/evidenceTags.js";
import { applyCatalogLabMutation } from "./catalogStateService.js";

function primaryEntityId(parsed: ParsedCommand): string {
  return (
    getParameter(parsed, "OBJ") ??
    getParameter(parsed, "FILE") ??
    getParameter(parsed, "LIB") ??
    getParameter(parsed, "CURLIB") ??
    getParameter(parsed, "USRPRF") ??
    getParameter(parsed, "SYSVAL") ??
    getParameter(parsed, "MSGQ") ??
    getParameter(parsed, "JOBD") ??
    getParameter(parsed, "JOB") ??
    getParameter(parsed, "SBS") ??
    parsed.name
  );
}

function entityTypeForCategory(category: string): RuntimeEntityType {
  switch (category) {
    case "user_profile":
      return "user_profile";
    case "system_value":
      return "system_value";
    case "authority":
    case "library_object":
      return "object_authority";
    case "job_batch":
      return "job";
    case "message_queue":
      return "message_queue";
    case "spool_print":
      return "spooled_file";
    case "mission_lab":
    case "range":
      return "mission";
    default:
      return "job";
  }
}

function auditTypeForCategory(category: string): string {
  switch (category) {
    case "user_profile":
      return "PW";
    case "authority":
    case "library_object":
      return "CA";
    case "system_value":
      return "SV";
    case "journal_audit":
      return "AF";
    default:
      return "OW";
  }
}

function evidenceFor(commandName: string, parsed: ParsedCommand, category: string): string[] {
  return resolveEvidenceTags(commandName, parsed, category);
}

function auditedCatalogMutation(
  session: IbmiSession,
  definition: CommandDefinition,
  parsed: ParsedCommand,
  message: string,
  explicitState?: { before: Record<string, unknown>; after: Record<string, unknown> },
): MenuRouteResult {
  const entityId = primaryEntityId(parsed);
  let before: Record<string, unknown>;
  let after: Record<string, unknown>;
  if (explicitState) {
    before = explicitState.before;
    after = explicitState.after;
  } else {
    const stateChange = applyCatalogLabMutation(session.systemName, definition, parsed);
    if (!stateChange.ok) return { kind: "message", message: stateChange.message };
    before = stateChange.before;
    after = stateChange.after;
  }
  const result = applyMutation(
    session,
    {
      commandText: parsed.raw,
      mutationType: definition.name,
      entityType: entityTypeForCategory(definition.category),
      entityId,
      before,
      after,
      evidenceTags: evidenceFor(definition.name, parsed, definition.category),
      auditEntryType: auditTypeForCategory(definition.category),
      auditObjectRef: entityId,
      auditMessage: `${definition.name} completed on ${entityId}.`,
      jobLogMessages: [`CPI1124 - ${definition.name} completed successfully.`],
      coachEventKey: coachKeyForCategory(definition.category),
    },
    () => ({ ok: true }),
  );
  if (!result.ok) return { kind: "message", message: result.message };
  return { kind: "message", message };
}

function coachKeyForCategory(category: string): string | undefined {
  switch (category) {
    case "user_profile":
      return "user_profile_changed";
    case "system_value":
      return "system_value_changed";
    case "authority":
      return "object_authority_changed";
    case "library_object":
      return "library_list_changed";
    case "spool_print":
      return "spool_changed";
    default:
      return undefined;
  }
}

function hasExecutableParameters(parsed: ParsedCommand, definition: CommandDefinition): boolean {
  const required = definition.parameters.filter((param) => param.required);
  if (required.length > 0 && required.every((param) => Boolean(getParameter(parsed, param.name)?.trim()))) {
    return true;
  }
  return Object.keys(parsed.parameters).length > 0;
}

export function tryExecuteCatalogMutation(
  session: IbmiSession,
  definition: CommandDefinition,
  parsed: ParsedCommand,
): MenuRouteResult | null {
  if (!isCatalogMutatingCommand(definition.name)) return null;
  if (!hasExecutableParameters(parsed, definition)) return null;

  const name = definition.name.toUpperCase();
  const family = catalogVerbFamily(name);

  if (name === "CHGCURLIB" || (family === "change" && (getParameter(parsed, "CURLIB") || getParameter(parsed, "LIB")))) {
    const lib = getParameter(parsed, "CURLIB") ?? getParameter(parsed, "LIB");
    if (!lib) return null;
    const result = changeCurrentLibrary(session, lib);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC2112 - Current library changed to ${lib.toUpperCase()}.`, {
      before: { currentLibrary: session.libraryList.current },
      after: { currentLibrary: lib.toUpperCase() },
    });
  }

  if (name === "CRTLIB" || (family === "create" && getParameter(parsed, "LIB") && definition.category === "library_object")) {
    const lib = getParameter(parsed, "LIB")!;
    const result = createLibraryEntry(session.systemName, lib, getParameter(parsed, "TEXT") ?? "Lab library");
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC7301 - Library ${lib.toUpperCase()} created.`, {
      before: { exists: false },
      after: { exists: true, library: lib.toUpperCase() },
    });
  }

  if (name === "ADDLIBLE" || (family === "action" && name.startsWith("ADD") && getParameter(parsed, "LIB"))) {
    const lib = getParameter(parsed, "LIB")!;
    const result = addLibraryEntry(session, lib);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC2102 - Library ${lib.toUpperCase()} added to library list.`, {
      before: { inList: false },
      after: { inList: true, library: lib.toUpperCase() },
    });
  }

  if (name === "RMVLIBLE" || (family === "action" && name.startsWith("RMV") && getParameter(parsed, "LIB"))) {
    const lib = getParameter(parsed, "LIB")!;
    const result = removeLibraryEntry(session, lib);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC2104 - Library ${lib.toUpperCase()} removed from library list.`, {
      before: { inList: true },
      after: { inList: false, library: lib.toUpperCase() },
    });
  }

  if (name === "SBMJOB" || (name.startsWith("SBM") && getParameter(parsed, "CMD"))) {
    const result = submitBatchJob(session, {
      cmd: getParameter(parsed, "CMD")!,
      jobName: getParameter(parsed, "JOB"),
      jobd: getParameter(parsed, "JOBD"),
      jobq: getParameter(parsed, "JOBQ"),
    });
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, result.message, {
      before: { submitted: false },
      after: { submitted: true, cmd: getParameter(parsed, "CMD") },
    });
  }

  if ((name.startsWith("SND") && getParameter(parsed, "MSG")) || name === "SNDMSG" || name === "SNDPGMMSG") {
    const text = getParameter(parsed, "MSG")!;
    const queue = getParameter(parsed, "TOMSGQ") ?? "QSYSOPR";
    sendMessage(session, queue, text);
    return auditedCatalogMutation(session, definition, parsed, `CPC1221 - Message sent to ${queue}.`, {
      before: { queue },
      after: { queue, message: text },
    });
  }

  if (getParameter(parsed, "JOB") && (name.startsWith("HLD") || name === "HLDJOB")) {
    const jobNumber = getParameter(parsed, "JOB")!.split("/")[0] ?? getParameter(parsed, "JOB")!;
    const result = holdJob(session.systemName, jobNumber);
    return { kind: "message", message: result.message };
  }

  if (getParameter(parsed, "JOB") && (name.startsWith("RLS") || name === "RLSJOB")) {
    const jobNumber = getParameter(parsed, "JOB")!.split("/")[0] ?? getParameter(parsed, "JOB")!;
    const result = releaseJob(session.systemName, jobNumber);
    return { kind: "message", message: result.message };
  }

  if (getParameter(parsed, "JOB") && (name.startsWith("END") || name === "ENDJOB")) {
    const jobNumber = getParameter(parsed, "JOB")!.split("/")[0] ?? getParameter(parsed, "JOB")!;
    const result = endJob(session.systemName, jobNumber);
    return { kind: "message", message: result.message };
  }

  if (getParameter(parsed, "SBS") && name.startsWith("STR")) {
    const sbs = getParameter(parsed, "SBS")!;
    if (!updateSubsystemStatus(session.systemName, sbs, "*ACTIVE")) {
      return { kind: "message", message: `CPF2105 - Subsystem ${sbs} not found.` };
    }
    return auditedCatalogMutation(session, definition, parsed, `CPI1124 - Subsystem ${sbs} started.`, {
      before: { status: "*ENDED" },
      after: { status: "*ACTIVE", subsystem: sbs.toUpperCase() },
    });
  }

  if (getParameter(parsed, "SBS") && name.startsWith("END")) {
    const sbs = getParameter(parsed, "SBS")!;
    if (!updateSubsystemStatus(session.systemName, sbs, "*ENDED")) {
      return { kind: "message", message: `CPF2105 - Subsystem ${sbs} not found.` };
    }
    return auditedCatalogMutation(session, definition, parsed, `CPI1127 - Subsystem ${sbs} ended.`, {
      before: { status: "*ACTIVE" },
      after: { status: "*ENDED", subsystem: sbs.toUpperCase() },
    });
  }

  if (getParameter(parsed, "FILE") && definition.category === "spool_print") {
    const fileName = getParameter(parsed, "FILE")!;
    const spool = listSpooledFiles(session.systemName).find((f) => f.fileName === fileName.toUpperCase());
    const userName = getParameter(parsed, "JOB")?.split("/")[1] ?? spool?.userName ?? session.userName ?? "QSECOFR";
    if (family === "delete" || name.startsWith("DLT")) {
      const result = deleteSpooledFile(session.systemName, fileName, userName);
      if (!result.ok) return { kind: "message", message: result.message };
      return auditedCatalogMutation(session, definition, parsed, `CPC2112 - File ${fileName} deleted.`, {
        before: { fileName, userName },
        after: { deleted: true, fileName },
      });
    }
    const status = getParameter(parsed, "SPLFSTAT") ?? (name.startsWith("HLD") ? "HELD" : "READY");
    const result = updateSpooledFileStatus(session.systemName, fileName, userName, status);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC1221 - Spooled file ${fileName} updated.`, {
      before: { fileName, status: spool?.status },
      after: { fileName, status },
    });
  }

  if (getParameter(parsed, "SYSVAL") && getParameter(parsed, "VALUE")) {
    const sysval = getParameter(parsed, "SYSVAL")!;
    const value = getParameter(parsed, "VALUE")!;
    const result = changeSystemValue(sysval, value, session.systemName);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC2204 - System value ${sysval} changed.`, {
      before: { sysval },
      after: { sysval, value },
    });
  }

  if (getParameter(parsed, "USRPRF") && (family === "change" || name === "CHGUSRPRF")) {
    const profile = getParameter(parsed, "USRPRF")!;
    const result = changeUserProfile(session.systemName, profile, {
      ...(getParameter(parsed, "STATUS") ? { status: getParameter(parsed, "STATUS") } : {}),
      ...(getParameter(parsed, "PASSWORD") ? { password: getParameter(parsed, "PASSWORD") } : {}),
      ...(getParameter(parsed, "SPCAUT") ? { specialAuthorities: getParameter(parsed, "SPCAUT") } : {}),
      ...(getParameter(parsed, "INLMNU") ? { initialMenu: getParameter(parsed, "INLMNU") } : {}),
      ...(getParameter(parsed, "TEXT") ? { text: getParameter(parsed, "TEXT") } : {}),
    });
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC2204 - User profile ${profile} changed.`, {
      before: { profile },
      after: { profile, ...parsed.parameters },
    });
  }

  const qualified = getQualifiedObject(parsed, "OBJ");
  if (qualified.library && qualified.object && name.startsWith("GRT")) {
    const user = getParameter(parsed, "USER") ?? "PUBLIC";
    const aut = getParameter(parsed, "AUT") ?? "*USE";
    const result = grantObjectAuthority(session.systemName, qualified.library, qualified.object, user, aut);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC1221 - Authority granted on ${qualified.library}/${qualified.object}.`, {
      before: { object: `${qualified.library}/${qualified.object}`, user },
      after: { object: `${qualified.library}/${qualified.object}`, user, authority: aut },
    });
  }

  if (qualified.library && qualified.object && name.startsWith("RVK")) {
    const user = getParameter(parsed, "USER") ?? "PUBLIC";
    const result = revokeObjectAuthority(session.systemName, qualified.library, qualified.object, user);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC1221 - Authority revoked on ${qualified.library}/${qualified.object}.`, {
      before: { object: `${qualified.library}/${qualified.object}`, user },
      after: { object: `${qualified.library}/${qualified.object}`, user, authority: "*REVOKED" },
    });
  }

  if (name === "SAVLIB" || (family === "backup" && name.startsWith("SAV") && getParameter(parsed, "LIB"))) {
    const lib = getParameter(parsed, "LIB")!;
    saveLibrary(session.systemName, lib);
    return auditedCatalogMutation(session, definition, parsed, `CPC3702 - Library ${lib} saved.`, {
      before: { saved: false },
      after: { saved: true, library: lib.toUpperCase() },
    });
  }

  if (name === "RSTLIB" || (family === "backup" && name.startsWith("RST") && getParameter(parsed, "LIB"))) {
    const lib = getParameter(parsed, "LIB")!;
    const result = restoreLibrary(session.systemName, lib);
    if (!result.ok) return { kind: "message", message: result.message };
    return auditedCatalogMutation(session, definition, parsed, `CPC3702 - Library ${lib} restored.`, {
      before: { restored: false },
      after: { restored: true, library: lib.toUpperCase() },
    });
  }

  const completion =
    family === "delete"
      ? `CPC2112 - ${name} completed.`
      : family === "create"
        ? `CPC7301 - ${name} completed.`
        : family === "control"
          ? name.startsWith("END")
            ? `CPI1127 - ${name} completed.`
            : `CPI1124 - ${name} started.`
          : family === "backup"
            ? `CPC3702 - ${name} completed successfully.`
            : `CPC1221 - ${name} completed successfully.`;

  return auditedCatalogMutation(session, definition, parsed, completion);
}
