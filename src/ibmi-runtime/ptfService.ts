export type PtfGroupSummary = {

  groupId: string;

  status: string;

  level: string;

  targetRelease: string;

  description: string;

};



export type PtfEntry = {

  ptfId: string;

  status: string;

  description: string;

  product: string;

  superseded: boolean;

};



export type PtfDetailRecord = {

  entry: PtfEntry;

  product: string;

  release: string;

  onOrder: string;

  saveFile: string;

  status: string;

  statusDateTime: string;

  ptfType: string;

  iplRequired: string;

  iplAction: string;

  actionPending: string;

  actionRequired: string;

  minimumLevel: string;

  maximumLevel: string;

  supersedingPtf: string;

  technologyRefresh: string;

  targetRelease: string;

  ptfLibrary: string;

  optionalPart: string;

  creationDateTime: string;

  summary: string;

  coverLetter: string;

  groupId?: string;

};



const PTF_GROUPS: PtfGroupSummary[] = [

  {

    groupId: "SF99740",

    status: "Installed",

    level: "25303",

    targetRelease: "*CURRENT",

    description: "Cumulative PTF Package",

  },

  {

    groupId: "SF99739",

    status: "Installed",

    level: "12045",

    targetRelease: "*CURRENT",

    description: "HIPER Group",

  },

  {

    groupId: "SF99704",

    status: "Installed",

    level: "08902",

    targetRelease: "*CURRENT",

    description: "Database Group",

  },

];



const PTF_BY_GROUP: Record<string, PtfEntry[]> = {

  SF99740: [

    {

      ptfId: "SI76195",

      status: "Applied",

      description: "Security - authority failure logging",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76201",

      status: "Applied",

      description: "SQL plan cache stability for QSYS2 views",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76218",

      status: "Applied",

      description: "Print - spool file retention",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76244",

      status: "Applied",

      description: "PTF cover letter - cumulative metadata",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76102",

      status: "Superseded",

      description: "Security - superseded by SI76195",

      product: "5770-SS1",

      superseded: true,

    },

  ],

  SF99739: [

    {

      ptfId: "SI76001",

      status: "Applied",

      description: "HIPER - QBATCH job scheduler",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76012",

      status: "Applied",

      description: "HIPER - IFS symlink authority",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI76033",

      status: "Applied",

      description: "HIPER - journal receiver wrap",

      product: "5770-SS1",

      superseded: false,

    },

  ],

  SF99704: [

    {

      ptfId: "SI75810",

      status: "Applied",

      description: "Db2 for i - RUNSQL statistics",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI75822",

      status: "Applied",

      description: "Db2 for i - index rebuild",

      product: "5770-SS1",

      superseded: false,

    },

    {

      ptfId: "SI75840",

      status: "Not applied",

      description: "Db2 for i - pending IPL apply",

      product: "5770-SS1",

      superseded: false,

    },

  ],

};



