export type LabRuntimeConfig = {
  demoMode: boolean;
  resetOnStart: boolean;
  defaultScenario: string;
  showQuickstart: boolean;
  deterministicTimestamps: boolean;
};

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw.toLowerCase() === "true" || raw === "1";
}

export function loadLabRuntimeConfig(): LabRuntimeConfig {
  return {
    demoMode: envFlag("LCL_DEMO_MODE"),
    resetOnStart: envFlag("LCL_RESET_ON_START"),
    defaultScenario: process.env.LCL_DEFAULT_SCENARIO ?? process.env.SCENARIO_ID ?? "claims400",
    showQuickstart: envFlag("LCL_SHOW_QUICKSTART", true),
    deterministicTimestamps: envFlag("LCL_DETERMINISTIC_TIMESTAMPS"),
  };
}
