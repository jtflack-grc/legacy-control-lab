import type { ScreenDefinition } from "../screen.js";
import { commandField, menuHeader, outputField, subfileScreenFooter } from "./screenHelpers.js";
import type { RangeSystemEntry } from "../../range/loadRangeRegistry.js";
import type { CampaignMissionStatus } from "../../range/campaignService.js";
import type { ScorebookEntryRow } from "../../db/repositories/scorebookRepository.js";

function subfileStatusMessage(message: string): ReturnType<typeof outputField> {
  return outputField(
    "MSG",
    18,
    2,
    message ? message.slice(0, 74) : " ".repeat(74),
    message ? { intensity: "high" } : undefined,
  );
}

export function createWorkRangeScreen(
  systems: RangeSystemEntry[],
  currentSystem: string,
  message = "",
): ScreenDefinition {
  const fields = [
    ...menuHeader("WRKRANGE", "LCL"),
    outputField("HINT", 2, 2, "Type options, press Enter.  1=Select   5=Display"),
    outputField("COL", 4, 2, "Opt  System      Title                                      Status"),
  ];

  systems.slice(0, 10).forEach((system, index) => {
    const row = 5 + index;
    const mark = system.systemName === currentSystem ? "*" : " ";
    fields.push(commandField(`OPT${index}`, row, 2, 2));
    fields.push(
      outputField(
        `SYS${index}`,
        row,
        6,
        `${mark} ${system.systemName.padEnd(11)} ${system.title.slice(0, 40).padEnd(40)} Active`,
      ),
    );
  });

  fields.push(subfileStatusMessage(message));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return { id: "WRKRANGE", title: "Work with Range", rows: 24, cols: 80, commandLine: true, fields };
}

export function createWorkCampaignsScreen(
  campaigns: Array<{ campaignId: string; title: string; completed: number; total: number }>,
  message = "",
): ScreenDefinition {
  const fields = [
    ...menuHeader("WRKCMPGN", "LCL"),
    outputField("HINT", 2, 2, "Type options, press Enter.  1=Work missions   5=Display"),
    outputField("COL", 4, 2, "Opt  Campaign                     Title                            Progress"),
  ];

  campaigns.forEach((campaign, index) => {
    const row = 5 + index;
    fields.push(commandField(`OPT${index}`, row, 2, 2));
    fields.push(
      outputField(
        `C${index}`,
        row,
        6,
        `${campaign.campaignId.slice(0, 28).padEnd(28)} ${campaign.title.slice(0, 32).padEnd(32)} ${campaign.completed}/${campaign.total}`,
      ),
    );
  });

  fields.push(subfileStatusMessage(message));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return { id: "WRKCMPGN", title: "Work with Campaigns", rows: 24, cols: 80, commandLine: true, fields };
}

export function createWorkCampaignMissionsScreen(
  campaignId: string,
  missions: CampaignMissionStatus[],
  message = "",
): ScreenDefinition {
  const fields = [
    ...menuHeader("WRKCMPMSN", "LCL"),
    outputField("CAMP", 2, 2, `Campaign . . . . . . . . . . . . : ${campaignId}`),
    outputField("HINT", 3, 2, "Type options, press Enter.  1=Start   5=Display"),
    outputField("COL", 5, 2, "Opt  Mission     System      Title                         Status    Score"),
  ];

  missions.slice(0, 10).forEach((mission, index) => {
    const row = 6 + index;
    const score = mission.score === null ? "--" : String(Math.round(mission.score));
    fields.push(commandField(`OPT${index}`, row, 2, 2));
    fields.push(
      outputField(
        `M${index}`,
        row,
        6,
        `${mission.entry.missionId.padEnd(11)} ${mission.systemName.padEnd(11)} ${mission.title.slice(0, 28).padEnd(28)} ${mission.status.padEnd(9)} ${score}`,
      ),
    );
  });

  fields.push(subfileStatusMessage(message));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "WRKCMPMSN",
    title: "Work with Campaign Missions",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
  };
}

export function createWorkScorebookScreen(entries: ScorebookEntryRow[], message = ""): ScreenDefinition {
  const fields = [
    ...menuHeader("WRKSCORE", "LCL"),
    outputField("HINT", 2, 2, "Type options, press Enter.  5=Display attempt"),
    outputField("COL", 4, 2, "Opt  Mission      System      Persona      Mode        Status      Score"),
  ];

  entries.slice(0, 10).forEach((entry, index) => {
    const row = 5 + index;
    const score = entry.totalScore === null ? "--" : String(Math.round(entry.totalScore));
    fields.push(commandField(`OPT${index}`, row, 2, 2));
    fields.push(
      outputField(
        `S${index}`,
        row,
        6,
        `${entry.missionId.padEnd(11)} ${entry.systemName.padEnd(11)} ${(entry.personaId ?? "auditor").padEnd(11)} ${(entry.guidanceMode ?? "coach").padEnd(11)} ${entry.status.padEnd(11)} ${score}`,
      ),
    );
  });

  if (entries.length === 0) {
    fields.push(outputField("EMPTY", 6, 6, "No scorebook entries yet. Complete and submit a mission."));
  }

  fields.push(subfileStatusMessage(message));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return { id: "WRKSCORE", title: "Work with Scorebook", rows: 24, cols: 80, commandLine: true, fields };
}

export function createWorkScenariosScreen(
  packs: Array<{ name: string; scenarioId?: string }>,
  message = "",
): ScreenDefinition {
  const fields = [
    ...menuHeader("WRKSCN", "LCL"),
    outputField("HINT", 2, 2, "Type options, press Enter.  5=Display package"),
    outputField("COL", 4, 2, "Opt  Package                         Scenario"),
  ];

  packs.forEach((pack, index) => {
    const row = 5 + index;
    fields.push(commandField(`OPT${index}`, row, 2, 2));
    fields.push(
      outputField(
        `P${index}`,
        row,
        6,
        `${pack.name.slice(0, 32).padEnd(32)} ${(pack.scenarioId ?? "").padEnd(20)}`,
      ),
    );
  });

  if (packs.length === 0) {
    fields.push(outputField("EMPTY", 6, 6, "No .lclpack directories in data/packs."));
  }

  fields.push(subfileStatusMessage(message));
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return { id: "WRKSCN", title: "Work with Scenario Packs", rows: 24, cols: 80, commandLine: true, fields };
}

export function createWorkshopScreen(message = ""): ScreenDefinition {
  const fields = [
    ...menuHeader("WORKSHOP", "LCL"),
    outputField("PROMPT", 3, 6, "Select one of the following:"),
    outputField("O1", 5, 6, "1. Display scenario answer key"),
    outputField("O2", 6, 6, "2. Display expected findings"),
    outputField("O3", 7, 6, "3. Export blank worksheet"),
    outputField("O4", 8, 6, "4. Export facilitator guide"),
    outputField("O5", 9, 6, "5. Reset current mission"),
    outputField("O6", 10, 6, "6. Work with scenario packs"),
    subfileStatusMessage(message),
    ...subfileScreenFooter("F3=Exit   F12=Cancel"),
  ];
  return { id: "WORKSHOP", title: "Workshop", rows: 24, cols: 80, commandLine: true, fields };
}
