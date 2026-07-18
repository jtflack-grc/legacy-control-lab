import type { ScreenId } from "../screen-runtime/screen.js";
import { parseSubfileOption, SUBFILE_VISIBLE_ROWS } from "../screen-runtime/screens/screenHelpers.js";
import { listAuditJournalEntries } from "./auditJournalService.js";
import { listIfsLinks } from "./ifsLinkService.js";
import { listCatalogObjects, listObjectsByOwner } from "./objectCatalogService.js";
import { executeRunSql } from "./runSqlService.js";
import type { IbmiSession } from "./sessionService.js";
import { listSecuritySystemValues } from "./systemValueService.js";
import { listSpooledFiles } from "./spoolService.js";
import { listUserProfiles } from "./userProfileService.js";
import { listActiveJobs } from "./jobService.js";
import { buildActiveJobTreeRows } from "../screen-runtime/screens/ibmJobScreens.js";
import { listLibrariesForWork } from "./libraryAdminService.js";
import { getMessages } from "./messageService.js";
import { listAllPtfs, listPtfGroups, listPtfsForGroup } from "./ptfService.js";
import { listLibraryObjects } from "../screen-runtime/screens/libraryScreens.js";
import { listQsys2ServiceViews } from "../grc/grcSqlEvidenceCatalog.js";
import { listProgramReferences, listSourceFiles, listSourceMembers } from "./sourceMemberService.js";
import type { MenuRouteResult } from "./commandHandlers.js";

const RUNSQL_PAGE_SIZE = 8;

export const PAGED_SUBFILE_SCREENS = new Set<ScreenId>([
  "WRKUSRPRF",
  "WRKSYSVAL",
  "DSPSYSVAL",
  "WRKOBJ",
  "WRKOBJOWN",
  "WRKSPLF",
  "WRKLNK",
  "WRKACTJOB",
  "WRKLIB",
  "DSPLIB",
  "DSPJRN",
  "DSPSECAUD",
  "DSPAUDJRNE",
  "RUNSQL",
  "DSPMSGINT",
  "WRKPTFGRP",
  "WRKPTF",
  "DSPPTFGRP",
  "WRKSQLSVC",
  "WRKMBRPDM",
  "WRKOBJPDM",
  "DSPPGMREF",
  "DSPPFM",
]);

export function getSubfilePageSize(screenId: ScreenId): number {
  if (screenId === "RUNSQL") return RUNSQL_PAGE_SIZE;
  if (screenId === "DSPPFM") return 14;
  return SUBFILE_VISIBLE_ROWS;
}

export function getSubfileTotalItems(session: IbmiSession, screenId: ScreenId): number {
  switch (screenId) {
    case "WRKUSRPRF":
      return listUserProfiles(session.systemName).length;
    case "WRKSYSVAL":
    case "DSPSYSVAL":
      return listSecuritySystemValues(session.systemName).length;
    case "WRKOBJ":
      return listCatalogObjects(session.systemName).length;
    case "WRKOBJOWN": {
      const ctx = session.objOwnContext;
      if (!ctx) return 0;
      return listObjectsByOwner(session.systemName, ctx.userProfile, ctx.objType).length;
    }
    case "WRKSPLF":
      return listSpooledFiles(session.systemName).length;
    case "WRKLNK":
      return listIfsLinks(session.systemName, session.ifsContext?.directory ?? "/").length;
    case "WRKACTJOB":
      return buildActiveJobTreeRows(listActiveJobs(session.systemName)).length;
    case "WRKLIB":
      return listLibrariesForWork(session).length;
    case "DSPLIB":
      return session.libraryContext
        ? listLibraryObjects(session.systemName, session.libraryContext.name).length
        : 0;
    case "DSPJRN":
    case "DSPSECAUD":
    case "DSPAUDJRNE":
      return session.journalContext?.entries?.length ?? listAuditJournalEntries(session.systemName).length;
    case "RUNSQL":
      if (!session.runSqlContext) return 0;
      return executeRunSql(session.systemName, session.runSqlContext.sql).rows.length;
    case "DSPMSGINT":
      return getMessages(session.messageContext?.queueName ?? "QSYSOPR", session).length;
    case "WRKPTFGRP":
      return listPtfGroups(session.systemName).length;
    case "WRKPTF":
      return listAllPtfs(session.systemName).length;
    case "DSPPTFGRP":
      return session.ptfContext?.groupId
        ? listPtfsForGroup(session.ptfContext.groupId).length
        : 0;
    case "WRKSQLSVC":
      return listQsys2ServiceViews().length;
    case "WRKMBRPDM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const file = session.pdmContext?.sourceFile ?? "QCLSRC";
      return listSourceMembers(session.systemName, library, file).length;
    }
    case "WRKOBJPDM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const sourceFiles = listSourceFiles(session.systemName, library).length;
      const programs = new Set(
        listProgramReferences(session.systemName)
          .filter((ref) => ref.library.toUpperCase() === library.toUpperCase())
          .map((ref) => ref.program),
      ).size;
      return sourceFiles + programs;
    }
    case "DSPPGMREF": {
      const label = session.pdmContext?.programRef;
      if (!label || label === "*ALL") return listProgramReferences(session.systemName).length;
      const [library, program] = label.split("/");
      if (!library || !program) return listProgramReferences(session.systemName).length;
      return listProgramReferences(session.systemName).filter(
        (ref) =>
          ref.program.toUpperCase() === program.toUpperCase() &&
          ref.library.toUpperCase() === library.toUpperCase(),
      ).length;
    }
    case "DSPPFM": {
      const library = session.pdmContext?.library ?? "CLAIMS400";
      const file = session.pdmContext?.sourceFile ?? "QCLSRC";
      const member = session.pdmContext?.member ?? "NIGHTRUN";
      const source = listSourceMembers(session.systemName, library, file).find(
        (row) => row.member.toUpperCase() === member.toUpperCase(),
      );
      return source?.lines.length ?? 0;
    }
    default:
      return 0;
  }
}

