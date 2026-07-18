import type { ScreenDefinition } from "../screen.js";
import type { PhysicalFile } from "../../ibmi-runtime/physicalFileService.js";
import {
  commandField,
  createInfoScreen,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";

export function createDisplayFileFieldDescriptionScreen(
  systemName: string,
  _userName: string,
  file: PhysicalFile,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPFFD", "Display File Field Description", systemName),
    outputField("FILE", 3, 6, `File . . . . . . . . . . . . . : ${file.library}/${file.name}`),
    outputField("FMT", 4, 6, `Record format  . . . . . . . . : ${file.recordFormat}`),
    outputField("OPTS", 5, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 6, 6, "  5=Display field details"),
    ibmColumnHeader(8, 6, "Opt  Field       Type   Length  Dec  Text"),
  ];

  file.fields.forEach((field, index) => {
    const row = 9 + index;
    fields.push(commandField(`FOPT${index}`, row, 6, 2));
    const line = `${field.name.padEnd(11)} ${field.type.padEnd(6)} ${String(field.length).padStart(6)}  ${String(field.decimals).padStart(3)}  ${field.text}`;
    fields.push(outputField(`FLD${index}`, row, 10, line.slice(0, 71)));
  });

  fields.push(...subfileScreenFooter());

  return {
    id: "DSPFFD",
    title: "Display File Field Description",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createFileFieldDetailScreen(
  systemName: string,
  userName: string,
  file: PhysicalFile,
  fieldName: string,
): ScreenDefinition {
  const field = file.fields.find((entry) => entry.name.toUpperCase() === fieldName.toUpperCase());
  const detail = field ?? {
    name: fieldName,
    type: "?",
    length: 0,
    decimals: 0,
    text: "Field not found",
  };

  return createInfoScreen("DSPFFD", "Display File Field Description", systemName, userName, [
    `File . . . . . . . . . . . . . : ${file.library}/${file.name}`,
    `Record format  . . . . . . . . : ${file.recordFormat}`,
    `Field  . . . . . . . . . . . . : ${detail.name}`,
    `Type . . . . . . . . . . . . . : ${detail.type}`,
    `Length . . . . . . . . . . . . : ${detail.length}`,
    `Decimal positions  . . . . . . : ${detail.decimals}`,
    `Text . . . . . . . . . . . . . : ${detail.text}`,
  ]);
}
