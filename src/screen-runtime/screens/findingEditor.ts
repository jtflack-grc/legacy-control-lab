import type { FindingRow } from "../../db/repositories/findingRepository.js";

import type { ScreenDefinition } from "../screen.js";

import {

  ibmColumnHeader,

  ibmScreenHeader,

  outputField,

  sliceSubfilePage,

  standardFunctionKeys,

} from "./screenHelpers.js";



const FINDING_FIRST_ROW = 8;

const FINDING_VISIBLE = 8;

const FINDING_COL = {

  num: 6,

  title: 10,

  severity: 44,

  impact: 54,

} as const;



export function createFindingListScreen(

  systemName: string,

  userName: string,

  findings: FindingRow[],

  page = 0,

): ScreenDefinition {

  const visible = sliceSubfilePage(findings, page, FINDING_VISIBLE);

  const fields = [

    ibmScreenHeader("WRKFINDING", "Work with Findings", systemName),

    outputField("BLANK1", 2, 1, " ".repeat(80)),

    outputField("HINT", 3, 6, "Saved findings listed below — compose new findings in the coach panel →"),

    ibmColumnHeader(FINDING_FIRST_ROW - 2, FINDING_COL.num, "#", "COL_NUM"),

    ibmColumnHeader(FINDING_FIRST_ROW - 2, FINDING_COL.title, "Title", "COL_TITLE"),

    ibmColumnHeader(FINDING_FIRST_ROW - 2, FINDING_COL.severity, "Severity", "COL_SEV"),

    ibmColumnHeader(FINDING_FIRST_ROW - 2, FINDING_COL.impact, "Decision impact", "COL_IMP"),

  ];



  if (findings.length === 0) {

    fields.push(

      outputField("EMPTY", FINDING_FIRST_ROW, 10, "No findings yet — use the coach panel finding composer."),

    );

  }



  visible.forEach((finding, index) => {

    const row = FINDING_FIRST_ROW + index;

    fields.push(outputField(`FNUM${index}`, row, FINDING_COL.num, String(index + 1 + page * FINDING_VISIBLE).padStart(2)));

    fields.push(outputField(`FTTL${index}`, row, FINDING_COL.title, finding.title.padEnd(33).slice(0, 33)));

    fields.push(outputField(`FSEV${index}`, row, FINDING_COL.severity, finding.severity.padEnd(9).slice(0, 9)));

    const impactReady = (finding.decisionImpact?.trim().length ?? 0) >= 15 ? "Ready" : "Pending";

    fields.push(outputField(`FIMP${index}`, row, FINDING_COL.impact, impactReady.padEnd(12).slice(0, 12)));

  });



  fields.push(

    outputField(

      "HINT2",

      18,

      6,

      `${userName}: F6=Open coach composer. SUBMITMSN when evidence and findings are complete.`,

    ),

  );

  fields.push(standardFunctionKeys());



  return {

    id: "FINDING",

    title: "Work with Findings",

    rows: 24,

    cols: 80,

    fields,

    functionKeys: [

      { key: "F3", label: "Exit", action: "EXIT_MENU" },

      { key: "F6", label: "Composer", action: "OPEN_COMPOSER" },

      { key: "F12", label: "Cancel", action: "CANCEL" },

    ],

  };

}



/** @deprecated Use createFindingListScreen — kept for layout audit probes. */

export function createFindingEditorScreen(systemName: string, userName: string): ScreenDefinition {

  return createFindingListScreen(systemName, userName, []);

}


