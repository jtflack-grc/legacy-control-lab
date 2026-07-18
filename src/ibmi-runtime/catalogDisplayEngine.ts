import type { CatalogCommandDefinition } from "../catalog/commandTypes.js";
import type { IbmiSession } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { getParameter, getQualifiedObject } from "./commandParser.js";
import type { ScreenDefinition } from "../screen-runtime/screen.js";
import { ibmScreenHeader, outputField } from "../screen-runtime/screens/screenHelpers.js";
import { getCatalogObject, listCatalogObjects } from "./objectCatalogService.js";
import { getLibraryDescription } from "./libraryAdminService.js";
import { getJobByNumber, listActiveJobs } from "./jobService.js";
import { getMessageDescription } from "./messageService.js";
import { getLinkServer } from "./networkService.js";
import { getSystemValue } from "./systemValueService.js";
import { getUserProfile } from "./userProfileService.js";
import { listSubsystems } from "./subsystemService.js";
import { detailLinesForCatalogCommand } from "./catalogDataProviders.js";
import { listPhysicalFiles } from "./physicalFileService.js";
import { listLinkServers } from "./networkService.js";

function labeledField(row: number, label: string, value: string, id: string) {
  return outputField(id, row, 2, `${label.padEnd(28)} . . : ${value}`.slice(0, 78));
}

