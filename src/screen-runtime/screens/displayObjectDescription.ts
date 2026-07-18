import type { ScreenDefinition } from "../screen.js";
import type { CatalogObject } from "../../ibmi-runtime/objectCatalogService.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function createDisplayObjectDescriptionScreen(
  systemName: string,
  _userName: string,
  object: CatalogObject,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPOBJD", "Display Object Description", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "OBJ", "Object", object.object),
    ...ibmDetailFields(5, "LIB", "Library", object.library),
    ...ibmDetailFields(6, "TYPE", "Object type", object.type),
    ...ibmDetailFields(7, "OWNER", "Owner", object.owner ?? "QSECOFR"),
    ...ibmDetailFields(8, "ATTR", "Attribute", deriveAttribute(object.type)),
    ...ibmDetailFields(9, "TEXT", "Text description", object.text ?? ""),
    ...ibmDetailFields(10, "CRTD", "Creation date", "06/01/26"),
    ...ibmDetailFields(11, "CHGD", "Last change date", "06/09/26"),
    ...ibmDetailFields(12, "PUB", "Public authority", object.publicAuth),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPOBJD",
    title: "Display Object Description",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

function deriveAttribute(objectType: string): string {
  switch (objectType) {
    case "*FILE":
      return "PF";
    case "*PGM":
      return "RPGLE";
    case "*JRN":
      return "JRN";
    case "*MENU":
      return "MNU";
    default:
      return objectType.replace(/^\*/, "");
  }
}
