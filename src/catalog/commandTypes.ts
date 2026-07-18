export type CommandImplementationLevel =
  | "unknown"
  | "cataloged"
  | "promptable"
  | "display_implemented"
  | "stateful_implemented"
  | "lab_native";

export type CommandStatus =
  | "implemented"
  | "stubbed"
  | "cataloged"
  | "not_supported"
  | "out_of_scope"
  | "deprecated";

export type CommandParameterType =
  | "char"
  | "name"
  | "genericName"
  | "qualifiedName"
  | "libraryName"
  | "objectName"
  | "objectType"
  | "userProfile"
  | "systemValue"
  | "authority"
  | "sqlStatement"
  | "ifsPath"
  | "freeText";

export type CatalogCommandParameter = {
  name: string;
  label?: string;
  type: CommandParameterType | string;
  required?: boolean;
  default?: string;
  defaultValue?: string;
  supportsSpecialValues?: string[];
  allowedValues?: string[];
  promptable?: boolean;
  helpText?: string;
};

export type CatalogCommandDefinition = {
  name: string;
  displayName: string;
  shortDescription?: string;
  category: string;
  groupMenu?: string;
  status: CommandStatus;
  implementationLevel?: CommandImplementationLevel;
  handler?: string;
  aliases?: string[];
  promptable?: boolean;
  allowLimitedUser?: boolean;
  requiresAuthority?: string[];
  mutatesState?: boolean;
  parameters?: CatalogCommandParameter[];
  helpText?: string;
  secondLevelHelp?: string;
  examples?: string[];
  relatedCommands?: string[];
  realismLimits?: string;
};

export function resolveImplementationLevel(entry: CatalogCommandDefinition): CommandImplementationLevel {
  if (entry.implementationLevel) return entry.implementationLevel;
  if (entry.category === "mission_lab" || entry.category === "range") return "lab_native";
  if (entry.status === "implemented" && entry.mutatesState) return "stateful_implemented";
  if (entry.status === "implemented") return "display_implemented";
  if (entry.promptable || (entry.parameters?.length ?? 0) > 0) return "promptable";
  if (entry.status === "cataloged" || entry.status === "stubbed") return "cataloged";
  return "unknown";
}

export function isPromptableCommand(entry: CatalogCommandDefinition): boolean {
  if (entry.promptable === false) return false;
  if (entry.promptable === true) return true;
  if (entry.status === "cataloged" || entry.status === "stubbed") return true;
  return (entry.parameters?.length ?? 0) > 0 || entry.status === "implemented";
}
