import type { ScreenDefinition } from "../screen.js";
import type { IfsLink } from "../../ibmi-runtime/ifsLinkService.js";
import { createInfoScreen } from "./screenHelpers.js";

export function createDisplayObjectLinkScreen(
  systemName: string,
  userName: string,
  link: IfsLink,
  fullPath: string,
): ScreenDefinition {
  return createInfoScreen("DSPLNK", "Display Object Link", systemName, userName, [
    `Path . . . . . . . . . . . . . : ${fullPath}`,
    `Link type  . . . . . . . . . . : ${link.linkType}`,
    `Target . . . . . . . . . . . . : ${link.target}`,
    `Owner  . . . . . . . . . . . . : ${link.owner}`,
    `Data authority . . . . . . . . : ${link.dataAuthority}`,
    `Text description . . . . . . . : ${link.textDescription}`,
  ]);
}
