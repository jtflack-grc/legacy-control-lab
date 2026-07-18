import type { ScreenDefinition } from "../screen.js";
import {
  filterCatalogObjects,
  listCatalogObjects,
  type CatalogObject,
} from "../../ibmi-runtime/objectCatalogService.js";
import type { ObjectFilter } from "../../db/repositories/objectRepository.js";
import {
  commandField,
  ibmColumnHeader,
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

export function listWorkObjectRefs(
  systemName: string,
  filter: ObjectFilter = {},
): Array<{ library: string; object: string }> {
  const objects =
    filter.library || filter.object || filter.type
      ? filterCatalogObjects(systemName, filter)
      : listCatalogObjects(systemName);
  return objects.map((obj) => ({ library: obj.library, object: obj.object }));
}

function resolveObjects(systemName: string, filter: ObjectFilter): CatalogObject[] {
  return filter.library || filter.object || filter.type
    ? filterCatalogObjects(systemName, filter)
    : listCatalogObjects(systemName);
}

export function createWorkObjectsScreen(
  systemName: string,
  _userName: string,
  filter: ObjectFilter = {},
  page = 0,
): ScreenDefinition {
  const objects = resolveObjects(systemName, filter);
  const visible = sliceSubfilePage(objects, page);
  const fields = [
    ibmScreenHeader("WRKOBJ", "Work with Objects", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  5=Display description   8=Display authority"),
    ibmColumnHeader(
      SUBFILE_LAYOUT.headerRow,
      6,
      "Opt  Library     Object      Type     Public authority",
    ),
  ];

  visible.forEach((obj, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`OOPT${index}`, row, 6, 2));
    const line = `${obj.library.padEnd(11)} ${obj.object.padEnd(11)} ${obj.type.padEnd(8)} ${obj.publicAuth}`;
    fields.push(outputField(`OBJ${index}`, row, 10, line.slice(0, 71)));
  });

  const pageStatus = subfilePageIndicator(page, objects.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS));

  return {
    id: "WRKOBJ",
    title: "Work with Objects",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
