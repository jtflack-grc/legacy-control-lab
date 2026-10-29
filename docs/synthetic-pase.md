# Synthetic PASE file lab (original LCL implementation)

Legacy Control Lab has two intentionally different QShell modes:

- **synthetic (default):** A small original TypeScript interpreter. It does not spawn processes, execute scripts, load dynamic libraries, or access the host root filesystem.
- **host (developer-only):** Real POSIX shell passthrough. It requires loopback binding and **must not** be used to exercise intentionally vulnerable lessons.

In a normal lab session, enter QSH and use the synthetic commands. The filesystem is under the configured \`QOPENSYS_ROOT\` (the lab's partition mirror, normally \`data/qopensys\`), never the host's \`/etc\`, \`/bin\`, or \`/usr\`.

## Supported in synthetic mode

| Feature | Current coverage |
| --- | --- |
| Navigate | \`pwd\`, \`cd\`, \`ls\`, \`ls -l\` |
| Inspect | \`cat\`, \`which\`, \`id\`, \`echo\` |
| Make files | \`mkdir\`, \`mkdir -p\`, \`touch\`, \`echo text > file\`, \`echo text >> file\` |
| Change files | \`cp\`, \`mv\`, \`rm\` (regular files), \`chmod 000-777\` |
| Paths | \`/QOpenSys\`, \`/home\`, \`/tmp\`, user-relative paths, and \`~\` |
| Permissions | Owner and public read/write/traverse checks, with \`QSECOFR\` as privileged simulated profile |

### Try it

Sign on as \`AUDIT\`, open QSH, and run one command per line:

\`\`\`text
mkdir -p control-check
echo "access reviewed" > control-check/evidence.txt
ls -l control-check
cat control-check/evidence.txt
chmod 600 control-check/evidence.txt
cp control-check/evidence.txt control-check/evidence-copy.txt
mv control-check/evidence-copy.txt control-check/verified.txt
rm control-check/verified.txt
\`\`\`

Sign on with another lab profile and attempt to read \`/home/audit/control-check/evidence.txt\`. With mode \`600\`, it should be refused even if the operating system hosting the lab would permit access.

## Boundaries and limitations

- All filesystem paths are normalized into the designated lab mirror. Unsupported absolute paths, traversals out of that namespace, and symbolic links (including dangling links) are rejected.
- Privileges are **simulated**, not inherited from the OS account. A small private metadata file inside the mirror holds owner and permission state across lab restarts; it cannot be read or edited through this shell.
- Existing seeded content is owned by the synthetic security officer unless inside a user's home. Newly created content is owned by the signed-on profile. Group membership, POSIX ACLs, SUID/SGID, sticky bits and hard links are not modeled.
- Files are capped at 128 KiB. No binary data support, directory copying/removal, pipelines, general scripting, wildcard expansion, redirection of commands other than \`echo\`, or arbitrary executables yet.
- Quoted arguments and escaped spaces are supported. Shell metacharacters that have not been explicitly implemented must not be treated as real shell features.
- The host shell bridge and IBM i CL bridges remain separate. This module does not alter IBM i object-authority semantics.
- This is an educational simulator, not an IBM PASE emulator. The full command *catalog* contains far more commands than synthetic mode implements.

## Implementation and verification

The implementation is in \`src/ibmi-runtime/pase/qshellSynthetic.ts\`; tests are in \`tests/pase/qshellSynthetic.test.ts\`.

Run:

\`\`\`sh
npm ci
npm run build
npx vitest run tests/pase/qshellSynthetic.test.ts
\`\`\`

The tests exercise real operations on disposable temporary lab mirrors, including attempted symlink escapes and cross-user permission denials. They are run by the PR CI workflow.

Do not use real credentials or actual customer data in the training filesystem.
