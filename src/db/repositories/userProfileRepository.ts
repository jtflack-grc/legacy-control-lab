import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type UserProfileRow = {
  userName: string;
  status: string;
  userClass: string;
  text: string;
  password: string | null;
  groupProfile: string | null;
  specialAuthorities: string | null;
  initialMenu: string | null;
  lastSignon: string | null;
  limitCapabilities?: string;
  activityProfileExempt?: boolean;
  businessOwner: string | null;
};

export function listUserProfiles(systemName: string): UserProfileRow[] {
  const systemId = getSystemIdByName(systemName);
  const rows = getDatabase()
    .prepare(
      `SELECT user_name AS userName, status, user_class AS userClass,
              text_description AS text, password,
              group_profile AS groupProfile, special_authorities AS specialAuthorities,
              initial_menu AS initialMenu, last_signon AS lastSignon,
              limit_capabilities AS limitCapabilities,
              activity_profile_exempt AS activityProfileExempt,
              business_owner AS businessOwner
       FROM user_profiles
       WHERE system_id = ?
       ORDER BY user_name`,
    )
    .all(systemId) as UserProfileRow[];

  return rows.map((row) => ({
    ...row,
    activityProfileExempt: Boolean(row.activityProfileExempt),
  }));
}

export function getUserProfile(
  systemName: string,
  userName: string,
): UserProfileRow | undefined {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(
      `SELECT user_name AS userName, status, user_class AS userClass,
              text_description AS text, password,
              group_profile AS groupProfile, special_authorities AS specialAuthorities,
              initial_menu AS initialMenu, last_signon AS lastSignon,
              limit_capabilities AS limitCapabilities,
              activity_profile_exempt AS activityProfileExempt,
              business_owner AS businessOwner
       FROM user_profiles
       WHERE system_id = ? AND user_name = ?`,
    )
    .get(systemId, userName.trim().toUpperCase()) as UserProfileRow | undefined;
  if (!row) return undefined;
  return { ...row, activityProfileExempt: Boolean(row.activityProfileExempt) };
}

export function setActivityProfileExempt(
  systemName: string,
  userName: string,
  exempt: boolean,
): { ok: true } | { ok: false; message: string } {
  const existing = getUserProfile(systemName, userName);
  if (!existing) {
    return { ok: false, message: `CPF2204 - User profile ${userName.trim().toUpperCase()} not found.` };
  }
  const systemId = getSystemIdByName(systemName);
  const normalized = userName.trim().toUpperCase();
  getDatabase()
    .prepare(
      `UPDATE user_profiles SET activity_profile_exempt = ? WHERE system_id = ? AND user_name = ?`,
    )
    .run(exempt ? 1 : 0, systemId, normalized);
  return { ok: true };
}

export function createUserProfile(
  systemName: string,
  profile: {
    userName: string;
    password?: string;
    status?: string;
    userClass?: string;
    text?: string;
    groupProfile?: string;
    specialAuthorities?: string;
    initialMenu?: string;
  },
): { ok: true } | { ok: false; message: string } {
  const systemId = getSystemIdByName(systemName);
  const userName = profile.userName.trim().toUpperCase();
  if (getUserProfile(systemName, userName)) {
    return { ok: false, message: `CPF2204 - User profile ${userName} already exists.` };
  }

  getDatabase()
    .prepare(
      `INSERT INTO user_profiles (
        id, system_id, user_name, status, user_class, text_description,
        group_profile, special_authorities, initial_menu, password
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `usr-${userName.toLowerCase()}`,
      systemId,
      userName,
      profile.status ?? "*ENABLED",
      profile.userClass ?? "*USER",
      profile.text ?? "",
      profile.groupProfile ?? "*NONE",
      profile.specialAuthorities ?? "*NONE",
      profile.initialMenu ?? "AUDIT",
      profile.password ?? null,
    );

  return { ok: true };
}

export function updateUserProfile(
  systemName: string,
  userName: string,
  updates: {
    status?: string;
    password?: string;
    userClass?: string;
    text?: string;
    specialAuthorities?: string;
    initialMenu?: string;
  },
): { ok: true } | { ok: false; message: string } {
  const existing = getUserProfile(systemName, userName);
  if (!existing) {
    return { ok: false, message: `CPF2204 - User profile ${userName.trim().toUpperCase()} not found.` };
  }

  const systemId = getSystemIdByName(systemName);
  const normalized = userName.trim().toUpperCase();
  getDatabase()
    .prepare(
      `UPDATE user_profiles
       SET status = COALESCE(?, status),
           password = COALESCE(?, password),
           user_class = COALESCE(?, user_class),
           text_description = COALESCE(?, text_description),
           special_authorities = COALESCE(?, special_authorities),
           initial_menu = COALESCE(?, initial_menu)
       WHERE system_id = ? AND user_name = ?`,
    )
    .run(
      updates.status ?? null,
      updates.password ?? null,
      updates.userClass ?? null,
      updates.text ?? null,
      updates.specialAuthorities ?? null,
      updates.initialMenu ?? null,
      systemId,
      normalized,
    );

  return { ok: true };
}

export function deleteUserProfile(
  systemName: string,
  userName: string,
): { ok: true } | { ok: false; message: string } {
  const normalized = userName.trim().toUpperCase();
  if (normalized === "QSECOFR") {
    return { ok: false, message: "CPF2209 - Profile QSECOFR cannot be deleted." };
  }
  const existing = getUserProfile(systemName, normalized);
  if (!existing) {
    return { ok: false, message: `CPF2204 - User profile ${normalized} not found.` };
  }

  const systemId = getSystemIdByName(systemName);
  getDatabase()
    .prepare("DELETE FROM user_profiles WHERE system_id = ? AND user_name = ?")
    .run(systemId, normalized);
  return { ok: true };
}
