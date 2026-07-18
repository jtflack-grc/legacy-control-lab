import { listSpooledFiles as listSpooledFileRows } from "../db/repositories/spoolRepository.js";

export type SpooledFileSummary = {
  fileName: string;
  userName: string;
  spoolNumber: string;
  status: string;
  outputQueue?: string;
  userData?: string;
  totalPages?: string;
  currentPage?: string;
  copies?: string;
};

export function listSpooledFiles(systemName = "CLAIMS400"): SpooledFileSummary[] {
  return listSpooledFileRows(systemName).map((row) => ({
    ...row,
    outputQueue: row.userName,
    userData: "",
    totalPages: "1",
    currentPage: "1",
    copies: "1",
  }));
}
