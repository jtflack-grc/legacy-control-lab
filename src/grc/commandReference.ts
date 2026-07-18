import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { isThinHelpText } from "../catalog/commandEnrichment.js";
import type { CatalogCommandParameter } from "../catalog/commandTypes.js";
import { getArticlePack } from "./articlePacks.js";
import { AUDITOR_INSIGHTS } from "../lab/coachInsights.js";
import type { ScreenId } from "../screen-runtime/screen.js";

export type IbmCommandParameterRef = {
  name: string;
  label?: string;
  helpText?: string;
};

export type IbmCommandReference = {
  command: string;
  displayName?: string;
  summary: string;
  parameters: IbmCommandParameterRef[];
  examples?: string[];
  wrkOptions?: Record<string, string>;
  source: string;
};

const CATEGORY_SOURCE: Record<string, string> = {
  security: "command-catalog/security.commands.json",
  system_value: "command-catalog/system-values.commands.json",
  user_profile: "command-catalog/user-profile.commands.json",
  authority: "command-catalog/authority.commands.json",
  library_object: "command-catalog/object-library.commands.json",
  job_batch: "command-catalog/job-subsystem.commands.json",
  spool_print: "command-catalog/spool-print.commands.json",
  message_queue: "command-catalog/message.commands.json",
  journal_audit: "command-catalog/journal-audit.commands.json",
  database_file: "command-catalog/database-file.commands.json",
  ifs: "command-catalog/ifs.commands.json",
  pase: "command-catalog/pase.commands.json",
  network_tcpip: "command-catalog/tcpip-network.commands.json",
  ptf_license: "command-catalog/ptf-license.commands.json",
  source_pdm: "command-catalog/source-pdm.commands.json",
  sql_services: "command-catalog/sql-services.commands.json",
  mission_lab: "command-catalog/lab-native.commands.json",
  range: "command-catalog/lab-native.commands.json",
  backup_restore: "command-catalog/lab-native.commands.json",
};

const IBM74_ROOT = join(process.cwd(), "data", "ibm74-reference", "commands");

type Ibm74CommandRef = {
  helpText?: string;
  wrkOptions?: Record<string, string>;
  parameters?: Array<{ name: string; label?: string }>;
  examples?: string[];
};

function loadIbm74Reference(command: string): Ibm74CommandRef | undefined {
  const path = join(IBM74_ROOT, `${command}.json`);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Ibm74CommandRef;
  } catch {
    return undefined;
  }
}

function catalogSource(category: string): string {
  return CATEGORY_SOURCE[category] ?? "command-catalog";
}

function formatParameters(params: CatalogCommandParameter[] | undefined): IbmCommandParameterRef[] {
  return (params ?? [])
    .filter((param) => param.name)
    .map((param) => ({
      name: param.name,
      label: param.label,
      helpText: param.helpText,
    }));
}

function resolveSummary(catalogHelp: string | undefined, ibm74Help: string | undefined): string | undefined {
  if (catalogHelp && !isThinHelpText(catalogHelp)) return catalogHelp.trim();
  if (ibm74Help?.trim()) return ibm74Help.trim();
  return undefined;
}

export function lookupCommandReference(commandName: string): IbmCommandReference | undefined {
  const command = commandName.trim().toUpperCase();
  if (!command) return undefined;

  const catalog = getCatalogCommand(command);
  const ibm74 = loadIbm74Reference(command);
  const summary = resolveSummary(catalog?.helpText, ibm74?.helpText);
  if (!summary) return undefined;

  const parameters = formatParameters(catalog?.parameters);
  const ibm74Params = (ibm74?.parameters ?? []).map((param) => ({
    name: param.name,
    label: param.label,
  }));

  return {
    command,
    displayName: catalog?.displayName,
    summary,
    parameters: parameters.length ? parameters : ibm74Params,
    examples: catalog?.examples ?? ibm74?.examples,
    wrkOptions: ibm74?.wrkOptions,
    source: catalog ? catalogSource(catalog.category) : "ibm74-reference/commands",
  };
}

export function lookupCommandReferences(commands: string[]): IbmCommandReference[] {
  const seen = new Set<string>();
  const refs: IbmCommandReference[] = [];
  for (const name of commands) {
    const normalized = name.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    const ref = lookupCommandReference(normalized);
    if (ref) {
      seen.add(normalized);
      refs.push(ref);
    }
  }
  return refs;
}

export function formatCommandContextLine(
  command: string,
  reference?: IbmCommandReference,
): string | undefined {
  if (!reference) return undefined;
  const label = reference.displayName ? `${command} — ${reference.displayName}` : command;
  return `${label}: ${reference.summary}`;
}

export function buildPracticeHint(options: {
  screenId?: string;
  articleId?: string;
  articleTitle?: string;
  frameworkRefs?: string[];
  commands?: string[];
  ibmReference?: IbmCommandReference;
}): string | undefined {
  const screen = options.screenId?.trim().toUpperCase();
  const articleTitle = options.articleTitle?.trim();
  const framework = options.frameworkRefs?.[0];
  const command = options.commands?.[0] ?? options.ibmReference?.command;

  if (options.articleId && screen) {
    const pack = getArticlePack(options.articleId);
    const step = pack?.steps.find((row) => row.screenHint?.toUpperCase() === screen);
    if (step?.watchFor?.[0] && articleTitle) {
      return `${step.watchFor[0]} — ${step.title} on ${screen} matches "${articleTitle}".`;
    }
    if (step?.excerptRefs?.[0] && articleTitle) {
      return `On ${screen}, ${step.excerptRefs[0]} — run ${step.command ?? command ?? "the article command"} here.`;
    }
  }

  if (screen) {
    const insight = AUDITOR_INSIGHTS[screen as ScreenId];
    if (insight?.suggestedNext && (framework || articleTitle)) {
      const anchor = framework ?? articleTitle;
      return `${insight.suggestedNext} — ${anchor} ties this screen to the article narrative.`;
    }
  }

  if (screen && options.ibmReference?.summary && articleTitle) {
    const mechanism = options.ibmReference.summary.split(".")[0]?.trim();
    if (mechanism) {
      const clause = framework ? ` (${framework})` : "";
      return `On ${screen}, ${mechanism} — practice step from "${articleTitle}"${clause}.`;
    }
  }

  return undefined;
}
