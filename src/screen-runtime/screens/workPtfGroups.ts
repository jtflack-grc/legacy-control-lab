import type { ScreenDefinition } from "../screen.js";
import type { PtfGroupSummary } from "../../ibmi-runtime/ptfService.js";
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

const PTF_FIRST_ROW = 8;
const PTF_VISIBLE = 7;
const PTF_COL = {
  opt: 6,
  group: 10,
  status: 20,
  level: 32,
  target: 40,
  text: 52,
} as const;

export function createWorkPtfGroupsScreen(
  systemName: string,
  groups: PtfGroupSummary[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(groups, page, PTF_VISIBLE);
  const fields = [
    ibmScreenHeader("WRKPTFGRP", "Work with PTF Groups", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  5=Display group   8=Display special handling PTFs"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.opt, "Opt", "COL_OPT"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.group, "Group", "COL_GRP"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.status, "Status", "COL_STS"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.level, "Level", "COL_LVL"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.target, "Target", "COL_TGT"),
    ibmColumnHeader(PTF_FIRST_ROW - 2, PTF_COL.text, "Description", "COL_TXT"),
  ];

  visible.forEach((group, index) => {
    const row = PTF_FIRST_ROW + index;
    fields.push(commandField(`PGOPT${index}`, row, PTF_COL.opt, 1));
    fields.push(outputField(`PGRP${index}`, row, PTF_COL.group, group.groupId.padEnd(9).slice(0, 9)));
    fields.push(outputField(`PSTS${index}`, row, PTF_COL.status, group.status.padEnd(11).slice(0, 11)));
    fields.push(outputField(`PLVL${index}`, row, PTF_COL.level, group.level.padEnd(7).slice(0, 7)));
    fields.push(
      outputField(`PTGT${index}`, row, PTF_COL.target, group.targetRelease.padEnd(11).slice(0, 11)),
    );
    fields.push(
      outputField(`PTXT${index}`, row, PTF_COL.text, group.description.padEnd(28).slice(0, 28)),
    );
  });

  const pageStatus = subfilePageIndicator(page, groups.length, PTF_VISIBLE);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "WRKPTFGRP",
    title: "Work with PTF Groups",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
