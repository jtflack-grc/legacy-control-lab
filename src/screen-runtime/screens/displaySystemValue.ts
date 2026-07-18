import type { ScreenDefinition } from "../screen.js";
import { listSecuritySystemValues } from "../../ibmi-runtime/systemValueService.js";
import {
  commandField,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  SUBFILE_LAYOUT,
  ibmColumnHeader,

  SUBFILE_PAGE_FKEYS,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";

export function listWorkSystemValueNames(systemName: string): string[] {
  return listSecuritySystemValues(systemName).map((value) => value.name);
}

export function createWorkWithSystemValuesScreen(
  systemName: string,
  _userName: string,
  screenId: "DSPSYSVAL" | "WRKSYSVAL" = "WRKSYSVAL",
  page = 0,
): ScreenDefinition {
  const values = listSecuritySystemValues(systemName);
  const visible = sliceSubfilePage(values, page);
  const commandName = screenId === "WRKSYSVAL" ? "WRKSYSVAL" : "DSPSYSVAL";
  const fields = [
    ibmScreenHeader(commandName, "Work with System Values", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 4, 6, "  2=Change   5=Display"),
    outputField("COLHDR", SUBFILE_LAYOUT.headerRow, 6, "Opt  System value    Value                     Category"),
  ];

  visible.forEach((value, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`SOPT${index}`, row, 6, 2));
    const line = `${value.name.padEnd(16)} ${value.value.padEnd(24).slice(0, 24)} ${value.category}`;
    fields.push(outputField(`VAL${index}`, row, 10, line.slice(0, 71)));
  });

  const pageStatus = subfilePageIndicator(page, values.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS));

  return {
    id: screenId,
    title: "Work with System Values",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}

export function createDisplaySystemValueScreen(
  systemName: string,
  userName: string,
  page = 0,
): ScreenDefinition {
  return createWorkWithSystemValuesScreen(systemName, userName, "DSPSYSVAL", page);
}

export function createDisplaySystemValueDetailScreen(
  systemName: string,
  _userName: string,
  valueName: string,
  value: string,
  description: string,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPSYSVAL", "Display System Value", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("NAME", 4, 6, `System value . . . . . . . . . . . . . . . . . : ${valueName}`),
    outputField("DESC", 5, 6, `Description  . . . . . . . . . . . . . . . . . : ${description}`),
    outputField("BLANK2", 6, 1, " ".repeat(80)),
    outputField("CURR", 7, 6, `Current value  . . . . . . . . . . . . . . . . : ${value}`),
  ];

  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)));

  return {
    id: "DSPSYSVAL",
    title: "Display System Value",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
