import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type ControlMapping = {
  id: string;
  title: string;
  framework: string;
  family?: string;
  description?: string;
  evidenceTypes?: string[];
  relatedCommands?: string[];
  relatedFindings?: string[];
};

type AtlasControl = {
  controlId: string;
  title: string;
  framework: string;
  family?: string;
  description?: string;
  evidenceTypes?: string[];
  relatedCommands?: string[];
  relatedFindings?: string[];
};

type LegacyControl = {
  id: string;
  title: string;
  framework: string;
};

let cachedControls: ControlMapping[] | undefined;

function normalizeAtlasControl(control: AtlasControl): ControlMapping {
  return {
    id: control.controlId,
    title: control.title,
    framework: control.framework,
    family: control.family,
    description: control.description,
    evidenceTypes: control.evidenceTypes,
    relatedCommands: control.relatedCommands,
    relatedFindings: control.relatedFindings,
  };
}

function loadAtlasControls(): ControlMapping[] {
  const controlsDir = join(process.cwd(), "data", "controls");
  if (!existsSync(controlsDir)) return [];

  const controls: ControlMapping[] = [];
  for (const file of readdirSync(controlsDir).filter((name) => name.endsWith(".json"))) {
    const entries = JSON.parse(readFileSync(join(controlsDir, file), "utf8")) as AtlasControl[];
    controls.push(...entries.map(normalizeAtlasControl));
  }
  return controls;
}

function loadLegacyControls(): ControlMapping[] {
  const path = join(process.cwd(), "data", "control-mapping", "controls.json");
  if (!existsSync(path)) return [];
  return (JSON.parse(readFileSync(path, "utf8")) as LegacyControl[]).map((entry) => ({
    id: entry.id,
    title: entry.title,
    framework: entry.framework,
  }));
}

export function loadControlMappings(): ControlMapping[] {
  if (cachedControls) return cachedControls;

  const merged = new Map<string, ControlMapping>();
  for (const control of [...loadLegacyControls(), ...loadAtlasControls()]) {
    merged.set(control.id.toUpperCase(), control);
  }
  cachedControls = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
  return cachedControls;
}

export function findControlById(controlId: string): ControlMapping | undefined {
  return loadControlMappings().find((entry) => entry.id === controlId.toUpperCase());
}
