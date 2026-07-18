import type { ScreenDefinition } from "../screen.js";

import { listSpooledFiles } from "../../ibmi-runtime/spoolService.js";

import {

  commandField,

  ibmColumnHeader,

  ibmOptionLegend,

  ibmOptionPrompt,

  ibmScreenHeader,

  outputField,

  sliceSubfilePage,

  SUBFILE_PAGE_FKEYS,

  subfilePageIndicator,

  subfilePagedFunctionKeys,

  subfileScreenFooter,

} from "./screenHelpers.js";



const SPLF_SECONDARY_HDR_ROW = 6;

const SPLF_COLHDR_ROW = 7;

const SPLF_FIRST_DATA_ROW = 8;

const SPLF_VISIBLE_ROWS = 7;



export function createWorkSpooledFilesScreen(

  systemName: string,

  _userName: string,

  page = 0,

): ScreenDefinition {

  const spoolFiles = listSpooledFiles(systemName);

  const visible = sliceSubfilePage(spoolFiles, page, SPLF_VISIBLE_ROWS);



  const fields = [

    ibmScreenHeader("WRKSPLF", "Work with All Spooled Files", systemName),

    outputField("BLANK1", 2, 1, " ".repeat(80)),

    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),

    ibmOptionLegend(

      "OPT_HINT1",

      4,

      6,

      "  1=Send   2=Change   3=Hold   4=Delete   5=Display   6=Release   7=Messages",

    ),

    ibmOptionLegend("OPT_HINT2", 5, 6, "  8=Attributes        9=Work with printing status"),

    ibmColumnHeader(

      SPLF_SECONDARY_HDR_ROW,

      29,

      "Device or                     Total     Cur",

      "COLHDR2",

    ),

    ibmColumnHeader(

      SPLF_COLHDR_ROW,

      6,

      "Opt  File        User        Queue       User Data   Sts   Pages    Page  Copy",

    ),

  ];



  visible.forEach((file, index) => {

    const row = SPLF_FIRST_DATA_ROW + index;

    fields.push(commandField(`SPLT${index}`, row, 6, 2));

    const line = [

      file.fileName.padEnd(11),

      file.userName.padEnd(11),

      (file.outputQueue ?? file.userName).padEnd(11),

      (file.userData ?? "").padEnd(11),

      file.status.padEnd(5),

      (file.totalPages ?? "1").padStart(5),

      (file.currentPage ?? "1").padStart(5),

      (file.copies ?? "1").padStart(3),

    ].join(" ");

    fields.push(outputField(`SPL${index}`, row, 10, line.slice(0, 71)));

  });



  const pageStatus = subfilePageIndicator(page, spoolFiles.length, SPLF_VISIBLE_ROWS);

  if (pageStatus) {

    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));

  }



  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));



  return {

    id: "WRKSPLF",

    title: "Work with All Spooled Files",

    rows: 24,

    cols: 80,

    commandLine: true,

    fields,

    functionKeys: subfilePagedFunctionKeys(),

  };

}
