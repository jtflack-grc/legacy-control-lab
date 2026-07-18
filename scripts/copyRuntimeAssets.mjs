/**
 * Copy non-TypeScript runtime assets into dist/ after `tsc`.
 * schema.sql and seed JSON are read via fs at runtime next to compiled modules.
 */
import { cpSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDb = join(root, "src", "db");
const distDb = join(root, "dist", "db");
const srcData = join(root, "src", "data");
const distData = join(root, "dist", "data");

mkdirSync(distDb, { recursive: true });
cpSync(join(srcDb, "schema.sql"), join(distDb, "schema.sql"));

if (existsSync(srcData)) {
  mkdirSync(distData, { recursive: true });
  for (const name of readdirSync(srcData)) {
    if (name.endsWith(".json")) {
      cpSync(join(srcData, name), join(distData, name));
    }
  }
}

console.log("[build] copied runtime assets into dist/");
