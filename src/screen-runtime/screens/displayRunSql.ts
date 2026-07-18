import type { ScreenDefinition } from "../screen.js";
import type { RunSqlResult } from "../../ibmi-runtime/runSqlService.js";
import { ibmColumnHeader, ibmScreenHeader, outputField, subfileScreenFooter } from "./screenHelpers.js";

const MAX_ROWS = 8;

function formatSqlLabel(sql: string): string[] {
  const compact = sql.replace(/\s+/g, " ").trim();
  const label = "SQL  . . . . . . . . . . . . . : ";
  if (compact.length <= 48) {
    return [`${label}${compact}`];
  }
  return [
    `${label}${compact.slice(0, 48)}`,
    `                                   ${compact.slice(48, 96)}`,
  ];
}

function formatDataRow(rowNum: number, row: string[], columns: string[]): string {
  const widths = columns.map((col, index) => {
    const dataWidth = Math.max(col.length, row[index]?.length ?? 0);
    return Math.min(dataWidth, index === 0 ? 18 : 16);
  });
  const parts = row.map((cell, index) => (cell ?? "").padEnd(widths[index]!).slice(0, widths[index]));
  const body = parts.join("  ").slice(0, 68);
  return `${String(rowNum).padStart(5)}  ${body}`;
}

export function createRunSqlResultScreen(
  systemName: string,
  sql: string,
  result: RunSqlResult,
  page = 0,
): ScreenDefinition {
  const fields = [ibmScreenHeader("RUNSQL", "Run SQL Statement", systemName), ...formatSqlLabel(sql).map((line, index) =>
    outputField(`SQL${index}`, 2 + index, 6, line.padEnd(74).slice(0, 74)),
  )];

  const totalRows = result.rowCount ?? result.rows.length;

  if (result.message) {
    fields.push(outputField("MSG", 5, 6, result.message.padEnd(74).slice(0, 74)));
  } else if (result.columns.length === 0 || totalRows === 0) {
    fields.push(outputField("EMPTY", 5, 6, "No rows selected."));
  } else {
    const header = `      Row  ${result.columns.join("  ")}`.slice(0, 74);
    fields.push(ibmColumnHeader(5, 6, header.padEnd(74)));
    const start = page * MAX_ROWS;
    const pageRows = result.rows.slice(start, start + MAX_ROWS);
    pageRows.forEach((row, index) => {
      fields.push(
        outputField(
          `ROW${index}`,
          6 + index,
          6,
          formatDataRow(start + index + 1, row, result.columns).padEnd(74).slice(0, 74),
        ),
      );
    });
    const endRow = Math.min(start + pageRows.length, totalRows);
    fields.push(
      outputField(
        "ROWSTAT",
        15,
        6,
        `Rows ${start + 1} to ${endRow} of ${totalRows}`.padEnd(74).slice(0, 74),
      ),
    );
    const hasMore = start + MAX_ROWS < totalRows;
    const status = hasMore ? "More..." : page > 0 ? "Bottom" : "";
    if (status) {
      fields.push(outputField("PAGE", 15, 71, status.padStart(9)));
    }
  }

  fields.push(...subfileScreenFooter("F3=Exit   F7=Page up   F8=Page down   F12=Cancel"));

  return {
    id: "RUNSQL",
    title: "Run SQL Statement",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F7", label: "Page up", action: "PAGE_UP" },
      { key: "F8", label: "Page down", action: "PAGE_DOWN" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
