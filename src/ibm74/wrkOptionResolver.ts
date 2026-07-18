import type { CatalogListRow } from "../ibmi-runtime/catalogDataProviders.js";
import { inferWrkTargetCommand } from "./referenceService.js";

function token(line: string, index = 0): string {
  return line.trim().split(/\s+/)[index] ?? "";
}

function buildPrefill(target: string, wrkName: string, row: CatalogListRow): string {
  const line = row.line;
  const upper = target.toUpperCase();

  if (upper.includes("USRPRF") || upper === "DSPAUT" || upper === "CHGUSRPRF") {
    const user = token(line);
    if (upper === "DSPAUT") return `DSPAUT USER(${user})`;
    if (upper === "CHGUSRPRF") return `CHGUSRPRF USRPRF(${user})`;
    return `${target} USRPRF(${user})`;
  }

  if (upper.includes("SYSVAL") || upper === "CHGSYSVAL") {
    const sysval = token(line);
    if (upper === "CHGSYSVAL") return `CHGSYSVAL SYSVAL(${sysval})`;
    return `${target} SYSVAL(${sysval})`;
  }

  if (upper.includes("OBJAUT") || upper === "GRTOBJAUT" || upper === "EDTOBJAUT" || upper.includes("OBJD")) {
    const parts = line.trim().split(/\s+/);
    const obj = parts[0]?.includes("/") ? parts[0] : `${parts[0]}/${parts[1] ?? "*"}`;
    if (upper === "GRTOBJAUT") return `GRTOBJAUT OBJ(${obj}) OBJTYPE(*FILE)`;
    if (upper === "EDTOBJAUT") return `EDTOBJAUT OBJ(${obj})`;
    return `${target} OBJ(${obj})`;
  }

  if (upper.includes("JOBLOG")) {
    const jobNumber = token(line);
    const user = token(line, 1);
    const jobName = token(line, 2);
    return `DSPJOBLOG JOB(${jobNumber}/${user}/${jobName})`;
  }

  if (upper.includes("JOB") && !upper.includes("JOBD")) {
    const jobNumber = token(line);
    const user = token(line, 1);
    const jobName = token(line, 2);
    if (jobNumber && user && jobName) return `${target} JOB(${jobNumber}/${user}/${jobName})`;
    return `${target} JOB(${jobNumber})`;
  }

  if (upper.includes("SPLF") || upper === "CHGSPLFA" || upper === "RLSSPLF" || upper === "DLTSPLF") {
    const file = token(line);
    return `${target} FILE(${file})`;
  }

  if (upper.includes("LIB") && !upper.includes("LIBL")) {
    const lib = token(line);
    return `${target} LIB(${lib})`;
  }

  if (upper.includes("LNK") || upper === "CHGAUT") {
    const path = line.trim().split(/\s+/)[0];
    if (path?.startsWith("/")) return `${target} OBJ(${path})`;
  }

  if (upper.includes("JRN")) {
    return row.drillDown?.input ?? `${target} JRN(QSYS/QAUDJRN)`;
  }

  if (upper.includes("OUTQ")) {
    const outq = token(line);
    return `${target} OUTQ(${outq})`;
  }

  if (upper.includes("SBS")) {
    const sbs = token(line);
    return `${target} SBS(${sbs})`;
  }

  if (upper.includes("FILE") || upper.includes("PF") || upper === "DSPFD" || upper === "CHGPF") {
    const fileRef = line.includes("/") ? line.trim().split(/\s+/)[0] : undefined;
    if (fileRef?.includes("/")) return `${target} FILE(${fileRef})`;
  }

  if (upper.includes("MSGQ") || upper === "CHGMSGQ") {
    const msgq = token(line);
    return msgq.includes("/") ? `${target} MSGQ(${msgq})` : `${target} MSGQ(QSYS/${msgq})`;
  }

  if (upper.includes("JOBD") || upper === "CHGJOBD") {
    const jobd = token(line);
    return jobd.includes("/") ? `${target} JOBD(${jobd})` : `${target} JOBD(QGPL/${jobd})`;
  }

  if (upper.includes("JOBQ") || upper === "CHGJOBQ") {
    const jobq = token(line);
    return jobq.includes("/") ? `${target} JOBQ(${jobq})` : `${target} JOBQ(QGPL/${jobq})`;
  }

  if (upper.includes("DTAQ") || upper === "CHGDTAQ") {
    const dtaq = token(line);
    return dtaq.includes("/") ? `${target} DTAQ(${dtaq})` : `${target} DTAQ(QGPL/${dtaq})`;
  }

  if (upper.includes("USRCLS") || upper === "CHGUSRCLS") {
    return `${target} CLS(${token(line)})`;
  }

  if (upper.includes("USRGRP") || upper === "CHGUSRGRP") {
    return `${target} GRP(${token(line)})`;
  }

  if (upper.includes("AUTL") || upper === "CHGAUTL") {
    return `${target} AUTL(${token(line)})`;
  }

  if (upper.includes("PGM") || upper === "CHGPGM") {
    const parts = line.trim().split(/\s+/);
    const obj = parts[0]?.includes("/") ? parts[0] : `${parts[0]}/${parts[1] ?? "*"}`;
    return `${target} PGM(${obj})`;
  }

  if (upper.includes("TCPIP") || upper.includes("TCPSVR") || upper === "CHGTCPIP") {
    return `${target} SERVER(${token(line)})`;
  }

  if (upper.includes("PTF") || upper === "DSPPTFGRP") {
    return `${target} PTFID(${token(line)})`;
  }

  if (row.drillDown) return row.drillDown.input;
  return target;
}

export function resolveWrkOptionAction(
  wrkName: string,
  option: string,
  row: CatalogListRow,
): { command: string; input: string } | null {
  const target = inferWrkTargetCommand(wrkName, option);
  if (!target) {
    if (option === "5" && row.drillDown) return row.drillDown;
    return null;
  }
  const input = buildPrefill(target, wrkName, row);
  const command = input.split(/\s+/)[0] ?? target;
  return { command, input };
}
