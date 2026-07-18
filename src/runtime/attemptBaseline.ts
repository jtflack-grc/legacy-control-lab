import { listUserProfiles } from "../db/repositories/userProfileRepository.js";
import { listSystemValues } from "../db/repositories/systemValueRepository.js";
import { listObjects } from "../db/repositories/objectRepository.js";
import { listObjectAuthorities } from "../db/repositories/objectAuthorityRepository.js";
import { listSpooledFiles } from "../db/repositories/spoolRepository.js";
import { getIfsLinkCatalog, reloadIfsLinkCatalog } from "../ibmi-runtime/ifsLinkService.js";
import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import {
  getAttemptBaseline,
  saveAttemptBaseline,
  clearAttemptRuntime,
} from "../db/repositories/runtimeRepository.js";
import { getDatabase } from "../db/sqlite.js";
import { getSystemIdByName } from "../db/repositories/systemRepository.js";
import type { AttemptBaselineSnapshot } from "./types.js";

export function captureAttemptBaseline(
  attemptId: string,
  systemName: string,
  session?: IbmiSession,
): AttemptBaselineSnapshot {
  const snapshot: AttemptBaselineSnapshot = {
    userProfiles: listUserProfiles(systemName).map((profile) => ({
      userName: profile.userName,
      status: profile.status,
      userClass: profile.userClass,
      text: profile.text ?? "",
      groupProfile: profile.groupProfile,
      specialAuthorities: profile.specialAuthorities,
      initialMenu: profile.initialMenu,
    })),
    systemValues: listSystemValues(systemName).map((row) => ({
      name: row.name,
      value: row.value,
    })),
    objectPublicAuthorities: listObjects(systemName).map((obj) => ({
      library: obj.library,
      object: obj.object,
      publicAuth: obj.publicAuth,
    })),
    objectAuthorities: listObjects(systemName).flatMap((obj) =>
      listObjectAuthorities(systemName, obj.library, obj.object).map((grant) => ({
        library: obj.library,
        object: obj.object,
        userName: grant.userName,
        authority: grant.authority,
      })),
    ),
    spooledFiles: listSpooledFiles(systemName),
    ifsLinks: getIfsLinkCatalog(systemName).map((link) => ({ ...link })),
    libraryList: session
      ? {
          system: [...session.libraryList.system],
          product: [...session.libraryList.product],
          current: session.libraryList.current,
          user: [...session.libraryList.user],
        }
      : undefined,
  };

  saveAttemptBaseline(attemptId, JSON.stringify(snapshot));
  return snapshot;
}

export function ensureAttemptBaseline(
  attemptId: string,
  systemName: string,
  session?: IbmiSession,
): AttemptBaselineSnapshot {
  const existing = getAttemptBaseline(attemptId);
  if (existing) {
    return JSON.parse(existing) as AttemptBaselineSnapshot;
  }
  return captureAttemptBaseline(attemptId, systemName, session);
}

export function restoreAttemptBaseline(
  attemptId: string,
  systemName: string,
  session?: IbmiSession,
): { ok: true } | { ok: false; message: string } {
  const raw = getAttemptBaseline(attemptId);
  if (!raw) {
    return { ok: false, message: "CPF0006 - No baseline snapshot for this attempt." };
  }

  const snapshot = JSON.parse(raw) as AttemptBaselineSnapshot;
  const systemId = getSystemIdByName(systemName);
  const db = getDatabase();

  const restoreUsers = db.prepare(
    `UPDATE user_profiles
     SET status = ?, user_class = ?, text_description = ?, group_profile = ?,
         special_authorities = ?, initial_menu = ?
     WHERE system_id = ? AND user_name = ?`,
  );
  for (const profile of snapshot.userProfiles) {
    restoreUsers.run(
      profile.status,
      profile.userClass,
      profile.text,
      profile.groupProfile,
      profile.specialAuthorities,
      profile.initialMenu,
      systemId,
      profile.userName,
    );
  }

  const restoreSysval = db.prepare(
    `UPDATE system_values SET value = ? WHERE system_id = ? AND name = ?`,
  );
  for (const sysval of snapshot.systemValues) {
    restoreSysval.run(sysval.value, systemId, sysval.name);
  }

  const restorePublic = db.prepare(
    `UPDATE objects SET public_authority = ? WHERE system_id = ? AND library = ? AND name = ?`,
  );
  for (const obj of snapshot.objectPublicAuthorities) {
    restorePublic.run(obj.publicAuth, systemId, obj.library, obj.object);
  }

  db.prepare("DELETE FROM object_authorities WHERE system_id = ?").run(systemId);
  const insertGrant = db.prepare(
    `INSERT INTO object_authorities (id, system_id, library, object_name, user_name, authority)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const grant of snapshot.objectAuthorities) {
    const id = `objaut-${grant.library.toLowerCase()}-${grant.object.toLowerCase()}-${grant.userName.toLowerCase()}`;
    insertGrant.run(id, systemId, grant.library, grant.object, grant.userName, grant.authority);
  }

  const restoreSpool = db.prepare(
    `UPDATE spooled_files SET status = ?
     WHERE system_id = ? AND file_name = ? AND user_name = ? AND spool_number = ?`,
  );
  for (const spool of snapshot.spooledFiles) {
    restoreSpool.run(spool.status, systemId, spool.fileName, spool.userName, spool.spoolNumber);
  }

  reloadIfsLinkCatalog(systemName, snapshot.ifsLinks);

  if (session && snapshot.libraryList) {
    session.libraryList = {
      system: [...snapshot.libraryList.system],
      product: [...snapshot.libraryList.product],
      current: snapshot.libraryList.current,
      user: [...snapshot.libraryList.user],
    };
  }

  clearAttemptRuntime(attemptId);
  return { ok: true };
}
