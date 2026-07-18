import type { ScreenDefinition } from "../screen.js";
import { createGoMenuScreen } from "./screenHelpers.js";

export function createAuditMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
  message = "",
): ScreenDefinition {
  return createGoMenuScreen(
    "AUDIT",
    systemName,
    "AUDIT",
    [
      "1. Review system security values",
      "2. Work with user profiles",
      "3. Review object authorities",
      "4. Display audit journal entries",
      "5. Work with active jobs",
      "6. Work with spooled files",
      "7. Display job log",
      "8. Write audit finding",
      "9. Display mission briefing",
      "10. Display evidence coverage",
      "11. Submit mission for scoring",
      "60. Restore lab package",
      "71. Display build instructions",
      "72. Run build instructions",
    ],
    commandValue,
    message,
  );
}

export function createMainMenuScreen(systemName: string): ScreenDefinition {
  return createAuditMenuScreen(systemName, "QSECOFR");
}
