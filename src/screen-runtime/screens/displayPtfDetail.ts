import type { ScreenDefinition } from "../screen.js";
import type { PtfDetailRecord } from "../../ibmi-runtime/ptfService.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

function wrapCoverLetter(text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

export function createDisplayPtfDetailScreen(
  systemName: string,
  detail: PtfDetailRecord,
): ScreenDefinition {
  const ptfId = detail.entry.ptfId;
  const fields = [
    ibmScreenHeader("DSPPTF", "Display PTF Details", systemName),
    outputField("HDR", 2, 6, "General information"),
    outputField("BLANK1", 3, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "PROD", "Product", detail.product),
    ...ibmDetailFields(5, "RLS", "Release", detail.release),
    ...ibmDetailFields(6, "PTF", "PTF identifier", ptfId),
    ...ibmDetailFields(7, "STAT", "Status", detail.status),
    ...ibmDetailFields(8, "STDT", "Status date/time", detail.statusDateTime),
    ...ibmDetailFields(9, "ORD", "On order", detail.onOrder),
    ...ibmDetailFields(10, "SAVF", "PTF save file", detail.saveFile),
    ...ibmDetailFields(11, "IPL", "IPL required", detail.iplRequired),
    ...ibmDetailFields(12, "IPLA", "Unattended IPL action", detail.iplAction),
    ...ibmDetailFields(13, "PND", "Action pending", detail.actionPending || " "),
    ...ibmDetailFields(14, "REQ", "Action required", detail.actionRequired || " "),
    ...ibmDetailFields(15, "MIN", "Minimum level", detail.minimumLevel),
    ...ibmDetailFields(16, "MAX", "Maximum level", detail.maximumLevel),
    ...ibmDetailFields(17, "SUP", "Latest superseding PTF", detail.supersedingPtf || " "),
    ...ibmDetailFields(18, "TR", "Technology refresh PTF", detail.technologyRefresh),
    ...ibmDetailFields(19, "TGT", "Target release", detail.targetRelease),
  ];

  if (detail.groupId) {
    fields.push(...ibmDetailFields(20, "GRP", "PTF group", detail.groupId));
  }

  const coverStart = detail.groupId ? 22 : 21;
  fields.push(outputField("COVER_HDR", coverStart, 6, "Cover letter"));
  const coverLines = wrapCoverLetter(detail.coverLetter, 68, 2);
  coverLines.forEach((line, index) => {
    fields.push(outputField(`COVER${index}`, coverStart + 1 + index, 8, line.padEnd(72).slice(0, 72)));
  });

  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F6=Print cover letter   F12=Cancel".padEnd(80)));

  return {
    id: "DSPPTF",
    title: "Display PTF Details",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F6", label: "Print cover letter", action: "PRINT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
