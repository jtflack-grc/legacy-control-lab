import type { ScreenDefinition } from "../screen.js";
import type { CatalogObject } from "../../ibmi-runtime/objectCatalogService.js";
import { listObjectsByOwner } from "../../ibmi-runtime/objectCatalogService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmHiOutput,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  SUBFILE_LAYOUT,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export type ObjOwnFilter = {
  userProfile: string;
  objType: string;
};

export function listWorkObjectOwnerRefs(
  systemName: string,
  filter: ObjOwnFilter,
): Array<{ library: string; object: string; type: string; attribute: string }> {
  return listObjectsByOwner(systemName, filter.userProfile, filter.objType).map((obj) => ({
    library: obj.library,
    object: obj.object,
    type: obj.type,
    attribute: objectAttribute(obj),
  }));
}

function objectAttribute(obj: CatalogObject): string {
  if (obj.type === "*FILE") return "PF";
  if (obj.type === "*PGM") return "RPGLE";
  if (obj.type === "*JRN") return "";
  return "";
}

export function createWorkObjectOwnerScreen(
  systemName: string,
  filter: ObjOwnFilter,
  page = 0,
): ScreenDefinition {
  const objects = listObjectsByOwner(systemName, filter.userProfile, filter.objType);
  const visible = sliceSubfilePage(objects, page);

  const fields = [
    ibmScreenHeader("WRKOBJOWN", "Work with Objects by Owner", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(3, "USRPRF", "User profile", filter.userProfile),
    ibmOptionPrompt("OPTS", 5, 6),
    ibmOptionLegend(
      "OPT_HINT",
      6,
      6,
      "  2=Edit authority   4=Delete   5=Display authority",
    ),
    outputField("OPT_HINT2", 7, 6, "  8=Display description   9=Change owner"),
    ibmColumnHeader(
      SUBFILE_LAYOUT.headerRow,
      6,
      "Opt  Object        Library       Type      Attribute         ASP",
    ),
    outputField("ASP_HDR", SUBFILE_LAYOUT.headerRow, 71, "Device"),
  ];

  visible.forEach((obj, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`OOPT${index}`, row, 6, 2));
    const line =
      `${obj.object.padEnd(14)} ${obj.library.padEnd(14)} ${obj.type.padEnd(10)} ` +
      `${objectAttribute(obj).padEnd(17)} *SYSBAS`;
    fields.push(outputField(`OBJ${index}`, row, 10, line.slice(0, 70)));
  });

  const pageStatus = subfilePageIndicator(page, objects.length);
  if (pageStatus) {
    fields.push(
      outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)),
    );
  }

  if (filter.userProfile === "PAYADMIN") {
    fields.push(
      ibmHiOutput(
        "NOTE",
        15,
        6,
        "Clause 10: PAYADMIN owns PAYMST — group profile is not a data owner.",
      ),
    );
  }
  if (filter.userProfile === "QPGMR") {
    fields.push(
      ibmHiOutput(
        "NOTE",
        15,
        6,
        "Clause 10: disabled QPGMR still owns source files — ownership drift.",
      ),
    );
  }

  fields.push(
    ...subfileScreenFooter(
      "F3=Exit   F4=Prompt   F5=Refresh   F9=Retrieve   F18=Bottom",
      "",
      true,
    ),
  );

  return {
    id: "WRKOBJOWN",
    title: "Work with Objects by Owner",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      ...subfilePagedFunctionKeys(),
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F9", label: "Retrieve", action: "RETRIEVE" },
      { key: "F18", label: "Bottom", action: "PAGE_BOTTOM" },
    ],
  };
}
