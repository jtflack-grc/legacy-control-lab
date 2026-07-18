import type { Database as SqliteDatabase } from "better-sqlite3";

/** Ensure IONGRC exists on upgraded databases (added after initial CLAIMS400 seed). */
export function ensureIongrcTrainingProfile(database: SqliteDatabase): void {
  const system = database
    .prepare("SELECT id FROM systems WHERE name = ?")
    .get("CLAIMS400") as { id: string } | undefined;
  if (!system) return;

  const existing = database
    .prepare(
      `SELECT user_name AS userName, password, initial_menu AS initialMenu
       FROM user_profiles WHERE system_id = ? AND user_name = 'IONGRC'`,
    )
    .get(system.id) as { userName: string; password: string | null; initialMenu: string | null } | undefined;

  if (!existing) {
    database
      .prepare(
        `INSERT INTO user_profiles (
          id, system_id, user_name, status, user_class, text_description,
          group_profile, special_authorities, initial_menu, password, last_signon, business_owner
        ) VALUES (?, ?, 'IONGRC', '*ENABLED', '*USER', ?, 'AUDITGRP', '*AUDIT', 'IBMMAIN', 'IONGRC', NULL, '*NONE')`,
      )
      .run(`usr-${system.id}-iongrc`, system.id, "i on GRC article practice — author packs, no mission scoring");
    console.log("[db] migrated user_profiles.IONGRC (inserted)");
    return;
  }

  const needsPassword = !existing.password || existing.password.toUpperCase() === "TRAIN";
  const menu = (existing.initialMenu ?? "").toUpperCase();
  const needsMenu = menu !== "IBMMAIN";
  if (needsPassword) {
    database
      .prepare(`UPDATE user_profiles SET password = 'IONGRC' WHERE system_id = ? AND user_name = 'IONGRC'`)
      .run(system.id);
  }
  if (needsMenu) {
    database
      .prepare(`UPDATE user_profiles SET initial_menu = 'IBMMAIN' WHERE system_id = ? AND user_name = 'IONGRC'`)
      .run(system.id);
  }
  if (needsPassword || needsMenu) {
    console.log("[db] migrated user_profiles.IONGRC (updated password/menu)");
  }
}
