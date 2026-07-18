export type QshMode = "synthetic" | "host" | "disabled";

export type QshBindHosts = {
  httpBindHost?: string;
  tn5250BindHost?: string;
  websockifyBindHost?: string;
};

/** True when the process listens only on loopback (not all interfaces). */
export function isLoopbackBindHost(host?: string): boolean {
  if (!host?.trim()) return false;
  const normalized = host.trim().toLowerCase();
  return normalized === "127.0.0.1" || normalized === "localhost" || normalized === "::1";
}

/** Default: synthetic POSIX (no host shell). Set LCL_QSH_MODE=host for local dev only. */
export function resolveQshMode(): QshMode {
  const raw = process.env.LCL_QSH_MODE?.trim().toLowerCase();
  if (raw === "host" || raw === "disabled" || raw === "synthetic") {
    return raw;
  }
  return "synthetic";
}

/**
 * Refuse host QSH unless HTTP, TN5250, and websockify bind to loopback only.
 * Downgrades to synthetic with a clear log when bindings are not loopback-safe.
 */
export function guardHostQshMode(bind: QshBindHosts = {}): QshMode {
  const requested = resolveQshMode();
  if (requested !== "host") return requested;

  const httpOk = isLoopbackBindHost(bind.httpBindHost);
  const tnOk = isLoopbackBindHost(bind.tn5250BindHost);
  const wsOk =
    bind.websockifyBindHost === undefined
      ? true
      : isLoopbackBindHost(bind.websockifyBindHost);
  if (httpOk && tnOk && wsOk) return "host";

  const httpHint = bind.httpBindHost?.trim() || "(all interfaces)";
  const tnHint = bind.tn5250BindHost?.trim() || "(all interfaces)";
  const wsHint =
    bind.websockifyBindHost === undefined
      ? "(not checked)"
      : bind.websockifyBindHost.trim() || "(all interfaces)";
  console.error(
    `[QSH] LCL_QSH_MODE=host refused: HTTP bind=${httpHint}, TN5250 bind=${tnHint}, websockify bind=${wsHint}. ` +
      "Set HTTP_BIND_HOST, TN5250_BIND_HOST, and WEBSOCKIFY_BIND_HOST to 127.0.0.1 for local dev. Using synthetic.",
  );
  process.env.LCL_QSH_MODE = "synthetic";
  return "synthetic";
}

export function qshModeLabel(mode: QshMode): string {
  switch (mode) {
    case "synthetic":
      return "synthetic (partition-local /qopensys mirror)";
    case "host":
      return "host shell (local dev — do not expose publicly)";
    case "disabled":
      return "disabled";
  }
}
