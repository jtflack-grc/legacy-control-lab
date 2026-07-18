import type { ScreenDefinition } from "../screen.js";
import type { PtfEntry, PtfGroupSummary } from "../../ibmi-runtime/ptfService.js";
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

const ROW_FIRST = 10;
const ROW_VISIBLE = 7;
const COL = {
  opt: 6,
  ptf: 10,
  status: 20,
  product: 32,
  text: 44,
} as const;

export function createDisplayPtfGroupScreen(
  systemName: string,
  group: PtfGroupSummary,
  ptfs: PtfEntry[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(ptfs, page, ROW_VISIBLE);
  const fields = [
    ibmScreenHeader("DSPPTFGRP", "Display PTF Group", systemName),
    outputField("GROUP", 2, 6, `PTF group . . . . . . . . . . . : ${group.groupId}`),
    outputField("STAT", 3, 6, `Status  . . . . . . . . . . . . : ${group.status}`),
    outputField("LEVEL", 4, 6, `Level   . . . . . . . . . . . . : ${group.level}`),
    outputField("TGT", 5, 6, `Target release . . . . . . . . : ${group.targetRelease}`),
    outputField("DESC", 6, 6, `Description . . . . . . . . . : ${group.description}`),
    outputField("BLANK1", 7, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 8, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 9, 6, "  5=Display PTF"),
    ibmColumnHeader(ROW_FIRST - 2, COL.opt, "Opt", "COL_OPT"),
    ibmColumnHeader(ROW_FIRST - 2, COL.ptf, "PTF ID", "COL_PTF"),
    ibmColumnHeader(ROW_FIRST - 2, COL.status, "Status", "COL_STS"),
    ibmColumnHeader(ROW_FIRST - 2, COL.product, "Product", "COL_PRD"),
    ibmColumnHeader(ROW_FIRST - 2, COL.text, "Description", "COL_TXT"),
  ];

  visible.forEach((ptf, index) => {
    const row = ROW_FIRST + index;
    fields.push(commandField(`PTOPT${index}`, row, COL.opt, 1));
    fields.push(outputField(`PTID${index}`, row, COL.ptf, ptf.ptfId.padEnd(9).slice(0, 9)));
    fields.push(outputField(`PSTS${index}`, row, COL.status, ptf.status.padEnd(11).slice(0, 11)));
    fields.push(outputField(`PPRD${index}`, row, COL.product, ptf.product.padEnd(11).slice(0, 11)));
    fields.push(outputField(`PTXT${index}`, row, COL.text, ptf.description.padEnd(35).slice(0, 35)));
  });

  const pageStatus = subfilePageIndicator(page, ptfs.length, ROW_VISIBLE);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "DSPPTFGRP",
    title: "Display PTF Group",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
