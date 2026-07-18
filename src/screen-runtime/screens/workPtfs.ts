import type { ScreenDefinition } from "../screen.js";
import type { PtfEntry } from "../../ibmi-runtime/ptfService.js";
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

export type WorkPtfRow = PtfEntry & { groupId: string };

const ROW_FIRST = 8;
const ROW_VISIBLE = 7;
const COL = {
  opt: 6,
  ptf: 10,
  status: 20,
  product: 32,
  group: 44,
  text: 52,
} as const;

export function createWorkPtfsScreen(
  systemName: string,
  ptfs: WorkPtfRow[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(ptfs, page, ROW_VISIBLE);
  const fields = [
    ibmScreenHeader("WRKPTF", "Work with PTFs", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  5=Display PTF details"),
    ibmColumnHeader(ROW_FIRST - 2, COL.opt, "Opt", "COL_OPT"),
    ibmColumnHeader(ROW_FIRST - 2, COL.ptf, "PTF ID", "COL_PTF"),
    ibmColumnHeader(ROW_FIRST - 2, COL.status, "Status", "COL_STS"),
    ibmColumnHeader(ROW_FIRST - 2, COL.product, "Product", "COL_PRD"),
    ibmColumnHeader(ROW_FIRST - 2, COL.group, "Group", "COL_GRP"),
    ibmColumnHeader(ROW_FIRST - 2, COL.text, "Description", "COL_TXT"),
  ];

  visible.forEach((ptf, index) => {
    const row = ROW_FIRST + index;
    fields.push(commandField(`WPTOPT${index}`, row, COL.opt, 1));
    fields.push(outputField(`WPTID${index}`, row, COL.ptf, ptf.ptfId.padEnd(9).slice(0, 9)));
    fields.push(outputField(`WSTS${index}`, row, COL.status, ptf.status.padEnd(11).slice(0, 11)));
    fields.push(outputField(`WPRD${index}`, row, COL.product, ptf.product.padEnd(11).slice(0, 11)));
    fields.push(outputField(`WGRP${index}`, row, COL.group, ptf.groupId.padEnd(7).slice(0, 7)));
    fields.push(outputField(`WTXT${index}`, row, COL.text, ptf.description.padEnd(28).slice(0, 28)));
  });

  const pageStatus = subfilePageIndicator(page, ptfs.length, ROW_VISIBLE);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "WRKPTF",
    title: "Work with PTFs",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
