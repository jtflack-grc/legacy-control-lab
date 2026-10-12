import type { ScreenDefinition } from "../screen.js";
import type { LibraryListSections } from "../../ibmi-runtime/libraryListService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  menuHeader,
  outputField,
  standardFunctionKeys,
} from "./screenHelpers.js";

export type DisplayLibraryListRow = {
  name: string;
  portion: "SYS" | "PRD" | "CUR" | "USR";
};

export function displayLibraryListRows(sections: LibraryListSections): DisplayLibraryListRow[] {
  const rows: DisplayLibraryListRow[] = [
    ...sections.system.map((name) => ({ name, portion: "SYS" as const })),
    ...sections.product.map((name) => ({ name, portion: "PRD" as const })),
  ];
  if (sections.current && sections.current !== "*CRTDFT") {
    rows.push({ name: sections.current, portion: "CUR" });
  }
  rows.push(...sections.user.map((name) => ({ name, portion: "USR" as const })));

  const seen = new Set<string>();
  return rows.filter((row) => !seen.has(row.name) && seen.add(row.name));
}

export function createDisplayLibraryListScreen(
  systemName: string,
  sections: LibraryListSections,
  screenId: "DSPLIBL" | "EDTLIBL" = "DSPLIBL",
): ScreenDefinition {
  const title = screenId === "EDTLIBL" ? "Edit Library List" : "Display Library List";
  const rows = displayLibraryListRows(sections);
  const fields = [
    ...menuHeader(title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6),
    ibmOptionLegend("OPT_HINT", 4, 6, "  5=Display objects in library"),
    ibmColumnHeader(6, 6, "Opt  Library      Portion"),
  ];

  rows.slice(0, 13).forEach((entry, index) => {
    const row = 7 + index;
    fields.push(commandField(`LOPT${index}`, row, 6, 2));
    fields.push(outputField(`LIB${index}`, row, 10, entry.name.padEnd(13)));
    fields.push(outputField(`PORTION${index}`, row, 24, entry.portion));
  });

  if (screenId === "EDTLIBL") {
    fields.push(
      outputField("HINT", 21, 6, "Interactive edit stubbed. Use ADDLIBLE/RMVLIBLE commands."),
    );
  }

  fields.push(standardFunctionKeys(24, "F3=Exit   F12=Cancel"));

  return {
    id: screenId,
    title,
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
