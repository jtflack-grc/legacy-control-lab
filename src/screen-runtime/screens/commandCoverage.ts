import type { ScreenDefinition } from "../screen.js";
import { menuCommandFooter, menuHeader, outputField } from "./screenHelpers.js";
import type { CommandCoverageReport } from "../../catalog/commandCatalogService.js";

const CATEGORY_LABELS: Record<string, string> = {
  security: "Security",
  user_profile: "User profile",
  authority: "Authority",
  system_value: "System values",
  journal_audit: "Audit / journal",
  library_object: "Object / library",
  database_file: "Database file",
  job_batch: "Job / subsystem",
  spool_print: "Spool / print",
  message_queue: "Message / log",
  ifs: "IFS",
  source_pdm: "Source / PDM",
  sql_services: "SQL",
  network_tcpip: "TCP/IP",
  mission_lab: "Lab native",
  range: "Lab native",
};

export function createCommandCoverageScreen(
  systemName: string,
  report: CommandCoverageReport,
): ScreenDefinition {
  const fields = [
    ...menuHeader("DSPCMDCOV", systemName),
    outputField("TITLE", 2, 2, "Display Command Coverage"),
    outputField("HINT", 3, 2, `Total cataloged: ${report.total}   Promptable: ${report.promptable}`),
    outputField("COL", 4, 2, "Category             Cataloged  Promptable  Implemented  Stateful"),
  ];

  report.byCategory.slice(0, 12).forEach((row, index) => {
    const label = (CATEGORY_LABELS[row.category] ?? row.category).padEnd(20);
    fields.push(
      outputField(
        `R${index}`,
        5 + index,
        2,
        `${label} ${String(row.cataloged).padStart(8)} ${String(row.promptable).padStart(10)} ${String(row.implemented).padStart(11)} ${String(row.stateful).padStart(8)}`,
      ),
    );
  });

  fields.push(outputField("BOTTOM", 20, 2, "Bottom"));
  fields.push(...menuCommandFooter("", "F3=Exit   F5=Refresh   F12=Cancel"));

  return { id: "DSPCMDCOV", title: "Display Command Coverage", rows: 24, cols: 80, commandLine: true, fields };
}
