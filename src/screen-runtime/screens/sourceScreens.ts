import type { ScreenDefinition } from "../screen.js";
import type { ProgramReference, SourceMember } from "../../ibmi-runtime/sourceMemberService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  sliceSubfilePage,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
  SUBFILE_LAYOUT,
  SUBFILE_PAGE_FKEYS,
} from "./screenHelpers.js";

export function createStartPdmScreen(
  systemName: string,
  userName: string,
  library = "CLAIMS400",
): ScreenDefinition {
  return {
    id: "STRPDM",
    title: "Start PDM",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields: [
      ibmScreenHeader("STRPDM", "Start PDM", systemName),
      outputField("LIB", 2, 6, `Library . . . . . . . . . . . : ${library}`.padEnd(74)),
      outputField("USER", 3, 6, `User  . . . . . . . . . . . . : ${userName}`.padEnd(74)),
      outputField("LINE1", 5, 6, "Program Development Manager — select a work option:"),
      outputField("LINE2", 7, 8, "1. Work with libraries"),
      outputField("LINE3", 8, 8, "2. Work with objects"),
      outputField("LINE4", 9, 8, "3. Work with members"),
      outputField("LINE5", 10, 8, "4. Work with objects using PDM (WRKOBJPDM)"),
      ibmOptionPrompt("HINT", 12, 6, "Type option, press Enter"),
      commandField("OPT", 12, 33, 2),
      ...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false),
    ],
    functionKeys: subfilePagedFunctionKeys(),
    messageLine: `PDM for ${library} — option 3 opens QCLSRC members (NIGHTRUN, CLMMAINT path).`,
  };
}

export function createWorkObjectPdmScreen(
  systemName: string,
  library: string,
  objects: Array<{ name: string; type: string; text: string }>,
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(objects, page);
  const fields = [
    ibmScreenHeader("WRKOBJPDM", "Work with Objects Using PDM", systemName),
    outputField("LIB", 2, 6, `Library . . . . . . . . . . . : ${library}`.padEnd(74)),
    ibmOptionPrompt("HINT", 3, 6),
    ibmOptionLegend("OPTLEG", 4, 6, "  2=Change   5=Display"),
    ibmColumnHeader(SUBFILE_LAYOUT.headerRow, 6, "Opt  Object      Type      Text"),
  ];
  visible.forEach((object, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`OBJOPT${index}`, row, 6, 2));
    const line =
      `${object.name.padEnd(12)} ${object.type.padEnd(10)} ${object.text.slice(0, 40)}`.padEnd(71);
    fields.push(outputField(`OBJ${index}`, row, 10, line.slice(0, 71)));
  });
  const pageStatus = subfilePageIndicator(page, objects.length);
  if (pageStatus) {
    fields.push(
      outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)),
    );
  }
  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));
  return {
    id: "WRKOBJPDM",
    title: "Work with Objects Using PDM",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}

export function createWorkMemberPdmScreen(
  systemName: string,
  library: string,
  file: string,
  members: SourceMember[],
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(members, page);
  const fields = [
    ibmScreenHeader("WRKMBRPDM", "Work with Members Using PDM", systemName),
    outputField("FILE", 2, 6, `File  . . . . . . . . . . . . : ${library}/${file}`.padEnd(74)),
    ibmOptionPrompt("HINT", 3, 6),
    ibmOptionLegend("OPTLEG", 4, 6, "  2=Change   5=Display member"),
    ibmColumnHeader(SUBFILE_LAYOUT.headerRow, 6, "Opt  Member      Type      Text"),
  ];
  visible.forEach((member, index) => {
    const row = SUBFILE_LAYOUT.firstDataRow + index;
    fields.push(commandField(`MBROPT${index}`, row, 6, 2));
    const line =
      `${member.member.padEnd(12)} ${member.sourceType.padEnd(8)} ${member.text.slice(0, 42)}`.padEnd(71);
    fields.push(outputField(`MBR${index}`, row, 10, line.slice(0, 71)));
  });
  const pageStatus = subfilePageIndicator(page, members.length);
  if (pageStatus) {
    fields.push(
      outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)),
    );
  }
  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));
  return {
    id: "WRKMBRPDM",
    title: "Work with Members Using PDM",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}

export function createDisplayPhysicalFileMemberScreen(
  systemName: string,
  member: SourceMember,
  page = 0,
): ScreenDefinition {
  const pageSize = 14;
  const start = page * pageSize;
  const visibleLines = member.lines.slice(start, start + pageSize);
  const fields = [
    ibmScreenHeader("DSPPFM", "Display Physical File Member", systemName),
    outputField("FILE", 2, 6, `File  . . . . . . . . . . . . : ${member.library}/${member.file}`.padEnd(74)),
    outputField("MBR", 3, 6, `Member  . . . . . . . . . . . : ${member.member}`.padEnd(74)),
    outputField("TYPE", 4, 6, `Source type . . . . . . . . . : ${member.sourceType}`.padEnd(74)),
    outputField("TEXT", 5, 6, `Text  . . . . . . . . . . . . : ${member.text.slice(0, 48)}`.padEnd(74)),
  ];
  visibleLines.forEach((line, index) => {
    fields.push(outputField(`SRC${index}`, 7 + index, 8, line.padEnd(72).slice(0, 72)));
  });
  const pageStatus = subfilePageIndicator(page, member.lines.length, pageSize);
  if (pageStatus) {
    fields.push(outputField("PAGE", 22, 71, pageStatus.padStart(9)));
  }
  fields.push(...subfileScreenFooter("F3=Exit   F7=Page up   F8=Page down   F12=Cancel", "", false));
  return {
    id: "DSPPFM",
    title: "Display Physical File Member",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F7", label: "Page up", action: "PAGE_UP" },
      { key: "F8", label: "Page down", action: "PAGE_DOWN" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayProgramScreen(
  systemName: string,
  program: string,
  library: string,
  text: string,
): ScreenDefinition {
  return {
    id: "DSPPGM",
    title: "Display Program",
    rows: 24,
    cols: 80,
    fields: [
      ibmScreenHeader("DSPPGM", "Display Program", systemName),
      outputField("PGM", 3, 6, `Program . . . . . . . . . . . : ${library}/${program}`.padEnd(74)),
      outputField("TXT", 4, 6, `Text  . . . . . . . . . . . . : ${text}`.padEnd(74)),
      ...subfileScreenFooter("F3=Exit   F12=Cancel", "", false),
    ],
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayProgramReferencesScreen(
  systemName: string,
  refs: ProgramReference[],
  programLabel?: string,
  page = 0,
): ScreenDefinition {
  const visible = sliceSubfilePage(refs, page);
  const fields = [
    ibmScreenHeader("DSPPGMREF", "Display Program References", systemName),
    outputField(
      "PGM",
      2,
      6,
      `Program . . . . . . . . . . . : ${(programLabel ?? "*ALL").padEnd(48)}`.padEnd(74),
    ),
    ibmColumnHeader(4, 6, "Program     Library    File       Library    Usage"),
  ];
  visible.forEach((ref, index) => {
    const row = 5 + index;
    fields.push(
      outputField(
        `REF${index}`,
        row,
        6,
        `${ref.program.padEnd(12)} ${ref.library.padEnd(11)} ${ref.file.padEnd(11)} ${ref.fileLibrary.padEnd(11)} ${ref.usage}`,
      ),
    );
  });
  const pageStatus = subfilePageIndicator(page, refs.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }
  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));
  return {
    id: "DSPPGMREF",
    title: "Display Program References",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}
