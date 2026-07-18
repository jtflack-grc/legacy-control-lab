/**
 * Pre-public-release scan: local machine paths, accidental secrets, and internal-only artifacts.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();

const scanRoots = [
  "README.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "package.json",
  "public",
  "docs",
  "src",
  "scripts",
  "data",
  "launch",
  ".env.example",
  "docker-compose.yml",
  "Dockerfile",
];

const skipDir = new Set(["node_modules", "dist", "coverage", ".vitest", "vendor"]);
const skipFile = (rel: string): boolean =>
  rel.includes(`${path.sep}node_modules${path.sep}`) ||
  rel.includes(`${path.sep}dist${path.sep}`) ||
  rel.endsWith("checkReleaseHygiene.ts") ||
  /\\Users\\[^\\]+\\/.test(rel) ||
  /\/Users\/[^/]+\//.test(rel);

const leakPatterns: Array<{ label: string; regex: RegExp }> = [
  { label: "Windows user profile path", regex: /[A-Za-z]:\\Users\\[^\\\r\n]+/g },
  { label: "macOS home path", regex: /\/Users\/[A-Za-z0-9._-]+\//g },
  { label: "Linux home path", regex: /\/home\/[A-Za-z0-9._-]+\/(?:Desktop|Documents|Projects)\//g },
  { label: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { label: "Private key block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { label: "GitHub PAT", regex: /ghp_[A-Za-z0-9]{20,}/g },
  { label: "OpenAI-style API key", regex: /sk-[A-Za-z0-9]{20,}/g },
];

const allowedPasswordContexts = new Set([
  "TRAIN",
  "IONGRC",
  "PASSWORD",
  "password:",
  "defaultPassword",
  "laneCredentials",
  "signOn",
  "Sign on",
  "sign-on",
  "training",
  "QSECOFR",
  "AUDIT",
  "DEMO",
  "APCLERK",
  "LABPWD01",
  "AUDIT01",
  "CLERK01",
  "DEMO01",
]);

function looksLikeTrainingPasswordLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (allowedPasswordContexts.has(line.trim())) return true;
  for (const token of allowedPasswordContexts) {
    if (lower.includes(token.toLowerCase())) return true;
  }
  return /password\s*[:=]\s*['"]?(TRAIN|IONGRC|LABPWD|AUDIT01|CLERK01|DEMO01)/i.test(line);
}

const suspiciousPassword = /password\s*[:=]\s*['"]([^'"]+)['"]/gi;

const internalOnlyFiles = [
  "A ChatGPT assessment . . ..txt",
  "ibm-i-phase8.md",
];

const runtimeDataDirs = ["data/security-saves"];

function gitTracks(relPath: string): boolean {
  try {
    execSync(`git ls-files --error-unmatch "${relPath.replace(/\\/g, "/")}"`, {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function collectFiles(rel: string): string[] {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return skipFile(rel) ? [] : [rel];
  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDir.has(entry.name)) continue;
    const child = path.join(rel, entry.name);
    if (skipFile(child)) continue;
    if (entry.isDirectory()) out.push(...collectFiles(child));
    else if (/\.(md|html|css|js|ts|json|yml|yaml|txt|example|env)$/.test(entry.name)) out.push(child);
  }
  return out;
}

let violations = 0;

for (const internal of internalOnlyFiles) {
  const abs = path.join(root, internal);
  if (fs.existsSync(abs)) {
    console.error(`[hygiene] ${internal}: internal planning artifact — remove or gitignore before public release`);
    violations += 1;
  }
}

if (fs.existsSync(path.join(root, ".env"))) {
  console.error("[hygiene] .env exists locally (gitignored) — do not commit it");
}

for (const runtimeDir of runtimeDataDirs) {
  const abs = path.join(root, runtimeDir);
  if (!fs.existsSync(abs)) continue;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const rel = path.join(runtimeDir, entry.name).replace(/\\/g, "/");
    if (rel.includes(".gitkeep")) continue;
    if (gitTracks(rel)) {
      console.error(`[hygiene] ${rel}: tracked runtime snapshot — remove from git index`);
      violations += 1;
    }
  }
}

for (const rel of scanRoots) {
  for (const file of collectFiles(rel)) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    const lines = content.split(/\r?\n/);

    for (const { label, regex } of leakPatterns) {
      regex.lastIndex = 0;
      const match = regex.exec(content);
      if (match) {
        console.error(`[hygiene] ${file}: ${label} (${match[0].slice(0, 60)}…)`);
        violations += 1;
      }
      regex.lastIndex = 0;
    }

    for (const line of lines) {
      suspiciousPassword.lastIndex = 0;
      let pwdMatch: RegExpExecArray | null;
      while ((pwdMatch = suspiciousPassword.exec(line))) {
        const value = pwdMatch[1] ?? "";
        if (!looksLikeTrainingPasswordLine(line) && !/^(TRAIN|IONGRC|\*+)$/.test(value)) {
          console.error(`[hygiene] ${file}: unexpected password literal "${value}"`);
          violations += 1;
        }
      }
    }

    if (file.endsWith("manifest.json") && content.includes("sourcePath")) {
      try {
        const manifest = JSON.parse(content) as { sourcePath?: string };
        const src = manifest.sourcePath ?? "";
        if (/^[A-Za-z]:\\/.test(src) || src.includes("\\Users\\") || src.startsWith("/Users/")) {
          console.error(`[hygiene] ${file}: sourcePath must be repo-relative, not a local absolute path`);
          violations += 1;
        }
      } catch {
        // invalid json caught elsewhere
      }
    }
  }
}

if (violations > 0) {
  console.error(`\nRelease hygiene check failed with ${violations} issue(s).`);
  process.exit(1);
}

console.log("Release hygiene check passed.");