const PTF_DETAIL: Record<string, Omit<PtfDetailRecord, "entry" | "groupId">> = {

  SI76195: {

    product: "5770-SS1",

    release: "V7R4M0",

    onOrder: "*NO",

    saveFile: "QGPL/SI76195",

    status: "Permanently applied",

    statusDateTime: "06/01/26  14:22:10",

    ptfType: "FIX",

    iplRequired: "*NO",

    iplAction: "*NONE",

    actionPending: "",

    actionRequired: "",

    minimumLevel: "0",

    maximumLevel: "99",

    supersedingPtf: "",

    technologyRefresh: "*NO",

    targetRelease: "*CURRENT",

    ptfLibrary: "QGPL",

    optionalPart: "",

    creationDateTime: "05/18/26  09:11:02",

    summary: "Correct authority failure message text for object operations.",

    coverLetter:

      "Apply this PTF to improve AF journal correlation on PAYROLL objects. Review DSPOBJAUT evidence after apply.",

  },

  SI76201: {

    product: "5770-SS1",

    release: "V7R4M0",

    onOrder: "*NO",

    saveFile: "QGPL/SI76201",

    status: "Permanently applied",

    statusDateTime: "06/02/26  08:04:55",

    ptfType: "FIX",

    iplRequired: "*NO",

    iplAction: "*NONE",

    actionPending: "",

    actionRequired: "",

    minimumLevel: "0",

    maximumLevel: "99",

    supersedingPtf: "",

    technologyRefresh: "*NO",

    targetRelease: "*CURRENT",

    ptfLibrary: "QGPL",

    optionalPart: "",

    creationDateTime: "05/20/26  11:30:00",

    summary: "SQL plan cache stability for QSYS2 catalog views.",

    coverLetter: "Recommended for RUNSQL evidence collection paths in audit missions.",

  },

  SI75840: {

    product: "5770-SS1",

    release: "V7R4M0",

    onOrder: "*NO",

    saveFile: "QGPL/SI75840",

    status: "Not applied",

    statusDateTime: "06/08/26  22:15:00",

    ptfType: "FIX",

    iplRequired: "*YES",

    iplAction: "*IPL",

    actionPending: "ACN",

    actionRequired: "IPL",

    minimumLevel: "0",

    maximumLevel: "99",

    supersedingPtf: "",

    technologyRefresh: "*NO",

    targetRelease: "*CURRENT",

    ptfLibrary: "QGPL",

    optionalPart: "",

    creationDateTime: "05/29/26  16:42:18",

    summary: "Database index maintenance — requires IPL before status shows Applied.",

    coverLetter: "Schedule IPL during maintenance window; verify WRKPTFGRP level after reboot.",

  },

};



function ibmStatus(entry: PtfEntry): string {

  if (entry.superseded || entry.status === "Superseded") {

    return "Superseded";

  }

  if (entry.status === "Not applied") {

    return "Not applied";

  }

  return "Permanently applied";

}



function findGroupForPtf(ptfId: string): string | undefined {

  for (const [groupId, entries] of Object.entries(PTF_BY_GROUP)) {

    if (entries.some((entry) => entry.ptfId === ptfId)) {

      return groupId;

    }

  }

  return undefined;

}



export function listPtfGroups(_systemName = "CLAIMS400"): PtfGroupSummary[] {

  return PTF_GROUPS;

}



export function getPtfGroup(groupId: string): PtfGroupSummary | undefined {

  const id = groupId.trim().toUpperCase();

  return PTF_GROUPS.find((group) => group.groupId === id);

}



export function listPtfsForGroup(groupId: string): PtfEntry[] {

  return PTF_BY_GROUP[groupId.trim().toUpperCase()] ?? [];

}



export function listAllPtfs(_systemName = "CLAIMS400"): (PtfEntry & { groupId: string })[] {

  return Object.entries(PTF_BY_GROUP).flatMap(([groupId, ptfs]) =>

    ptfs.map((entry) => ({ ...entry, groupId })),

  );

}



export function getPtfDetail(ptfId: string, groupId?: string): PtfDetailRecord | undefined {

  const id = ptfId.trim().toUpperCase();

  for (const group of Object.keys(PTF_BY_GROUP)) {

    const entry = PTF_BY_GROUP[group]!.find((row) => row.ptfId === id);

    if (!entry) continue;

    const stored = PTF_DETAIL[id];

    const resolvedGroup = groupId ?? findGroupForPtf(id);

    const base = stored ?? {

      product: entry.product,

      release: "V7R4M0",

      onOrder: "*NO",

      saveFile: `QGPL/${id}`,

      status: ibmStatus(entry),

      statusDateTime: "06/09/26  07:30:00",

      ptfType: "FIX",

      iplRequired: entry.status === "Not applied" ? "*YES" : "*NO",

      iplAction: entry.status === "Not applied" ? "*IPL" : "*NONE",

      actionPending: "",

      actionRequired: "",

      minimumLevel: "0",

      maximumLevel: "99",

      supersedingPtf: entry.superseded ? "SI76195" : "",

      technologyRefresh: "*NO",

      targetRelease: "*CURRENT",

      ptfLibrary: "QGPL",

      optionalPart: "",

      creationDateTime: "06/01/26  10:00:00",

      summary: entry.description,

      coverLetter: `Program temporary fix ${id} for ${entry.product}.`,

    };

    return {

      entry,

      ...base,

      status: ibmStatus(entry),

      groupId: resolvedGroup,

    };

  }

  return undefined;

}


