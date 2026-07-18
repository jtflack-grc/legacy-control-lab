import "dotenv/config";
import { closeDatabase, getDatabasePath, initDatabase, isDatabaseInitialized } from "./sqlite.js";
import { countCommands } from "./repositories/commandRepository.js";

const force = process.argv.includes("--force");

const db = initDatabase({ forceSeed: force });
const path = getDatabasePath();

console.log(`Database: ${path === ":memory:" ? ":memory:" : path}`);
console.log(`Scenario seeded: ${isDatabaseInitialized(db) ? "yes" : "no"}`);
console.log(
  `Profiles: ${(db.prepare("SELECT COUNT(*) AS c FROM user_profiles").get() as { c: number }).c}`,
);
console.log(
  `Objects: ${(db.prepare("SELECT COUNT(*) AS c FROM objects").get() as { c: number }).c}`,
);
console.log(`Commands: ${countCommands()}`);

closeDatabase();
