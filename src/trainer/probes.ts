import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { TrainerProbe } from "./types.js";
import { listImplementedCommands } from "../ibmi-runtime/commandCatalog.js";
import { menuSelectionCommands } from "../ibmi-runtime/commandHandlers.js";
import { goMenuSelectionCommands } from "../screen-runtime/screens/mainMenu.js";
import {
  commandSamples,
  mutationCommands,
  skipAutoBareCommands,
} from "./commandSamples.js";
import {
  handleDisplayJournalInput,
  handleWorkJobsInput,
  handleWorkDiskStatusInput,
  handleWorkObjectsInput,
  handleWorkSpooledFilesInput,
  handleWorkSystemValuesInput,
  handleWorkUserProfilesInput,
  handleDisplayFileFieldInput,
  handleWorkObjectLinksInput,
  handleWorkLibrariesInput,
  handleCatalogWorkInput,
} from "../ibmi-runtime/subfileHandlers.js";
import { saveLibrary } from "../ibmi-runtime/backupService.js";
import { ensureMissionAttempt, startMissionAttempt } from "../missions/missionEngine.js";
import { saveFinding } from "../missions/findings.js";
import { selectRangeSystem } from "../range/rangeService.js";
import { listWorkSystemValueNames } from "../screen-runtime/screens/displaySystemValue.js";
import { listWorkUserProfileNames } from "../screen-runtime/screens/workUserProfiles.js";
import { listWorkObjectRefs } from "../screen-runtime/screens/workObjects.js";
import { subfileOptionInput } from "../ibmi-runtime/subfilePaging.js";

const screenExpect = (screenId?: string) => ({ kind: "screen" as const, screenId });

function seedProbeFinding(session: IbmiSession, fields: Record<string, string>): void {
  const attempt = ensureMissionAttempt(session);
  if (!attempt) throw new Error("No mission attempt for probe finding seed");
  saveFinding(attempt.id, attempt.missionId, {
    title: fields.FINDING_TITLE ?? "Trainer finding",
    severity: fields.FINDING_SEV ?? "MODERATE",
    evidenceRefs: fields.FINDING_EVID,
    controlMapping: fields.FINDING_CTRL,
    findingText: fields.FINDING_TEXT,
    decisionImpact: fields.FINDING_IMPACT,
    recommendation: fields.FINDING_REC,
  });
}

function successMessageExpect() {
  return {
    kind: "message" as const,
    messageExcludes: ["CPF0001", "CPF0006", "CPF2105", "CPF2204", "LCL0901", "not implemented"],
  };
}

const messageExpect = (messageIncludes: string, messageExcludes?: string[]) => ({
  kind: "message" as const,
  messageIncludes,
  messageExcludes,
});

function expectForCommand(commandName: string) {
  if (mutationCommands.has(commandName)) {
    return successMessageExpect();
  }
  return screenExpect();
}

function auditMenuExpect(selection: string) {
  if (selection === "11") {
    return messageExpect("finding", ["not found", "not implemented"]);
  }
  if (selection === "60" || selection === "72") {
    return messageExpect("completed");
  }
  return screenExpect();
}

function auditMenuProbes(): TrainerProbe[] {
  return Object.entries(menuSelectionCommands).map(([selection, command]) => ({
    id: `audit-menu/${selection}`,
    group: "audit-menu",
    description: `AUDIT menu selection ${selection} → ${command}`,
    menu: "AUDIT" as const,
    input: selection,
    covers: [command.split(/\s+/)[0]!.toUpperCase()],
    expect: auditMenuExpect(selection),
  }));
}

