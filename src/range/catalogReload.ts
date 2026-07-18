import { reloadPhysicalFileCatalog } from "../ibmi-runtime/physicalFileService.js";
import { reloadIfsLinkCatalog } from "../ibmi-runtime/ifsLinkService.js";
import { reloadJobLogCatalog } from "../ibmi-runtime/jobLogService.js";
import { reloadSubsystemCatalog } from "../ibmi-runtime/subsystemService.js";
import {
  reloadProgramReferenceCatalog,
  reloadSourceMemberCatalog,
} from "../ibmi-runtime/sourceMemberService.js";
import { resetBackupState } from "../ibmi-runtime/backupService.js";
import { loadScenarioPack } from "../scenario/loadScenarioPack.js";

export function reloadInMemoryCatalogs(scenarioId: string, systemName: string): void {
  const seed = loadScenarioPack(scenarioId);
  reloadPhysicalFileCatalog(systemName, seed.physicalFiles ?? []);
  reloadIfsLinkCatalog(systemName, seed.ifsLinks ?? []);
  reloadJobLogCatalog(systemName, seed.jobLogs ?? []);
  reloadSubsystemCatalog(systemName, seed.subsystems ?? []);
  reloadSourceMemberCatalog(systemName, seed.sourceMembers ?? []);
  reloadProgramReferenceCatalog(systemName, seed.programReferences ?? []);
  resetBackupState(systemName);
}