export function getSubfilePage(session: IbmiSession, screenId: ScreenId): number {
  if (screenId === "RUNSQL") return session.runSqlContext?.page ?? 0;
  if (screenId === "DSPPFM") return session.pdmContext?.memberPage ?? 0;
  return session.subfilePage?.[screenId] ?? 0;
}

export function visibleSubfileFieldId(
  prefix: string,
  globalIndex: number,
  page: number,
  pageSize = SUBFILE_VISIBLE_ROWS,
): string {
  return `${prefix}${globalIndex - page * pageSize}`;
}

/** Position session on the page that contains globalIndex, then return page-relative option field values. */
export function subfileOptionInput(
  session: IbmiSession,
  screenId: ScreenId,
  optPrefix: string,
  globalIndex: number,
  option: string,
): Record<string, string> {
  const pageSize = getSubfilePageSize(screenId);
  const page = Math.floor(globalIndex / pageSize);
  if (screenId === "RUNSQL") {
    if (session.runSqlContext) {
      session.runSqlContext.page = page;
    }
  } else if (screenId === "DSPPFM") {
    session.pdmContext = { ...session.pdmContext, library: session.pdmContext?.library ?? "CLAIMS400", memberPage: page };
  } else {
    session.subfilePage = { ...session.subfilePage, [screenId]: page };
  }
  return { [visibleSubfileFieldId(optPrefix, globalIndex, page, pageSize)]: option };
}

export function eachVisibleSubfileOption<T>(
  session: IbmiSession,
  screenId: ScreenId,
  items: T[],
  optPrefix: string,
  values: Record<string, string>,
  handler: (item: T, option: string, globalIndex: number) => MenuRouteResult | undefined,
): MenuRouteResult | undefined {
  const page = getSubfilePage(session, screenId);
  const pageSize = getSubfilePageSize(screenId);
  const start = page * pageSize;
  const end = Math.min(items.length, start + pageSize);
  for (let visibleIndex = 0; visibleIndex < end - start; visibleIndex += 1) {
    const option = parseSubfileOption(values[`${optPrefix}${visibleIndex}`]);
    if (!option) continue;
    const result = handler(items[start + visibleIndex]!, option, start + visibleIndex);
    if (result) return result;
  }
  return undefined;
}

export function resetSubfilePage(session: IbmiSession, screenId: ScreenId): void {
  if (screenId === "RUNSQL") {
    if (session.runSqlContext) {
      session.runSqlContext.page = 0;
    }
    return;
  }
  if (screenId === "DSPPFM") {
    session.pdmContext = { ...session.pdmContext, library: session.pdmContext?.library ?? "CLAIMS400", memberPage: 0 };
    return;
  }
  session.subfilePage = { ...session.subfilePage, [screenId]: 0 };
}

export function changeSubfilePage(session: IbmiSession, screenId: ScreenId, delta: number): number {
  const pageSize = getSubfilePageSize(screenId);
  const total = getSubfileTotalItems(session, screenId);
  const maxPage = total > 0 ? Math.ceil(total / pageSize) - 1 : 0;
  const current =
    screenId === "RUNSQL"
      ? (session.runSqlContext?.page ?? 0)
      : screenId === "DSPPFM"
        ? (session.pdmContext?.memberPage ?? 0)
        : (session.subfilePage?.[screenId] ?? 0);
  const next = Math.min(maxPage, Math.max(0, current + delta));

  if (screenId === "RUNSQL") {
    if (session.runSqlContext) {
      session.runSqlContext.page = next;
    }
  } else if (screenId === "DSPPFM") {
    session.pdmContext = { ...session.pdmContext, library: session.pdmContext?.library ?? "CLAIMS400", memberPage: next };
  } else {
    session.subfilePage = { ...session.subfilePage, [screenId]: next };
  }

  return next;
}