const goMenuSelectionScreenIds: Record<string, Record<string, string>> = {
  SECURITY: {
    "1": "WRKUSRPRF",
    "2": "WRKSYSVAL",
    "3": "DSPJRN",
    "4": "WRKOBJ",
    "5": "DSPLIBL",
    "6": "WRKACTJOB",
    "7": "WRKSPLF",
    "8": "DSPMSG",
    "9": "CMDSEC",
    "10": "CMDUSR",
    "11": "CMDSYS",
    "12": "SECTOOLS",
    "13": "CMDAUT",
    "14": "CMDJRN",
    "15": "CMDOBJ",
    "16": "CMDJOB",
    "17": "WRKSYSSTS",
    "18": "WRKDSKSTS",
    "19": "WRKSYSACT",
    "20": "SECSTOCK",
  },
  SECSTOCK: {
    "1": "CHGPWD",
    "2": "WRKAUTL",
    "3": "DSPAUT",
    "4": "DSPSECAUD",
    "5": "ANZPRFACT",
    "6": "DSPPRVSSN",
    "7": "CHGACTPRFL",
    "8": "DSPSTCONC",
  },
  SECTOOLS: {
    "1": "DSPSTCONC",
    "2": "DSPPRVSSN",
  },
  JOB: {
    "1": "DSPJOB",
    "2": "DSPJOBLOG",
    "3": "WRKACTJOB",
  },
  SPL: {
    "1": "WRKSPLF",
    "2": "DSPMSG",
  },
};

function goMenuExpect(menu: string, selection: string) {
  return screenExpect(goMenuSelectionScreenIds[menu]?.[selection]);
}

function goMenuProbes(): TrainerProbe[] {
  const probes: TrainerProbe[] = [];
  for (const [menu, selections] of Object.entries(goMenuSelectionCommands)) {
    const privilegedMenu = menu === "SECURITY" || menu === "SECTOOLS" || menu === "SECSTOCK";
    probes.push({
      id: `go-menu/${menu.toLowerCase()}/open`,
      group: "go-menu",
      description: `GO ${menu} opens menu`,
      menu: "AUDIT",
      input: `GO ${menu}`,
      covers: ["GO"],
      expect: screenExpect(menu as "SECURITY" | "SECSTOCK" | "JOB" | "SPL"),
      sessionUser: privilegedMenu ? "QSECOFR" : undefined,
    });
    for (const [selection, command] of Object.entries(selections)) {
      probes.push({
        id: `go-menu/${menu.toLowerCase()}/${selection}`,
        group: "go-menu",
        description: `${menu} menu selection ${selection} → ${command}`,
        menu: menu as IbmiSession["currentMenu"],
        input: selection,
        covers: [command.split(/\s+/)[0]!.toUpperCase()],
        expect: goMenuExpect(menu, selection),
        sessionUser: privilegedMenu ? "QSECOFR" : undefined,
      });
    }
  }
  return probes;
}

