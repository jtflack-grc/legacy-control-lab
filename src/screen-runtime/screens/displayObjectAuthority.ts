import type { ScreenDefinition } from "../screen.js";
import type { ObjectAuthorityDisplay } from "../../ibmi-runtime/authorityService.js";
import { createInfoScreen, ibmScreenHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";

export function createDisplayObjectAuthorityScreen(
  systemName: string,
  _userName: string,
  authority: ObjectAuthorityDisplay,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPOBJAUT", "Display Object Authority", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("OBJ", 4, 6, `Object . . . . . . . . . . . . : ${authority.object}`),
    outputField("LIB", 5, 6, `Library  . . . . . . . . . . . : ${authority.library}`),
    outputField("TYPE", 6, 6, `Type . . . . . . . . . . . . . : ${authority.type}`),
    outputField("PUB", 7, 6, `Public authority . . . . . . . : ${authority.publicAuthority}`),
    outputField("OWN", 8, 6, `Owner  . . . . . . . . . . . . : ${authority.owner}`),
    outputField("BLANK2", 9, 1, " ".repeat(80)),
    outputField("HDR", 10, 6, "User profile          Object authority"),
    outputField("LINE", 11, 6, "-------------------- ----------------"),
  ];

  authority.privateAuthorities.forEach((entry, index) => {
    const label = entry.note ? `${entry.userName} (${entry.note})` : entry.userName;
    const line = `${label.padEnd(21)} ${entry.authority}`;
    fields.push(outputField(`PRIV${index}`, 12 + index, 6, line.slice(0, 74)));
  });

  fields.push(standardFunctionKeys());

  return {
    id: "DSPOBJAUT",
    title: "Display Object Authority",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createObjectNotFoundScreen(
  systemName: string,
  userName: string,
  qualifiedName: string,
): ScreenDefinition {
  return createInfoScreen(
    "DSPOBJAUT",
    "Display Object Authority",
    systemName,
    userName,
    [],
    `CPF2204 - Object ${qualifiedName} not found.`,
  );
}
