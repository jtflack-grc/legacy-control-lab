import type { ScreenDefinition } from "../screen.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import { getUserProfile } from "../../ibmi-runtime/userProfileService.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

/** Sign-on Information display (QDSPSGNINF) — shown via lab DSPPRVSSN command. */
export function createDisplayPrivilegedSessionScreen(session: IbmiSession): ScreenDefinition {
  const systemName = session.systemName;
  const userName = session.userName ?? "";
  const profile = getUserProfile(userName, systemName);
  const previousSignon = profile?.lastSignon
    ? `${profile.lastSignon} 00:00:00`
    : new Date().toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

  const fields = [
    ibmScreenHeader("DSPPRVSSN", "Sign-on Information", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "PREV", "Previous sign-on", previousSignon),
    ...ibmDetailFields(5, "PWDINV", "Password verifications not valid", "0"),
    ...ibmDetailFields(6, "PWDEXP", "Days until password expires", "*NONE"),
    outputField("PRESS", 18, 6, "Press Enter to continue."),
    outputField("FKEYS", 24, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPPRVSSN",
    title: "Sign-on Information",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