export function createDepthDisplayScreen(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parsed?: ParsedCommand,
): ScreenDefinition {
  const params: Record<string, string> = { ...parsed?.parameters };
  const name = definition.name.toUpperCase();
  const fields = [
    ibmScreenHeader(name, definition.displayName, session.systemName),
    outputField("TITLE", 3, 2, definition.displayName.slice(0, 76)),
  ];
  let row = 4;

  const usr = getParameter(parsed ?? { name, parameters: {}, positionals: [], raw: name }, "USRPRF");
  if (usr) {
    const profile = getUserProfile(usr, session.systemName);
    if (profile) {
      fields.push(labeledField(row++, "User profile", profile.userName, "USR"));
      fields.push(labeledField(row++, "Status", profile.status, "STATUS"));
      fields.push(labeledField(row++, "User class", profile.userClass, "CLASS"));
      fields.push(labeledField(row++, "Special authorities", profile.specialAuthorities ?? "*NONE", "SPCAUT"));
      fields.push(labeledField(row++, "Last sign-on", profile.lastSignon ?? "*NONE", "SIGNON"));
    }
  }

  const sysval = getParameter(parsed ?? { name, parameters: {}, positionals: [], raw: name }, "SYSVAL");
  if (sysval) {
    const value = getSystemValue(sysval, session.systemName);
    if (value) {
      fields.push(labeledField(row++, "System value", value.name, "SYSNAME"));
      fields.push(labeledField(row++, "Current value", value.value, "CURVAL"));
      fields.push(labeledField(row++, "Description", value.description ?? "", "DESC"));
    }
  }

  const lib = getParameter(parsed ?? { name, parameters: {}, positionals: [], raw: name }, "LIB");
  if (lib) {
    const library = getLibraryDescription(session.systemName, lib);
    if (library) {
      fields.push(labeledField(row++, "Library", library.name, "LIB"));
      fields.push(labeledField(row++, "Type", library.type, "TYPE"));
      fields.push(labeledField(row++, "Text", library.text, "TEXT"));
    }
  }

  const qualified = getQualifiedObject(parsed ?? { name, parameters: params, positionals: [], raw: name }, "OBJ")
    ?? getQualifiedObject(parsed ?? { name, parameters: params, positionals: [], raw: name }, "FILE");
  if (qualified.library && qualified.object) {
    const object = getCatalogObject(session.systemName, qualified.library, qualified.object);
    if (object) {
      fields.push(labeledField(row++, "Object", `${object.library}/${object.object}`, "OBJ"));
      fields.push(labeledField(row++, "Type", object.type, "TYPE"));
      fields.push(labeledField(row++, "Public authority", object.publicAuth, "PUBAUT"));
      fields.push(labeledField(row++, "Owner", object.owner ?? "QSECOFR", "OWNER"));
      fields.push(labeledField(row++, "Text", object.text ?? "", "OTEXT"));
    }
  }

  const jobRef = getParameter(parsed ?? { name, parameters: params, positionals: [], raw: name }, "JOB");
  if (jobRef) {
    const jobNumber = jobRef.split("/")[0] ?? jobRef;
    const job = getJobByNumber(session.systemName, jobNumber);
    if (job) {
      fields.push(labeledField(row++, "Job", `${job.jobNumber}/${job.userName}/${job.jobName}`, "JOB"));
      fields.push(labeledField(row++, "Status", job.status, "JSTAT"));
      fields.push(labeledField(row++, "Subsystem", job.subsystem, "SBS"));
      fields.push(labeledField(row++, "Type", job.jobType, "JTYPE"));
    }
  }

  const msgid = getParameter(parsed ?? { name, parameters: params, positionals: [], raw: name }, "MSGID");
  if (msgid) {
    const description = getMessageDescription(msgid);
    fields.push(labeledField(row++, "Message ID", description.messageId, "MSGID"));
    fields.push(labeledField(row++, "Message", description.text, "MSG"));
  }

  const server = getParameter(parsed ?? { name, parameters: params, positionals: [], raw: name }, "SERVER");
  if (server) {
    const link = getLinkServer(server);
    if (link) {
      fields.push(labeledField(row++, "Server", link.name, "SRV"));
      fields.push(labeledField(row++, "Status", link.status, "STAT"));
      fields.push(labeledField(row++, "Port", link.port, "PORT"));
      fields.push(labeledField(row++, "Description", link.description, "DESC"));
    }
  }

  const sbs = getParameter(parsed ?? { name, parameters: params, positionals: [], raw: name }, "SBS");
  if (sbs) {
    const subsystem = listSubsystems(session.systemName).find((entry) => entry.name === sbs.toUpperCase());
    if (subsystem) {
      fields.push(labeledField(row++, "Subsystem", subsystem.name, "SBS"));
      fields.push(labeledField(row++, "Status", subsystem.status, "SSTAT"));
      fields.push(labeledField(row++, "Description", subsystem.description, "SDESC"));
    }
  }

  const category = definition.category;
  const detailRowStart = row;
  if (category === "network_tcpip" && row === detailRowStart && !server) {
    const link = listLinkServers()[0];
    if (link) {
      fields.push(labeledField(row++, "Server", link.name, "SRV"));
      fields.push(labeledField(row++, "Status", link.status, "STAT"));
      fields.push(labeledField(row++, "Port", link.port, "PORT"));
      fields.push(labeledField(row++, "Description", link.description, "DESC"));
    }
  }

  if (category === "database_file" && row === detailRowStart && !qualified.library) {
    const physical = listPhysicalFiles(session.systemName)[0];
    const catalogObject =
      physical
        ? getCatalogObject(session.systemName, physical.library, physical.name)
        : listCatalogObjects(session.systemName).find((obj) => obj.type === "*FILE");
    if (catalogObject) {
      fields.push(
        labeledField(row++, "Object", `${catalogObject.library}/${catalogObject.object}`, "OBJ"),
      );
      fields.push(labeledField(row++, "Type", catalogObject.type, "TYPE"));
      fields.push(labeledField(row++, "Public authority", catalogObject.publicAuth, "PUBAUT"));
      fields.push(labeledField(row++, "Owner", catalogObject.owner ?? "QSECOFR", "OWNER"));
    }
  }

  if (category === "job_batch" && name.startsWith("DSP") && row === detailRowStart && !jobRef) {
    const job = listActiveJobs(session.systemName)[0];
    if (job) {
      fields.push(
        labeledField(row++, "Job", `${job.jobNumber}/${job.userName}/${job.jobName}`, "JOB"),
      );
      fields.push(labeledField(row++, "Status", job.status, "JSTAT"));
      fields.push(labeledField(row++, "Subsystem", job.subsystem, "SBS"));
      fields.push(labeledField(row++, "Type", job.jobType, "JTYPE"));
    }
  }

  if (row <= 6) {
    const lines = detailLinesForCatalogCommand(definition, session, params);
    lines.slice(0, 14).forEach((line, index) => {
      const fieldId = index === 0 ? "BODY" : `L${row}`;
      fields.push(outputField(fieldId, row++, 2, line.slice(0, 76)));
    });
  } else {
    fields.push(outputField("BODY", row++, 2, `${definition.name} detail display`));
  }

  if (name.startsWith("WRK") || name.startsWith("DSP")) {
    const relatedJobs = listActiveJobs(session.systemName).slice(0, 2);
    if (relatedJobs.length > 0 && row < 18) {
      fields.push(outputField("REL", row++, 2, "Related active jobs:"));
      for (const job of relatedJobs) {
        fields.push(outputField(`RJ${row}`, row++, 4, `${job.jobNumber} ${job.jobName} ${job.status}`.slice(0, 72)));
      }
    }
  }

  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F1=Help   F12=Cancel"));

  return {
    id: definition.name as ScreenDefinition["id"],
    title: definition.displayName,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
