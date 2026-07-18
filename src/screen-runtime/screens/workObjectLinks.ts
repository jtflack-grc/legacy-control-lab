import type { ScreenDefinition } from "../screen.js";
import { listIfsLinks } from "../../ibmi-runtime/ifsLinkService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  SUBFILE_LAYOUT,
  SUBFILE_PAGE_FKEYS,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function listWorkObjectLinkNames(systemName: string, directory: string): string[] {
  return listIfsLinks(systemName, directory).map((link) => link.name);
}

export function createWorkObjectLinksScreen(
  systemName: string,
  _userName: string,
  directory: string,
  page = 0,
): ScreenDefinition {
  const allLinks = listIfsLinks(systemName, directory);
  const links = sliceSubfilePage(allLinks, page);
  const fields = [
    ibmScreenHeader("WRKLNK", "Work with Object Links", systemName),
    ...ibmDetailFields(3, "DIR", "Directory", directory),
    outputField("OPTS", 4, 6, "Type options, press Enter."),
    outputField(
      "OPT_HINT",
      5,
      6,
      "  2=Edit   3=Copy   4=Remove   5=Display   7=Rename   8=Display attributes",
    ),
    outputField("OPT_HINT2", 6, 6, " 11=Change current directory ...   12=Work with links"),
    ibmColumnHeader(SUBFILE_LAYOUT.headerRow, 6, "Opt   Object link            Type             Attribute    Text"),
  ];

  links.forEach((link, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`LOPT${index}`, row, 6, 2));
    const typeCol = link.linkType === "SYMLNK" ? `SYMLNK->${link.target.slice(0, 8)}` : link.linkType;
    const line = `${link.name.padEnd(22)} ${typeCol.padEnd(16)} ${"".padEnd(12)} ${(link.textDescription ?? "").slice(0, 14)}`;
    fields.push(outputField(`LNK${index}`, row, 10, line.slice(0, 71)));
  });

  if (allLinks.length === 0) {
    fields.push(outputField("EMPTY", SUBFILE_LAYOUT.firstDataRow, 10, "No links in this directory."));
  }

  const pageStatus = subfilePageIndicator(page, allLinks.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "WRKLNK",
    title: "Work with Object Links",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
