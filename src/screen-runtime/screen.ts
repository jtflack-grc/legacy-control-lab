import type { GrcArticleLink } from "../grc/iOnGrcArticles.js";

export type ScreenFieldType = "output" | "input" | "password" | "command";

export type ScreenField = {
  id: string;
  row: number;
  col: number;
  length: number;
  type: ScreenFieldType;
  protected: boolean;
  value?: string;
  intensity?: "normal" | "high";
  color?: "green" | "white" | "red" | "turquoise" | "yellow" | "pink" | "blue";
  nonDisplay?: boolean;
  address?: number;
  /** Subfile option column (underlined ___ entry). */
  option?: boolean;
  /** When true, terminal does not force uppercase (QSH / PASE shell input). */
  preserveCase?: boolean;
};

export type ScreenFunctionKey = {
  key: string;
  label: string;
  action: string;
};

export type ScreenDefinition = {
  id: ScreenId;
  title?: string;
  rows: number;
  cols: number;
  commandLine?: boolean;
  messageLine?: string;
  fields: ScreenField[];
  functionKeys?: ScreenFunctionKey[];
  /** When set, lab coach shows a clickable i on GRC article link. */
  helpArticle?: GrcArticleLink;
};

/** Screen id — known lab screens plus any catalog command name (e.g. WRKLIB, DSPMSGD). */
export type ScreenId = string;
