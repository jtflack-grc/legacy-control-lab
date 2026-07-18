/** Resolve listen bind address. Defaults to loopback for local-only safety. */
export function resolveBindHost(envName: string, fallback = "127.0.0.1"): string {
  const raw = process.env[envName]?.trim();
  return raw || fallback;
}
