import type { ScreenDefinition } from "../screen.js";
import type { LibraryListSections } from "../../ibmi-runtime/libraryListService.js";
import { menuHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";

export function createDisplayLibraryListScreen(
  systemName: string,
  sections: LibraryListSections,
  screenId: "DSPLIBL" | "EDTLIBL" = "DSPLIBL",
): ScreenDefinition {
  const title = screenId === "EDTLIBL" ? "Edit Library List" : "Display Library List";
  const fields = [
    ...menuHeader(title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("SYSHDR", 4, 6, "System portion:"),
  ];

  let row = 5;
  sections.system.forEach((lib, index) => {
    fields.push(outputField(`SYS${index}`, row, 8, lib));
    row += 1;
  });

  row += 1;
  fields.push(outputField("PRODHDR", row, 6, "Product portion:"));
  row += 1;
  sections.product.forEach((lib, index) => {
    fields.push(outputField(`PROD${index}`, row, 8, lib));
    row += 1;
  });

  row += 1;
  fields.push(outputField("CURHDR", row, 6, "Current library:"));
  row += 1;
  fields.push(outputField("CURRENT", row, 8, sections.current));

  row += 1;
  fields.push(outputField("USERHDR", row, 6, "User portion:"));
  row += 1;
  sections.user.forEach((lib, index) => {
    fields.push(outputField(`USER${index}`, row, 8, lib));
    row += 1;
  });

  if (screenId === "EDTLIBL") {
    row += 1;
    fields.push(
      outputField("HINT", row, 6, "Interactive edit stubbed. Use ADDLIBLE/RMVLIBLE commands."),
    );
  }

  fields.push(standardFunctionKeys());

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
