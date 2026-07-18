import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { resolveScenarioPackDir } from "../scenario/loadScenarioPack.js";
import { validateScenarioPack } from "../scenario/validateScenario.js";

export type ScenarioPackManifest = {
  packFormat: "lclpack";
  version: string;
  scenarioId: string;
  systemName: string;
  packagedAt: string;
  sourcePath: string;
};

function resolvePackPath(packagePath: string): string {
  const resolved = packagePath.startsWith("/") || /^[A-Za-z]:/.test(packagePath)
    ? packagePath
    : join(process.cwd(), packagePath);
  if (existsSync(resolved)) return resolved;
  const withExt = resolved.endsWith(".lclpack") ? resolved : `${resolved}.lclpack`;
  if (existsSync(withExt)) return withExt;
  return resolved;
}

export function packageScenario(
  scenarioId: string,
  outputPath?: string,
): { ok: boolean; path: string; message: string } {
  const src = resolveScenarioPackDir(scenarioId);
  if (!existsSync(join(src, "scenario.json"))) {
    return { ok: false, path: "", message: `Scenario pack not found: ${scenarioId}` };
  }

  const manifest = JSON.parse(readFileSync(join(src, "scenario.json"), "utf8")) as {
    scenarioId?: string;
    systemName?: string;
  };
  const out =
    outputPath ??
    join(process.cwd(), "data", "packs", `${scenarioId}.lclpack`);

  if (existsSync(out)) {
    rmSync(out, { recursive: true, force: true });
  }
  mkdirSync(out, { recursive: true });

  cpSync(src, join(out, "scenario"), { recursive: true });

  const packManifest: ScenarioPackManifest = {
    packFormat: "lclpack",
    version: "1.0",
    scenarioId: manifest.scenarioId ?? scenarioId,
    systemName: manifest.systemName ?? scenarioId.toUpperCase(),
    packagedAt: new Date().toISOString(),
    sourcePath: `data/scenarios/${manifest.scenarioId ?? scenarioId}`,
  };
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(packManifest, null, 2)}\n`);
  writeFileSync(
    join(out, "README.md"),
    `# ${packManifest.systemName} scenario pack\n\nPackaged from Legacy Control Lab.\n`,
  );

  return { ok: true, path: out, message: `Scenario packaged to ${out}` };
}

export function importScenarioPack(
  packagePath: string,
  options?: { force?: boolean },
): { ok: boolean; scenarioId?: string; message: string } {
  const packRoot = resolvePackPath(packagePath);
  if (!existsSync(packRoot)) {
    return { ok: false, message: `Package not found: ${packagePath}` };
  }

  const manifestPath = join(packRoot, "manifest.json");
  if (!existsSync(manifestPath)) {
    return { ok: false, message: "Invalid .lclpack — missing manifest.json." };
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ScenarioPackManifest;
  const scenarioSrc = join(packRoot, "scenario");
  if (!existsSync(join(scenarioSrc, "scenario.json"))) {
    return { ok: false, message: "Invalid .lclpack — missing scenario/scenario.json." };
  }

  const dest = join(process.cwd(), "data", "scenarios", manifest.scenarioId);
  if (existsSync(dest) && !options?.force) {
    return {
      ok: false,
      message: `Scenario ${manifest.scenarioId} already exists. Use force to overwrite.`,
    };
  }

  const tempDir = join(process.cwd(), "data", "scenarios", `__import_${manifest.scenarioId}`);
  if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
  cpSync(scenarioSrc, tempDir, { recursive: true });

  const tempValidation = validateScenarioPack(`__import_${manifest.scenarioId}`);
  if (!tempValidation.ok && !options?.force) {
    rmSync(tempDir, { recursive: true, force: true });
    return {
      ok: false,
      message: `Import validation failed: ${tempValidation.errors.join("; ")}`,
    };
  }

  if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
  cpSync(tempDir, dest, { recursive: true });
  rmSync(tempDir, { recursive: true, force: true });

  return {
    ok: true,
    scenarioId: manifest.scenarioId,
    message: `Imported scenario ${manifest.scenarioId} from ${basename(packRoot)}`,
  };
}

export function listScenarioPacks(): Array<{ name: string; path: string; scenarioId?: string }> {
  const packsDir = join(process.cwd(), "data", "packs");
  if (!existsSync(packsDir)) return [];

  return readdirSync(packsDir)
    .map((name) => {
      const path = join(packsDir, name);
      if (!statSync(path).isDirectory()) return undefined;
      const manifestPath = join(path, "manifest.json");
      if (!existsSync(manifestPath)) return { name, path };
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ScenarioPackManifest;
      return { name, path, scenarioId: manifest.scenarioId };
    })
    .filter((entry): entry is { name: string; path: string; scenarioId?: string } => !!entry);
}
