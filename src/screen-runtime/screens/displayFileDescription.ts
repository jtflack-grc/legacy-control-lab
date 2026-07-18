import type { ScreenDefinition } from "../screen.js";
import type { PhysicalFile } from "../../ibmi-runtime/physicalFileService.js";
import { ibmScreenHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function createDisplayFileDescriptionScreen(
  systemName: string,
  _userName: string,
  file: PhysicalFile,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPFD", "Display File Description", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "FILE", "File", `${file.library}/${file.name}`),
    ...ibmDetailFields(5, "TYPE", "File type", file.fileType),
    ...ibmDetailFields(6, "RCDFMT", "Record format", file.recordFormat),
    ...ibmDetailFields(7, "MBR", "Member", file.member),
    ...ibmDetailFields(8, "RECLEN", "Record length", String(file.recordLength)),
    ...ibmDetailFields(9, "TEXT", "Text description", file.textDescription),
    ...ibmDetailFields(10, "FLDCNT", "Number of fields", String(file.fields.length)),
    outputField("PII_HDR", 12, 6, "Field list (privacy / PII review):"),
    outputField("PII_COL", 13, 6, "Field       Type     Len  Dec  Text"),
  ];

  const startRow = 14;
  file.fields.forEach((field, index) => {
    const row = startRow + index;
    const sensitive = field.name === "SSN" || field.text.toLowerCase().includes("social");
    const typeCol = `${field.type}`.padEnd(9);
    const lenCol = String(field.length).padStart(4);
    const decCol = String(field.decimals).padStart(4);
    const line = `${field.name.padEnd(12)} ${typeCol} ${lenCol} ${decCol}  ${field.text.slice(0, 28)}`;
    fields.push(outputField(`FLD${index}`, row, 6, line.padEnd(74).slice(0, 74)));
    if (sensitive) {
      fields.push(
        outputField(
          `PII${index}`,
          row,
          62,
          "*PII".padEnd(18),
        ),
      );
    }
  });

  if (file.name === "PAYMST") {
    fields.push(
      outputField(
        "NOTE",
        startRow + file.fields.length + 1,
        6,
        "Privacy note: SSN stored in native DB2 file — map to data inventory.",
      ),
    );
  }

  fields.push(standardFunctionKeys(24, "F3=Exit   F12=Cancel"));

  return {
    id: "DSPFD",
    title: "Display File Description",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
