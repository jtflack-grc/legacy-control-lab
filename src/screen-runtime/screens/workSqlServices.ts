import type { ScreenDefinition } from "../screen.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  subfilePageIndicator,
  subfileScreenFooter,
  SUBFILE_LAYOUT,
  SUBFILE_PAGE_FKEYS,
} from "./screenHelpers.js";
import {
  buildSqlServiceMenuSelections,
  getSampleQueryForService,
  listQsys2ServiceViews,
  type Qsys2ServiceView,
} from "../../grc/grcSqlEvidenceCatalog.js";

export function createDisplaySqlServiceScreen(systemName: string, service: Qsys2ServiceView): ScreenDefinition {
  const sample = getSampleQueryForService(service);
  const fields = [
    ibmScreenHeader("DSPSQLSVC", "Display SQL Service", systemName),
    outputField("VIEW", 3, 6, `Service view . . . . . . . . . : ${service.viewName}`.padEnd(74)),
    outputField("DESC", 4, 6, `Description . . . . . . . . . : ${service.description.slice(0, 40)}`.padEnd(74)),
    outputField("BLANK", 5, 1, " ".repeat(80)),
    outputField("HINT", 6, 6, "Sample evidence query for this IBM i Service:"),
  ];
  const sqlLines = (sample?.sql ?? "").replace(/\s+/g, " ").trim();
  fields.push(outputField("SQL1", 7, 6, sqlLines.slice(0, 74).padEnd(74)));
  if (sqlLines.length > 74) {
    fields.push(outputField("SQL2", 8, 6, sqlLines.slice(74, 148).padEnd(74)));
  }
  fields.push(outputField("NOTE", 10, 6, "Press F12 to return. Option 6 on WRKSQLSVC runs this query.".padEnd(74)));
  fields.push(...subfileScreenFooter("F3=Exit   F12=Cancel", "", false));

  return {
    id: "DSPSQLSVC",
    title: "Display SQL Service",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createWorkSqlServicesScreen(systemName: string, page = 0): ScreenDefinition {
  const services = listQsys2ServiceViews();
  const visible = sliceSubfilePage(services, page);
  const fields = [
    ibmScreenHeader("WRKSQLSVC", "Work with SQL Services", systemName),
    ibmOptionPrompt("HINT", 3, 6),
    ibmOptionLegend("OPTLEG", 4, 6, "  5=Display   6=Run sample query"),
    ibmColumnHeader(SUBFILE_LAYOUT.headerRow, 6, "Opt  Service                         Description"),
  ];

  visible.forEach((service, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`SQLOPT${index}`, row, 6, 2));
    const name = service.viewName.padEnd(32).slice(0, 32);
    const desc = service.description.padEnd(36).slice(0, 36);
    fields.push(outputField(`SQL${index}`, row, 10, `${name} ${desc}`.padEnd(71).slice(0, 71)));
  });

  const pageStatus = subfilePageIndicator(page, services.length);
  if (pageStatus) {
    fields.push(
      outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)),
    );
  }

  fields.push(outputField("SIGNOFF", 18, 6, "90. Sign off"));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel", "", false));

  return {
    id: "WRKSQLSVC",
    title: "Work with SQL Services",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F7", label: "Page up", action: "PAGE_UP" },
      { key: "F8", label: "Page down", action: "PAGE_DOWN" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export const sqlServiceSelectionCommands = buildSqlServiceMenuSelections();
