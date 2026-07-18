import type { ScreenDefinition } from "../screen.js";
import { createGoMenuScreen } from "./screenHelpers.js";

/** IBM i stock + lab security paths — reached from SECURITY option 20. */
export function createSecurityStockMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen("SECSTOCK", systemName, "IBM i Security Paths", [
    " 1. Change your password",
    " 2. Work with authorization lists",
    " 3. Work with adopted authority",
    " 4. Work with security auditing",
    " 5. Analyze inactive profiles",
    " 6. Display privileged session",
    " 7. Change active profile list",
    " 8. Display service tools concept",
  ], commandValue);
}
