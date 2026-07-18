import "dotenv/config";
import { closeDatabase } from "../db/sqlite.js";
import { runTrainer, formatTrainerReport } from "./trainer.js";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const json = args.includes("--json");
const strictCoverage = args.includes("--strict-coverage") || args.includes("--strict");
const groupArg = args.find((arg) => arg.startsWith("--group="));
const groups = groupArg?.slice("--group=".length).split(",").filter(Boolean);

const report = runTrainer({ groups });

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatTrainerReport(report, verbose));
}

closeDatabase();

const probeFailures = report.summary.fail + report.summary.error;
const coverageFailures = strictCoverage ? report.coverage.unprobedCommands.length : 0;
process.exit(probeFailures + coverageFailures > 0 ? 1 : 0);
