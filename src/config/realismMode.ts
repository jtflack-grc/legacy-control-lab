export type RealismMode = "standard" | "dense";

export function getRealismMode(): RealismMode {
  const value = (process.env.LCL_REALISM_MODE ?? "standard").trim().toLowerCase();
  return value === "dense" ? "dense" : "standard";
}

export function isDenseRealismMode(): boolean {
  return getRealismMode() === "dense";
}
