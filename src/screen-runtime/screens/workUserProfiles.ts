import type { ScreenDefinition } from "../screen.js";
import { listUserProfiles } from "../../ibmi-runtime/userProfileService.js";
import {
  commandField,
  ibmHiOutput,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  SUBFILE_LAYOUT,
  SUBFILE_PAGE_FKEYS,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";
import {
  WRKUSRPRF_COLUMNS as COL,
  WRKUSRPRF_WIDTHS as W,
  wrkUsrPrfCell,
} from "./ibmDetailLayout.js";

export function listWorkUserProfileNames(systemName: string): string[] {
  return listUserProfiles(systemName).map((profile) => profile.userName);
}

export function createWorkUserProfilesScreen(
  systemName: string,
  _userName: string,
  page = 0,
): ScreenDefinition {
  const profiles = listUserProfiles(systemName);
  const visible = sliceSubfilePage(profiles, page);
  const fields = [
    ibmScreenHeader("WRKUSRPRF", "Work with User Profiles", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend(
      "OPT_HINT",
      4,
      6,
      "  5=Display user profile   8=Work with authorities by user",
    ),
    ibmOptionLegend("OPT_HINT2", 5, 6, " 12=Work with objects by user"),
    ibmHiOutput("COLHDR_OPT", SUBFILE_LAYOUT.headerRow, COL.opt, "Opt"),
    ibmHiOutput("COLHDR_USR", SUBFILE_LAYOUT.headerRow, COL.profile, "Profile"),
    ibmHiOutput("COLHDR_STS", SUBFILE_LAYOUT.headerRow, COL.status, "Status"),
    ibmHiOutput("COLHDR_GRP", SUBFILE_LAYOUT.headerRow, COL.group, "Group profile"),
    ibmHiOutput("COLHDR_SPC", SUBFILE_LAYOUT.headerRow, COL.special, "Special authorities"),
    ibmHiOutput("COLHDR_SGN", SUBFILE_LAYOUT.headerRow, COL.signon, "Previous"),
  ];

  visible.forEach((profile, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`OPT${index}`, row, COL.opt, 2));
    fields.push(
      outputField(`USR${index}`, row, COL.profile, wrkUsrPrfCell(profile.userName, W.profile)),
    );
    fields.push(
      outputField(`STS${index}`, row, COL.status, wrkUsrPrfCell(profile.status, W.status)),
    );
    fields.push(
      outputField(`GRP${index}`, row, COL.group, wrkUsrPrfCell(profile.groupProfile, W.group)),
    );
    fields.push(
      outputField(
        `SPC${index}`,
        row,
        COL.special,
        wrkUsrPrfCell(profile.specialAuthorities, W.special),
      ),
    );
    fields.push(
      outputField(`SGN${index}`, row, COL.signon, wrkUsrPrfCell(profile.lastSignon, W.signon)),
    );
  });

  const pageStatus = subfilePageIndicator(page, profiles.length);
  if (pageStatus) {
    fields.push(
      outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)),
    );
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "WRKUSRPRF",
    title: "Work with User Profiles",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
