import fs from "node:fs";
import path from "node:path";

export type Ibm74ReferenceParam = {
  name: string;
  label?: string;
  required?: boolean;
  type?: string;
  supportsSpecialValues?: string[];
};

export type Ibm74CommandReference = {
  name: string;
  displayName?: string;
  category?: string;
  ibm74Topic?: string;
  parameters?: Ibm74ReferenceParam[];
  examples?: string[];
  helpText?: string;
  requiresAuthority?: string[];
  mutatesState?: boolean;
  groupMenu?: string;
  wrkOptions?: Record<string, string>;
};

type Conventions = {
  byParameterName: Record<string, string[]>;
  wrkCommandTargets: Record<string, Record<string, string>>;
};

const root = process.cwd();
const refDir = path.join(root, "data", "ibm74-reference", "commands");
const conventionsPath = path.join(root, "data", "ibm74-reference", "parameter-conventions.json");
const wrkMatrixPath = path.join(root, "data", "ibm74-reference", "wrk-option-matrix.json");
const navigationGraphPath = path.join(root, "data", "screen-specs", "navigation-graph.json");

type NavigationGraphFile = {
  screens?: Record<string, { options?: Record<string, string> }>;
};

let cache: Map<string, Ibm74CommandReference> | null = null;
let conventions: Conventions | null = null;
let wrkMatrix: Record<string, Record<string, string>> | null = null;
let navigationGraph: NavigationGraphFile | null = null;

function loadConventions(): Conventions {
  if (!conventions) {
    conventions = JSON.parse(fs.readFileSync(conventionsPath, "utf8")) as Conventions;
  }
  return conventions;
}

export function loadWrkOptionMatrix(): Record<string, Record<string, string>> {
  if (!wrkMatrix) {
    wrkMatrix = fs.existsSync(wrkMatrixPath)
      ? (JSON.parse(fs.readFileSync(wrkMatrixPath, "utf8")) as Record<string, Record<string, string>>)
      : {};
  }
  return wrkMatrix;
}

export function loadNavigationGraph(): NavigationGraphFile {
  if (!navigationGraph) {
    navigationGraph = fs.existsSync(navigationGraphPath)
      ? (JSON.parse(fs.readFileSync(navigationGraphPath, "utf8")) as NavigationGraphFile)
      : {};
  }
  return navigationGraph;
}

export function specialValuesForParameter(paramName: string, paramType?: string): string[] {
  const conv = loadConventions();
  const byName = conv.byParameterName[paramName.toUpperCase()] ?? [];
  if (byName.length > 0) return [...byName];
  if (paramType === "authorityName") return conv.byParameterName.AUT ?? [];
  if (paramType === "profileStatus") return conv.byParameterName.STATUS ?? [];
  if (paramType === "qualifiedName") return ["*LIBL", "*CURLIB"];
  return [];
}

export function loadAllCommandReferences(): Map<string, Ibm74CommandReference> {
  if (cache) return cache;
  cache = new Map();
  if (!fs.existsSync(refDir)) return cache;
  for (const file of fs.readdirSync(refDir).filter((f) => f.endsWith(".json"))) {
    const ref = JSON.parse(fs.readFileSync(path.join(refDir, file), "utf8")) as Ibm74CommandReference;
    cache.set(ref.name, ref);
  }
  return cache;
}

export function getCommandReference(commandName: string): Ibm74CommandReference | undefined {
  return loadAllCommandReferences().get(commandName.toUpperCase());
}

export function referenceParameters(commandName: string): Ibm74ReferenceParam[] {
  return getCommandReference(commandName)?.parameters ?? [];
}

export function wrkOptionsFor(commandName: string): Record<string, string> {
  const matrix = loadWrkOptionMatrix();
  const graphOptions = loadNavigationGraph().screens?.[commandName]?.options ?? {};
  const matrixOptions =
    matrix[commandName] ?? matrix[`${commandName}_default`] ?? loadConventions().wrkCommandTargets[commandName] ?? {};
  return { ...matrixOptions, ...graphOptions };
}

export function inferWrkTargetCommand(wrkName: string, option: string): string | undefined {
  return wrkOptionsFor(wrkName)[option];
}

export function clearReferenceCache(): void {
  cache = null;
  conventions = null;
  wrkMatrix = null;
  navigationGraph = null;
}