function commandProbes(): TrainerProbe[] {
  const probes: TrainerProbe[] = [];

  for (const command of listImplementedCommands()) {
    const name = command.name;
    const hasRequiredParams = command.parameters.some((param) => param.required);

    if (name === "RUNSQL") {
      probes.push({
        id: "command/runsql/sample",
        group: "command",
        description: "RUNSQL QSYS2 user_info query",
        menu: "AUDIT",
        input: "RUNSQL SQL('select user_name, status from qsys2.user_info')",
        covers: ["RUNSQL"],
        expect: screenExpect("RUNSQL"),
      });
      continue;
    }

    if (name === "STRSQL") {
      probes.push({
        id: "command/strsql/guidance",
        group: "command",
        description: "STRSQL routes to RUNSQL guidance",
        menu: "AUDIT",
        input: "STRSQL",
        covers: ["STRSQL"],
        expect: successMessageExpect(),
      });
      continue;
    }

    if (name === "CHGUSRPRF") {
      probes.push({
        id: "command/chgusrprf/sample",
        group: "command",
        description: "CHGUSRPRF redisplays profile with CPI0000",
        menu: "AUDIT",
        input: commandSamples.CHGUSRPRF,
        covers: ["CHGUSRPRF"],
        sessionUser: "QSECOFR",
        expect: screenExpect("DSPUSRPRF"),
      });
      continue;
    }

    if (name === "CHGACTPRFL") {
      probes.push({
        id: "command/chgactprfl/sample",
        group: "command",
        description: "CHGACTPRFL shows activity profile list",
        menu: "AUDIT",
        input: commandSamples.CHGACTPRFL,
        covers: ["CHGACTPRFL"],
        sessionUser: "QSECOFR",
        expect: screenExpect("CHGACTPRFL"),
      });
      continue;
    }

    if (name === "DSPEVDDIFF") {
      probes.push({
        id: "command/dspevddiff/sample",
        group: "command",
        description: "DSPEVDDIFF after a profile mutation",
        menu: "AUDIT",
        covers: ["DSPEVDDIFF", "CHGUSRPRF"],
        run: ({ session, route }) => {
          route(session, "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)");
          return route(session, "DSPEVDDIFF TYPE(*USRPRF)");
        },
        expect: screenExpect("DSPEVDDIFF"),
      });
      continue;
    }

    if (name === "RESETLAB") {
      probes.push({
        id: "command/resetlab/sample",
        group: "command",
        description: "RESETLAB restores attempt baseline",
        menu: "AUDIT",
        covers: ["RESETLAB", "CHGUSRPRF"],
        run: ({ session, route }) => {
          route(session, "CHGUSRPRF USRPRF(OLDVENDOR) STATUS(*DISABLED)");
          return route(session, "RESETLAB MISSION(*CURRENT) CONFIRM(*YES)");
        },
        expect: screenExpect("AUDIT"),
      });
      continue;
    }

    if (name === "HLDSPLE") {
      probes.push({
        id: "command/spool/hold-release-delete",
        group: "command",
        description: "HLDSPLE RLSSPLF DLTSPLF on QAUDRPT",
        menu: "AUDIT",
        covers: ["HLDSPLE", "RLSSPLF", "DLTSPLF"],
        run: ({ session, route }) => {
          session.userName = "AUDIT";
          route(session, "HLDSPLE FILE(QAUDRPT)");
          route(session, "RLSSPLF FILE(QAUDRPT)");
          return route(session, "DLTSPLF FILE(QAUDRPT)");
        },
        expect: successMessageExpect(),
      });
      continue;
    }

    if (name === "RLSSPLF" || name === "DLTSPLF") {
      continue;
    }

    if (name === "RMVLIBLE") {
      probes.push({
        id: "command/rmvlible/sample",
        group: "command",
        description: "ADDLIBLE then RMVLIBLE LIB(CLAIMS400)",
        menu: "AUDIT",
        covers: ["ADDLIBLE", "RMVLIBLE"],
        run: ({ session, route }) => {
          route(session, "ADDLIBLE LIB(CLAIMS400)");
          return route(session, "RMVLIBLE LIB(CLAIMS400)");
        },
        expect: successMessageExpect(),
      });
      continue;
    }

    if (name === "RVKOBJAUT") {
      probes.push({
        id: "command/rvkobjaut/sample",
        group: "command",
        description: "GRTOBJAUT then RVKOBJAUT on PAYROLL/PAYMST",
        menu: "AUDIT",
        covers: ["GRTOBJAUT", "RVKOBJAUT"],
        run: ({ session, route }) => {
          route(session, "GRTOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK) AUT(*USE)");
          return route(session, "RVKOBJAUT OBJ(PAYROLL/PAYMST) USER(APCLERK)");
        },
        expect: successMessageExpect(),
      });
      continue;
    }

    if (name === "CRTUSRPRF") {
      probes.push({
        id: "command/crtusrprf/sample",
        group: "command",
        description: "CRTUSRPRF then DLTUSRPRF TRAINER01",
        menu: "AUDIT",
        covers: ["CRTUSRPRF", "DLTUSRPRF"],
        run: ({ session, route }) => {
          route(session, "CRTUSRPRF USRPRF(TRAINER01) PASSWORD(TRAINING)");
          return route(session, "DLTUSRPRF USRPRF(TRAINER01)");
        },
        expect: successMessageExpect(),
      });
      continue;
    }

    if (name === "DLTUSRPRF") {
      continue;
    }

    if (!hasRequiredParams && !skipAutoBareCommands.has(name)) {
      probes.push({
        id: `command/${name.toLowerCase()}/bare`,
        group: "command",
        description: `${name} (bare)`,
        menu: "AUDIT",
        input: name,
        covers: [name],
        expect: expectForCommand(name),
      });
    }

    const sample = commandSamples[name];
    if (sample) {
      probes.push({
        id: `command/${name.toLowerCase()}/sample`,
        group: "command",
        description: sample,
        menu: "AUDIT",
        input: sample,
        covers: [name],
        expect: mutationCommands.has(name) ? successMessageExpect() : screenExpect(),
      });
    }
  }

  probes.push({
    id: "command/go/cmdsec",
    group: "command",
    description: "GO CMDSEC opens security command menu",
    menu: "AUDIT",
    input: "GO CMDSEC",
    covers: ["GO"],
    expect: screenExpect("CMDSEC"),
  });

  probes.push({
    id: "command/scenario-pack/import-export",
    group: "command",
    description: "SAVSCNPKG then RSTSCNPKG round-trip",
    menu: "AUDIT",
    covers: ["SAVSCNPKG", "RSTSCNPKG", "DSPSCN"],
    run: ({ session, route }) => {
      route(session, "SAVSCNPKG SCENARIO(CLAIMS400)");
      const display = route(session, "DSPSCN PACKAGE(claims400)");
      route(session, "RSTSCNPKG PACKAGE(data/packs/claims400.lclpack) FORCE(*YES)");
      return display;
    },
    expect: screenExpect("DSPSCN"),
  });

  probes.push({
    id: "command/mapctrl/sample",
    group: "command",
    description: "MAPCTRL FINDING(1) CTRL(LCL-AC-01)",
    menu: "AUDIT",
    covers: ["MAPCTRL"],
    run: ({ session, route }) => {
      seedProbeFinding(session, {
        FINDING_TITLE: "Trainer finding",
        FINDING_SEV: "MODERATE",
      });
      return route(session, "MAPCTRL FINDING(1) CTRL(LCL-AC-01)");
    },
    expect: successMessageExpect(),
  });

  return probes;
}

