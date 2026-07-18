import fs from "node:fs";
import path from "node:path";
import { wrkOptionsFor } from "./referenceService.js";

export type Ibm74ScreenSpec = {
  screenId: string;
  category?: string;
  auditMode?: "catalog" | "deep";
  requiredFields: string[];
  bannedSubstrings: string[];
};

const specsDir = path.join(process.cwd(), "data", "ibm74-reference", "screens");
let specCache: Map<string, Ibm74ScreenSpec> | null = null;

export function loadScreenSpec(commandName: string): Ibm74ScreenSpec | undefined {
  if (!specCache) {
    specCache = new Map();
    if (fs.existsSync(specsDir)) {
      for (const file of fs.readdirSync(specsDir).filter((f) => f.endsWith(".spec.json"))) {
        const spec = JSON.parse(fs.readFileSync(path.join(specsDir, file), "utf8")) as Ibm74ScreenSpec;
        specCache.set(spec.screenId.toUpperCase(), spec);
      }
    }
  }
  return specCache.get(commandName.toUpperCase());
}

export function workOptionHintFromMatrix(wrkName: string, category: string): string {
  const options = wrkOptionsFor(wrkName);
  const parts: string[] = [];
  for (const [opt, target] of Object.entries(options).sort(([a], [b]) => Number(a) - Number(b))) {
    const verb =
      opt === "2"
        ? "Change"
        : opt === "4"
          ? "Delete"
          : opt === "5"
            ? "Display"
            : opt === "6"
              ? "Display alt"
              : opt === "7"
                ? "Description"
                : opt === "8"
                  ? "Authority"
                  : "Action";
    parts.push(`${opt}=${verb}`);
  }
  if (parts.length > 0) return `  ${parts.join("   ")}`;
  return workOptionHintFallback(category);
}

function workOptionHintFallback(category: string): string {
  switch (category) {
    case "library_object":
      return "  2=Change   5=Display   7=Description";
    case "job_batch":
      return "  2=Change   4=End   5=Display   6=Job log";
    case "user_profile":
      return "  2=Change   5=Display   8=Authority";
    case "spool_print":
      return "  2=Change   4=Delete   5=Display   6=Release";
    case "message_queue":
      return "  2=Change   4=Remove   5=Display";
    case "system_value":
      return "  2=Change   5=Display";
    case "authority":
      return "  2=Grant   5=Display   8=Authority";
    case "network_tcpip":
      return "  2=Change   5=Display";
    case "database_file":
      return "  2=Change   5=Display";
    default:
      return "  2=Change   5=Display";
  }
}

export function clearScreenSpecCache(): void {
  specCache = null;
}
