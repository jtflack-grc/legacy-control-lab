export type QshellSessionState = {
  cwd: string;
  env: Record<string, string>;
  lines: string[];
  scrollOffset: number;
};

export type QshellExecResult = {
  lines: string[];
  exitCode: number;
};