function subfileProbes(): TrainerProbe[] {
  const qsecIndex = () => listWorkSystemValueNames("CLAIMS400").indexOf("QSECURITY");
  const backupIndex = () => listWorkUserProfileNames("CLAIMS400").indexOf("BACKUPADM");
  const paymstIndex = () =>
    listWorkObjectRefs("CLAIMS400").findIndex((o) => o.library === "PAYROLL" && o.object === "PAYMST");

  return [
    {
      id: "subfile/wrkusrprf-opt5",
      group: "subfile",
      description: "WRKUSRPRF option 5 → DSPUSRPRF",
      menu: "AUDIT",
      covers: ["WRKUSRPRF", "DSPUSRPRF"],
      run: ({ session, route }) => {
        route(session, "WRKUSRPRF");
        const index = backupIndex();
        return handleWorkUserProfilesInput(
          session,
          subfileOptionInput(session, "WRKUSRPRF", "OPT", index, "5"),
        );
      },
      expect: screenExpect("DSPUSRPRF"),
    },
    {
      id: "subfile/wrksysval-opt2",
      group: "subfile",
      description: "WRKSYSVAL option 2 → CHGSYSVAL prompt",
      menu: "AUDIT",
      covers: ["WRKSYSVAL", "CHGSYSVAL"],
      run: ({ session, route }) => {
        route(session, "WRKSYSVAL");
        const index = qsecIndex();
        return handleWorkSystemValuesInput(
          session,
          subfileOptionInput(session, "WRKSYSVAL", "SOPT", index, "2"),
        );
      },
      expect: screenExpect("CMDPROMPT"),
    },
    {
      id: "subfile/wrksysval-opt5",
      group: "subfile",
      description: "WRKSYSVAL option 5 → DSPSYSVAL detail",
      menu: "AUDIT",
      covers: ["WRKSYSVAL", "DSPSYSVAL"],
      run: ({ session, route }) => {
        route(session, "WRKSYSVAL");
        const index = qsecIndex();
        return handleWorkSystemValuesInput(
          session,
          subfileOptionInput(session, "WRKSYSVAL", "SOPT", index, "5"),
        );
      },
      expect: screenExpect("DSPSYSVAL"),
    },
    {
      id: "subfile/wrkusrprf-opt2",
      group: "subfile",
      description: "WRKUSRPRF option 2 → CHGUSRPRF prompt",
      menu: "AUDIT",
      covers: ["WRKUSRPRF", "CHGUSRPRF"],
      run: ({ session, route }) => {
        route(session, "WRKUSRPRF");
        const index = backupIndex();
        return handleWorkUserProfilesInput(
          session,
          subfileOptionInput(session, "WRKUSRPRF", "OPT", index, "2"),
        );
      },
      expect: screenExpect("CMDPROMPT"),
    },
    {
      id: "subfile/wrkobj-opt8",
      group: "subfile",
      description: "WRKOBJ option 8 → DSPOBJAUT",
      menu: "AUDIT",
      covers: ["WRKOBJ", "DSPOBJAUT"],
      run: ({ session, route }) => {
        route(session, "WRKOBJ");
        const index = paymstIndex();
        return handleWorkObjectsInput(
          session,
          subfileOptionInput(session, "WRKOBJ", "OOPT", index, "8"),
        );
      },
      expect: screenExpect("DSPOBJAUT"),
    },
    {
      id: "subfile/dspjrn-opt5",
      group: "subfile",
      description: "DSPJRN option 5 → entry detail",
      menu: "AUDIT",
      covers: ["DSPJRN"],
      run: ({ session, route }) => {
        route(session, "DSPJRN JRN(QSYS/QAUDJRN) ENTTYP(PW AF CP)");
        return handleDisplayJournalInput(session, { JOPT0: "5" });
      },
      expect: screenExpect("DSPJRN"),
    },
    {
      id: "subfile/wrkactjob-opt5",
      group: "subfile",
      description: "WRKACTJOB option 5 → DSPJOBATTR",
      menu: "AUDIT",
      covers: ["WRKACTJOB", "DSPJOBATTR"],
      run: ({ session, route }) => {
        route(session, "WRKACTJOB");
        return handleWorkJobsInput(session, { JOPT0: "5" });
      },
      expect: screenExpect("DSPJOBATTR"),
    },
    {
      id: "subfile/wrkdsksts-opt5",
      group: "subfile",
      description: "WRKDSKSTS option 5 → disk unit detail",
      menu: "SECURITY",
      sessionUser: "QSECOFR",
      covers: ["WRKDSKSTS"],
      run: ({ session, route }) => {
        route(session, "WRKDSKSTS");
        return handleWorkDiskStatusInput(session, { DOPT0: "5" });
      },
      expect: screenExpect("WRKDSKSTS"),
    },
    {
      id: "subfile/wrksplf-opt5",
      group: "subfile",
      description: "WRKSPLF option 5 → spool detail",
      menu: "AUDIT",
      covers: ["WRKSPLF"],
      run: ({ session, route }) => {
        route(session, "WRKSPLF");
        return handleWorkSpooledFilesInput(session, { SPLT0: "5" });
      },
      expect: screenExpect("WRKSPLF"),
    },
    {
      id: "subfile/dspffd-opt5",
      group: "subfile",
      description: "DSPFFD option 5 → field detail",
      menu: "AUDIT",
      covers: ["DSPFFD"],
      run: ({ session, route }) => {
        route(session, "DSPFFD FILE(PAYROLL/PAYMST)");
        return handleDisplayFileFieldInput(session, { FOPT0: "5" });
      },
      expect: screenExpect("DSPFFD"),
    },
    {
      id: "subfile/wrklib-opt5",
      group: "subfile",
      description: "WRKLIB option 5 → DSPLIB",
      menu: "SECURITY",
      sessionUser: "QSECOFR",
      covers: ["WRKLIB", "DSPLIB"],
      run: ({ session, route }) => {
        route(session, "WRKLIB");
        return handleWorkLibrariesInput(session, { LOPT0: "5" });
      },
      expect: screenExpect("DSPLIB"),
    },
    {
      id: "subfile/wrkfile-opt5",
      group: "subfile",
      description: "WRKFILE option 5 → DSPFD",
      menu: "SECURITY",
      sessionUser: "QSECOFR",
      covers: ["WRKFILE", "DSPFD"],
      run: ({ session, route }) => {
        route(session, "WRKFILE");
        return handleCatalogWorkInput(session, "WRKFILE", { WOPT0: "5" });
      },
      expect: screenExpect("DSPFD"),
    },
    {
      id: "subfile/wrklnk-opt5",
      group: "subfile",
      description: "WRKLNK option 5 → DSPLNK",
      menu: "AUDIT",
      covers: ["WRKLNK", "DSPLNK"],
      run: ({ session, route }) => {
        route(session, "WRKLNK OBJ('/claims')");
        return handleWorkObjectLinksInput(session, { LOPT0: "5" });
      },
      expect: screenExpect("DSPLNK"),
    },
    {
      id: "backup/savlib-rstlib",
      group: "command",
      description: "SAVLIB then RSTLIB with backup authority",
      menu: "AUDIT",
      covers: ["SAVLIB", "RSTLIB"],
      run: ({ session, route }) => {
        session.userName = "BACKUPADM";
        saveLibrary(session.systemName, "PAYROLL");
        return route(session, "RSTLIB LIB(PAYROLL)");
      },
      expect: messageExpect("PAYROLL", ["CPF3780", "not found", "not implemented"]),
    },
  ];
}

