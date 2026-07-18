import type { ScreenDefinition } from "../screen.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import {
  commandField,
  ibmScreenHeader,
  outputField,
  standardFunctionKeys,
} from "./screenHelpers.js";
import { ensureQshellSession, visibleQshellLines } from "../../ibmi-runtime/pase/qshellRuntime.js";
import { qshellCommandMapStats } from "../../ibmi-runtime/pase/qshellCommandMap.js";

const OUTPUT_ROWS = 14;
const FIRST_OUTPUT_ROW = 4;
const INPUT_ROW = 19;

export function createQshellScreen(session: IbmiSession, commandValue = ""): ScreenDefinition {
  const state = ensureQshellSession(session);
  const visible = visibleQshellLines(state, OUTPUT_ROWS);

  const fields = [
    ibmScreenHeader("STRQSH", "Qshell — PASE Interactive", session.systemName),
    outputField("CWD", 2, 6, `Directory  . . . . . . . . . . : ${state.cwd}`.padEnd(74).slice(0, 74)),
    outputField("HINT", 3, 6, "Synthetic QSH — ls, pwd, cat, cd on /qopensys (LCL_QSH_MODE=host for dev)".padEnd(74)),
  ];

  for (let index = 0; index < OUTPUT_ROWS; index++) {
    fields.push(
      outputField(`OUT${index}`, FIRST_OUTPUT_ROW + index, 6, (visible[index] ?? "").padEnd(74).slice(0, 74)),
    );
  }

  const stats = qshellCommandMapStats();
  fields.push(
    outputField(
      "STATS",
      18,
      6,
      `PASE catalog: ${stats.cataloged} cmds  ${stats.blocked} blocked  ${stats.builtins} IBM i builtins`,
    ),
    outputField("PROMPT", INPUT_ROW, 6, "$"),
    commandField("QSH_CMD", INPUT_ROW, 8, 72, commandValue),
    standardFunctionKeys(24, "F3=Exit   F7=Scroll up   F8=Scroll down   F12=Cancel"),
  );

  return {
    id: "QSH",
    title: "Qshell",
    rows: 24,
    cols: 80,
    commandLine: false,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F7", label: "Scroll up", action: "PAGE_UP" },
      { key: "F8", label: "Scroll down", action: "PAGE_DOWN" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
