import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getQOpenSysRoot } from "./qshellPaths.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const SEED_ROOT = join(moduleDir, "..", "..", "..", "data", "qopensys-seed");

function seedFile(root: string, relative: string, content: string): void {
  const target = join(root, relative);
  if (existsSync(target)) return;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}

function copySeedTree(): void {
  if (!existsSync(SEED_ROOT)) return;
  const root = getQOpenSysRoot();
  mkdirSync(root, { recursive: true });
  cpSync(SEED_ROOT, root, { recursive: true, force: false, errorOnExist: false });
}

/** Lay out /QOpenSys per IBM PASE redbook (rzalc) — idempotent. */
export function seedQOpenSysLayout(): void {
  const root = getQOpenSysRoot();
  mkdirSync(root, { recursive: true });

  copySeedTree();

  const dirs = [
    "usr/bin",
    "usr/sbin",
    "usr/lib/nls/msg/C/en_US",
    "QIBM/ProdData",
    "QIBM/UserData",
    "tmp",
    "claims",
    "home",
    ".pase",
  ];
  for (const dir of dirs) {
    mkdirSync(join(root, dir), { recursive: true });
  }

  seedFile(
    root,
    "README.txt",
    "QOpenSys — PASE root (Legacy Control Lab)\n" +
      "Shell utilities live in /qopensys/usr/bin (synthetic QSH or host bridge).\n" +
      "See IBM PASE for i shells and utilities (7.4 rzalf/rzalc).\n",
  );

  seedFile(
    root,
    "claims/readme.txt",
    "Claims400 synthetic stream files for PASE lab exercises.\n",
  );

  seedFile(
    root,
    "claims/payment_extract.csv",
    "CLAIM_ID,AMOUNT,STATUS\n10001,250.00,OPEN\n10002,89.50,PAID\n",
  );

  const catalogPath = join(root, "usr/lib/nls/msg/C/en_US", "claimsc400.msg");
  if (!existsSync(catalogPath)) {
    const messagesPath = join(process.cwd(), "data", "messages", "messages.json");
    if (existsSync(messagesPath)) {
      writeFileSync(catalogPath, readFileSync(messagesPath, "utf8"), "utf8");
    } else {
      writeFileSync(
        catalogPath,
        JSON.stringify(
          [
            { messageId: "CPF2204", shortText: "Object &1 not found." },
            { messageId: "CPC7301", shortText: "Library &1 created." },
          ],
          null,
          2,
        ),
        "utf8",
      );
    }
  }

  seedFile(
    root,
    "usr/bin/README.txt",
    "IBM i PASE utilities in /QOpenSys/usr/bin are handled by the lab QSH bridge.\n" +
      "POSIX tools (ls, cat, grep) run on the host shell; IBM i tools (system, getjobid,\n" +
      "setccsid, dspcat, dspmsg, attr, clrtmp) are emulated in the runtime.\n",
  );
}
