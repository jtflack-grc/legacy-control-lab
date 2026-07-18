import type { ScreenDefinition } from "../screen.js";
import type { DiskUnitStatus, SystemStatusSnapshot } from "../../ibmi-runtime/systemMonitorService.js";
import {
  commandField,
  createInfoScreen,
  ibmBannerField,
  ibmColumnHeader,
  ibmHiOutput,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";

export function createWorkDiskStatusScreen(
  systemName: string,
  units: DiskUnitStatus[],
  elapsedTime = "00:05:00",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKDSKSTS", "Work with Disk Status", systemName),
    ibmBannerField("ELAPSED", 2, 6, `Elapsed time: ${elapsedTime}`),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 4, 6, "  5=Display disk unit detail"),
    ibmColumnHeader(6, 6, "Opt  ASP  Unit     Type   Status     % Used"),
  ];

  units.forEach((unit, index) => {
    const row = 7 + index;
    fields.push(commandField(`DOPT${index}`, row, 6, 2));
    const line = `${String(unit.aspNumber).padEnd(5)} ${unit.unitNumber.padEnd(8)} ${unit.unitType.padEnd(6)} ${unit.status.padEnd(10)} ${String(unit.percentUsed).padStart(3)}`;
    fields.push(outputField(`DSK${index}`, row, 10, line.slice(0, 71)));
  });

  fields.push(
    ...subfileScreenFooter(
      "F3=Exit   F5=Refresh   F10=Restart statistics   F12=Cancel   F16=Work with system status   F24=More keys",
    ),
  );

  return {
    id: "WRKDSKSTS",
    title: "Work with Disk Status",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F10", label: "Restart statistics", action: "RESTART_STATS" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
      { key: "F16", label: "Work with system status", action: "WRKSYSSTS" },
    ],
  };
}

export function createDisplayDiskUnitScreen(systemName: string, unit: DiskUnitStatus): ScreenDefinition {
  return createInfoScreen("WRKDSKSTS", "Display Disk Unit", systemName, "", [
    `ASP number . . . . . . . . . . : ${unit.aspNumber}`,
    `Unit . . . . . . . . . . . . . : ${unit.unitNumber}`,
    `Unit type  . . . . . . . . . . : ${unit.unitType}`,
    `Model  . . . . . . . . . . . . : ${unit.model}`,
    `Status . . . . . . . . . . . . : ${unit.status}`,
    `Percent used . . . . . . . . . : ${unit.percentUsed}`,
    `Total capacity (GB)  . . . . . : ${unit.totalGb}`,
    `Available capacity (GB)  . . . : ${unit.availableGb}`,
  ]);
}

export function createWorkSystemStatusScreen(systemName: string, status: SystemStatusSnapshot): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKSYSSTS", "Work with System Status", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("SYS", 4, 6, `System name . . . . . . . . . . : ${status.systemName}`),
    outputField("CPU", 5, 6, `% CPU used  . . . . . . . . . . : ${status.percentCpuUsed}`),
    outputField("DB", 6, 6, `% DB capability . . . . . . . . : ${status.percentDbCapability}`),
    outputField("ASP", 7, 6, `% system ASP used . . . . . . . : ${status.percentSystemAspUsed}`),
    outputField("ELAP", 8, 6, `Elapsed time . . . . . . . . . : ${status.elapsedTime}`),
    outputField("BLANK2", 9, 1, " ".repeat(80)),
    ibmHiOutput("JOBHDR", 10, 6, "Jobs:"),
    outputField("JOB0", 11, 6, `Jobs in system . . . . . . . . : ${status.jobsInSystem}`),
    outputField("JOB2", 12, 8, `Active  . . . . . . . . . . . : ${status.jobsActive}`),
    outputField("JOB3", 13, 8, `Waiting . . . . . . . . . . . : ${status.jobsWaiting}`),
    outputField("JOB4", 14, 8, `Held  . . . . . . . . . . . . : ${status.jobsHeld}`),
    outputField("JOB5", 15, 8, `Interactive . . . . . . . . . : ${status.interactiveJobs}`),
    outputField("JOB6", 16, 8, `Batch . . . . . . . . . . . . : ${status.batchJobs}`),
    outputField("STOR1", 18, 6, `System ASP (GB)  . . . . . . . : ${status.systemAspGb}`),
    outputField("STOR2", 19, 6, `System ASP available (GB)  . . : ${status.systemAspAvailableGb}`),
    outputField("STOR3", 20, 6, `Temporary storage (GB) . . . . : ${status.temporaryStorageGb.toFixed(1)}`),
    ...subfileScreenFooter(
      "F3=Exit   F5=Refresh   F10=Restart   F12=Cancel   F19=Extended system status   F24=More keys",
    ),
  ];

  return {
    id: "WRKSYSSTS",
    title: "Work with System Status",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F10", label: "Restart", action: "RESTART_STATS" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
      { key: "F19", label: "Extended system status", action: "EXTENDED_STATUS" },
    ],
  };
}

export function createWorkSystemActivityScreen(
  systemName: string,
  metrics: Array<{ label: string; value: string }>,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKSYSACT", "Work with System Activity", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmColumnHeader(4, 6, "Metric                          Value"),
  ];

  metrics.forEach((metric, index) => {
    const row = 5 + index;
    if (row > 18) return;
    fields.push(
      outputField(
        `ACT${index}`,
        row,
        6,
        `${metric.label.padEnd(32)} ${metric.value}`.slice(0, 74),
      ),
    );
  });

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "WRKSYSACT",
    title: "Work with System Activity",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
