import type { CatalogListRow } from "./catalogDataProviders.js";
import { resolveWrkOptionAction } from "../ibm74/wrkOptionResolver.js";

const OPTION_ACTIONS: Record<string, Record<string, (row: CatalogListRow, index: number) => { command: string; input: string } | null>> = {
  library_object: {
    "5": (row) => row.drillDown ?? null,
    "7": (row) => {
      const lib = row.line.trim().split(/\s+/)[0];
      return lib ? { command: "DSPLIBD", input: `DSPLIBD LIB(${lib})` } : null;
    },
  },
  job_batch: {
    "5": (row) => row.drillDown ?? null,
    "6": (row) => {
      const parts = row.line.trim().split(/\s+/);
      const jobNumber = parts[0];
      const user = parts[1];
      const jobName = parts[2];
      if (!jobNumber || !user || !jobName) return null;
      return { command: "DSPJOBLOG", input: `DSPJOBLOG JOB(${jobNumber}/${user}/${jobName})` };
    },
  },
  spool_print: {
    "2": (row) => {
      const file = row.line.trim().split(/\s+/)[0];
      return file ? { command: "CHGSPLFA", input: `CHGSPLFA FILE(${file})` } : null;
    },
    "5": (row) => row.drillDown ?? null,
    "6": (row) => {
      const file = row.line.trim().split(/\s+/)[0];
      return file ? { command: "RLSSPLF", input: `RLSSPLF FILE(${file})` } : null;
    },
  },
  message_queue: {
    "4": (row) => {
      const id = row.line.trim().split(/\s+/)[0];
      return id ? { command: "RMVMSG", input: `RMVMSG MSGQ(QSYSOPR) MSGKEY(${id})` } : null;
    },
    "5": (row) => row.drillDown ?? null,
  },
  system_value: {
    "2": (row) => {
      const name = row.line.trim().split(/\s+/)[0];
      return name ? { command: "CHGSYSVAL", input: `CHGSYSVAL SYSVAL(${name})` } : null;
    },
    "5": (row) => row.drillDown ?? null,
  },
  authority: {
    "2": (row) => {
      const parts = row.line.trim().split(/\s+/);
      const obj = parts[0];
      return obj?.includes("/")
        ? { command: "GRTOBJAUT", input: `GRTOBJAUT OBJ(${obj}) OBJTYPE(*FILE)` }
        : null;
    },
    "5": (row) => row.drillDown ?? null,
    "8": (row) => row.drillDown ?? null,
  },
  user_profile: {
    "2": (row) => {
      const user = row.line.trim().split(/\s+/)[0];
      return user ? { command: "CHGUSRPRF", input: `CHGUSRPRF USRPRF(${user})` } : null;
    },
    "5": (row) => {
      const user = row.line.trim().split(/\s+/)[0];
      return user ? { command: "DSPUSRPRF", input: `DSPUSRPRF USRPRF(${user})` } : null;
    },
    "8": (row) => {
      const user = row.line.trim().split(/\s+/)[0];
      return user ? { command: "DSPAUT", input: `DSPAUT USER(${user})` } : null;
    },
  },
  network_tcpip: {
    "5": (row) => row.drillDown ?? null,
  },
  journal_audit: {
    "5": (row) => row.drillDown ?? { command: "DSPJRN", input: "DSPJRN JRN(QSYS/QAUDJRN)" },
  },
  database_file: {
    "5": (row) => row.drillDown ?? null,
  },
  ifs: {
    "5": (row) => row.drillDown ?? null,
  },
};

export function resolveCatalogWorkOption(
  category: string,
  option: string,
  row: CatalogListRow,
  _index: number,
  screenId?: string,
): { command: string; input: string } | null {
  if (screenId?.startsWith("WRK")) {
    const wrkAction = resolveWrkOptionAction(screenId, option, row);
    if (wrkAction) return wrkAction;
  }

  const actions = OPTION_ACTIONS[category] ?? {
    "2": (r: CatalogListRow) => {
      if (r.drillDown) {
        const chg = r.drillDown.command.replace(/^DSP/, "CHG").replace(/^DSPOBJD/, "GRTOBJAUT");
        if (chg !== r.drillDown.command) {
          return { command: chg, input: r.drillDown.input.replace(r.drillDown.command, chg) };
        }
      }
      return r.drillDown ? { command: r.drillDown.command, input: r.drillDown.input } : null;
    },
    "5": (r: CatalogListRow) => r.drillDown ?? null,
  };
  const resolver = actions[option];
  if (!resolver) return null;
  return resolver(row, _index);
}