function missionProbes(): TrainerProbe[] {
  return [
    {
      id: "mission/submit-without-finding",
      group: "mission",
      description: "SUBMITMSN without findings returns guidance message",
      menu: "AUDIT",
      input: "SUBMITMSN",
      covers: ["SUBMITMSN"],
      expect: messageExpect("finding", ["not found", "not implemented"]),
    },
    {
      id: "mission/briefing-and-evidence",
      group: "mission",
      description: "DSPMISSION and DSPEVID open mission screens",
      menu: "AUDIT",
      covers: ["DSPMISSION", "DSPEVID"],
      run: ({ session, route }) => {
        const mission = route(session, "9");
        if (mission.kind !== "screen" || mission.screen.id !== "DSPMISSION") {
          return mission;
        }
        return route(session, "10");
      },
      expect: screenExpect("DSPEVID"),
    },
    {
      id: "mission/submit-with-finding",
      group: "mission",
      description: "WRKFINDING save then SUBMITMSN scores mission",
      menu: "AUDIT",
      covers: ["WRKFINDING", "SUBMITMSN"],
      run: ({ session, route }) => {
        route(session, "WRKUSRPRF");
        route(session, "DSPSYSVAL SYSVAL(QSECURITY)");
        route(session, "DSPSYSVAL SYSVAL(QAUDCTL)");
        route(session, "DSPOBJAUT OBJ(PAYROLL/PAYMST)");
        route(session, "DSPJRN");
        route(session, "8");
        seedProbeFinding(session, {
          FINDING_TITLE: "Trainer regression finding",
          FINDING_SEV: "MEDIUM",
          FINDING_EVID: "WRKUSRPRF",
          FINDING_CTRL: "Access review",
          FINDING_TEXT: "Automated trainer probe.",
          FINDING_IMPACT: "IT director must review privileged access by end of quarter.",
          FINDING_REC: "Review quarterly.",
        });
        return route(session, "11");
      },
      expect: screenExpect("SUBMITMSN"),
    },
    {
      id: "mission/claims-008-soc2-evidence",
      group: "mission",
      description: "CLAIMS-008 SOC 2 evidence chain collects and submits",
      menu: "AUDIT",
      covers: ["WRKUSRPRF", "DSPOBJAUT", "DSPSECAUD", "WRKACTJOB", "WRKFINDING", "SUBMITMSN"],
      run: ({ session, route }) => {
        session.systemName = "CLAIMS400";
        session.userName = "AUDIT";
        startMissionAttempt(session, "CLAIMS-008");
        route(session, "WRKUSRPRF");
        route(session, "DSPOBJAUT OBJ(PAYROLL/PAYMST)");
        route(session, "DSPSECAUD");
        route(session, "WRKACTJOB");
        route(session, "DSPJRN JRN(QSYS/QAUDJRN)");
        route(session, "8");
        seedProbeFinding(session, {
          FINDING_TITLE: "SOC 2 CC6/CC7 gap on CLAIMS400",
          FINDING_SEV: "HIGH",
          FINDING_EVID: "DSPOBJAUT PAYMST; DSPJRN",
          FINDING_CTRL: "SOC 2 CC6.1 / CC7.2",
          FINDING_TEXT: "Privileged profiles remain enabled and journal signal lacks response evidence.",
          FINDING_IMPACT: "CISO must recertify privileged access and document journal review by month end.",
          FINDING_REC: "Disable stale profiles and implement detect-and-respond workflow.",
        });
        return route(session, "11");
      },
      expect: screenExpect("SUBMITMSN"),
    },
    {
      id: "mission/hospital-002-privacy-evidence",
      group: "mission",
      description: "HOSPITAL-002 Clause 8 evidence chain on HOSPITAL400",
      menu: "AUDIT",
      covers: ["DSPOBJAUT", "DSPFD", "WRKJOBSCDE", "WRKLNK", "DSPJRN", "WRKFINDING", "SUBMITMSN"],
      run: ({ session, route }) => {
        selectRangeSystem(session, "HOSPITAL400");
        session.userName = "AUDIT";
        startMissionAttempt(session, "HOSPITAL-002");
        route(session, "DSPOBJAUT OBJ(PAYROLL/PAYMST)");
        route(session, "DSPFD FILE(PAYROLL/PAYMST)");
        route(session, "WRKJOBSCDE");
        route(session, "WRKLNK OBJ('/payroll')");
        route(session, "DSPJRN JRN(QSYS/QAUDJRN)");
        route(session, "8");
        seedProbeFinding(session, {
          FINDING_TITLE: "Hospital payroll PHI path gap",
          FINDING_SEV: "HIGH",
          FINDING_EVID: "DSPOBJAUT PAYMST; WRKJOBSCDE PAYIFSEXP",
          FINDING_CTRL: "ISO 27701 Clause 8",
          FINDING_TEXT: "PAYMST public authority and IFS export batch lack data-owner accountability.",
          FINDING_IMPACT: "Privacy officer must restrict PAYMST authority and approve batch export by Q3.",
          FINDING_REC: "Change public authority and document PAYIFSEXP approval.",
        });
        return route(session, "11");
      },
      expect: screenExpect("SUBMITMSN"),
    },
    {
      id: "mission/claims-009-availability-evidence",
      group: "mission",
      description: "CLAIMS-009 Black Swan availability evidence chain",
      menu: "AUDIT",
      covers: ["WRKSBMJOB", "WRKACTJOB", "WRKSYSSTS", "DSPMSG", "DSPJOBLOG", "WRKFINDING", "SUBMITMSN"],
      run: ({ session, route }) => {
        startMissionAttempt(session, "CLAIMS-009");
        route(session, "WRKSBMJOB");
        route(session, "WRKACTJOB");
        route(session, "WRKSYSSTS");
        route(session, "DSPMSG MSGQ(QSYSOPR)");
        route(session, "DSPJOBLOG");
        route(session, "DSPJOB JOB(230231)");
        route(session, "8");
        seedProbeFinding(session, {
          FINDING_TITLE: "Batch tail risk on CLAIMS400",
          FINDING_SEV: "HIGH",
          FINDING_EVID: "WRKSBMJOB NIGHTRUN; DSPMSG QSYSOPR",
          FINDING_CTRL: "ISO 27001 A.17.1 availability",
          FINDING_TEXT: "NIGHTRUN ended abnormally and BACKUPJOB held while WRKSYSSTS metrics look stable.",
          FINDING_IMPACT: "Operations director must review batch failure runbook and held jobs by next close.",
          FINDING_REC: "Investigate NIGHTRUN PGM failure and release or cancel held BACKUPJOB.",
        });
        return route(session, "11");
      },
      expect: screenExpect("SUBMITMSN"),
    },
    {
      id: "mission/claims-010-coso-evidence",
      group: "mission",
      description: "CLAIMS-010 COSO workshop and control mapping chain",
      menu: "AUDIT",
      covers: ["GO", "WRKCTRL", "MAPCTRL", "WRKFINDING", "SUBMITMSN"],
      run: ({ session, route }) => {
        startMissionAttempt(session, "CLAIMS-010");
        route(session, "GO WORKSHOP");
        route(session, "WRKCTRL");
        route(session, "WRKUSRPRF");
        route(session, "8");
        seedProbeFinding(session, {
          FINDING_TITLE: "COSO control environment gap",
          FINDING_SEV: "HIGH",
          FINDING_EVID: "WRKUSRPRF BACKUPADM",
          FINDING_CTRL: "COSO control environment",
          FINDING_TEXT: "Privileged access evidence is not mapped to control owner accountability.",
          FINDING_IMPACT: "Audit committee must require control mapping in WRKCTRL by next quarter.",
          FINDING_REC: "MAPCTRL finding to LCL-AC-01 and restrict BACKUPADM.",
        });
        route(session, "MAPCTRL FINDING(1) CTRL(LCL-AC-01)");
        return route(session, "11");
      },
      expect: screenExpect("SUBMITMSN"),
    },
  ];
}

export function buildTrainerProbes(): TrainerProbe[] {
  return [
    ...auditMenuProbes(),
    ...goMenuProbes(),
    ...commandProbes(),
    ...subfileProbes(),
    ...missionProbes(),
  ];
}

export { commandSamples, mutationCommands };
export { commandsCoveredByProbes } from "./catalogCoverage.js";
