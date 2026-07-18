import {
  createUserProfile as createUserProfileRow,
  deleteUserProfile as deleteUserProfileRow,
  getUserProfile as getUserProfileRow,
  listUserProfiles as listUserProfileRows,
  setActivityProfileExempt as setActivityProfileExemptRow,
  updateUserProfile as updateUserProfileRow,
} from "../db/repositories/userProfileRepository.js";

export type UserProfileSummary = {
  userName: string;
  status: string;
  userClass: string;
  text: string;
  groupProfile: string;
  specialAuthorities: string;
  initialMenu: string;
  lastSignon: string;
  initialProgram?: string;
  currentLibrary?: string;
  limitCapabilities?: string;
  activityProfileExempt?: boolean;
  businessOwner?: string | null;
};

export function listUserProfiles(systemName = "CLAIMS400"): UserProfileSummary[] {
  return listUserProfileRows(systemName).map(toSummary);
}

export function getUserProfile(
  userName: string,
  systemName = "CLAIMS400",
): UserProfileSummary | undefined {
  const profile = getUserProfileRow(systemName, userName);
  return profile ? toSummary(profile) : undefined;
}

export function createUserProfile(
  systemName: string,
  userName: string,
  password?: string,
): { ok: true } | { ok: false; message: string } {
  return createUserProfileRow(systemName, { userName, password });
}

export function changeUserProfile(
  systemName: string,
  userName: string,
  updates: {
    status?: string;
    password?: string;
    specialAuthorities?: string;
    initialMenu?: string;
    text?: string;
  },
): { ok: true } | { ok: false; message: string } {
  return updateUserProfileRow(systemName, userName, updates);
}

export function deleteUserProfile(
  systemName: string,
  userName: string,
): { ok: true } | { ok: false; message: string } {
  return deleteUserProfileRow(systemName, userName);
}

export function setActivityProfileExempt(
  systemName: string,
  userName: string,
  exempt: boolean,
): { ok: true } | { ok: false; message: string } {
  return setActivityProfileExemptRow(systemName, userName, exempt);
}

function toSummary(profile: {
  userName: string;
  status: string;
  userClass: string;
  text: string;
  groupProfile: string | null;
  specialAuthorities: string | null;
  initialMenu: string | null;
  lastSignon: string | null;
  limitCapabilities?: string | null;
  activityProfileExempt?: boolean;
  businessOwner?: string | null;
}): UserProfileSummary {
  return {
    userName: profile.userName,
    status: profile.status,
    userClass: profile.userClass,
    text: profile.text,
    groupProfile: profile.groupProfile ?? "*NONE",
    specialAuthorities: profile.specialAuthorities ?? "*NONE",
    initialMenu: profile.initialMenu ?? "AUDIT",
    lastSignon: profile.lastSignon ?? "*NONE",
    limitCapabilities: profile.limitCapabilities ?? "*NO",
    activityProfileExempt: Boolean(profile.activityProfileExempt),
    businessOwner: profile.businessOwner ?? "*NONE",
  };
}
