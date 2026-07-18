import type { ScreenDefinition } from "../screen.js";
import type { LibrarySummary } from "../../ibmi-runtime/libraryAdminService.js";
import type { CatalogObject } from "../../ibmi-runtime/objectCatalogService.js";
import { filterCatalogObjects } from "../../ibmi-runtime/objectCatalogService.js";
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

export function createWorkLibrariesScreen(
  systemName: string,
  libraries: LibrarySummary[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(libraries, page);
  const fields = [
    ibmScreenHeader("WRKLIB", "Work with Libraries", systemName),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField(
      "OPT_HINT",
      4,
      6,
      "  1=Create   2=Change   3=Copy   4=Delete   5=Display   6=Print   7=Rename   8=Display description",
    ),
    ibmColumnHeader(SUBFILE_LAYOUT.headerRow, 6, "Opt  Library     Type   ASP device    Text"),
  ];

  visible.forEach((lib, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`LOPT${index}`, row, 6, 2));
    const line = `${lib.name.padEnd(11)} ${lib.type.padEnd(6)} ${(lib.aspDevice ?? "*SYSBAS").padEnd(12)} ${lib.text.slice(0, 34)}`;
    fields.push(outputField(`LIB${index}`, row, 10, line.slice(0, 71)));
  });

  const pageStatus = subfilePageIndicator(page, libraries.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(
    ...subfileScreenFooter(
      "F3=Exit   F5=Refresh   F7=Page up   F8=Page down   F12=Cancel",
      "",
      false,
    ),
  );

  return {
    id: "WRKLIB",
    title: "Work with Libraries",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}

export function createDisplayLibraryScreen(
  systemName: string,
  library: LibrarySummary,
  objects: CatalogObject[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(objects, page);
  const fields = [
    ibmScreenHeader("DSPLIB", "Display Library", systemName),
    ...ibmDetailFields(3, "LIB", "Library", library.name),
    ...ibmDetailFields(4, "OBJCNT", "Number of objects", String(objects.length)),
    ...ibmDetailFields(5, "TYPE", "Type", library.type),
    ...ibmDetailFields(6, "ASP", "Library ASP device", library.aspDevice ?? "*SYSBAS"),
    ...ibmDetailFields(7, "CRTAUT", "Create authority", "*SYSVAL"),
    outputField("OPTS", 9, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 10, 6, "  5=Display full attributes   8=Display service attributes"),
    ibmColumnHeader(11, 6, "Opt  Object       Type      Attribute   Size     Text"),
  ];

  visible.forEach((obj, index) => {
    const row = 12 + index;
    if (row > 18) return;
    fields.push(commandField(`OOPT${index}`, row, 6, 2));
    const size = obj.type === "*FILE" ? "153600" : "10240";
    const line = `${obj.object.padEnd(12)} ${obj.type.padEnd(9)} ${"".padEnd(11)} ${size.padStart(8)} ${(obj.text ?? "").slice(0, 20)}`;
    fields.push(outputField(`OBJ${index}`, row, 10, line.slice(0, 71)));
  });

  const pageStatus = subfilePageIndicator(page, objects.length, 7);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(outputField("FKEYS", 24, 1, "F3=Exit   F12=Cancel   F17=Top   F18=Bottom".padEnd(80)));

  return {
    id: "DSPLIB",
    title: "Display Library",
    rows: 24,
    cols: 80,
    commandLine: false,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
      { key: "F17", label: "Top", action: "PAGE_TOP" },
      { key: "F18", label: "Bottom", action: "PAGE_BOTTOM" },
    ],
  };
}

export function listLibraryObjects(systemName: string, libraryName: string): CatalogObject[] {
  return filterCatalogObjects(systemName, { library: libraryName });
}

export function createDisplayLibraryDescriptionScreen(
  systemName: string,
  library: LibrarySummary,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPLIBD", "Display Library Description", systemName),
    ...ibmDetailFields(4, "NAME", "Library", library.name),
    ...ibmDetailFields(5, "TYPE", "Type", library.type),
    ...ibmDetailFields(6, "TEXT", "Text description", library.text),
    ...ibmDetailFields(8, "CRTD", "Create date", "01/15/20"),
    ...ibmDetailFields(9, "OWNER", "Owner", "QSECOFR"),
    outputField("FKEYS", 24, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];
  return {
    id: "DSPLIBD",
    title: "Display Library Description",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function listWorkLibraryNames(systemName: string, libraries: LibrarySummary[]): string[] {
  return libraries.slice(0, 10).map((lib) => lib.name);
}
