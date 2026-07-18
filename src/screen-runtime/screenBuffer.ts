import type { ScreenField } from "./screen.js";
import { IBM_5250_ATTR, resolve5250Attribute } from "./ibm5250Attributes.js";
import { formatSubfileOptionValue, isSubfileOptionField } from "./screens/screenHelpers.js";

export type BufferCell = {
  char: string;
  fieldId?: string;
  attribute: number;
};

export class ScreenBuffer {
  readonly rows: number;
  readonly cols: number;
  private cells: BufferCell[];

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.cells = Array.from({ length: rows * cols }, () => ({
      char: " ",
      attribute: IBM_5250_ATTR.GREEN,
    }));
  }

  clear(): void {
    for (const cell of this.cells) {
      cell.char = " ";
      cell.fieldId = undefined;
      cell.attribute = IBM_5250_ATTR.GREEN;
    }
  }

  putText(row: number, col: number, text: string, attribute: number = IBM_5250_ATTR.GREEN): void {
    for (let i = 0; i < text.length; i++) {
      const idx = this.index(row, col + i);
      if (idx >= 0 && idx < this.cells.length) {
        this.cells[idx].char = text[i] ?? " ";
        this.cells[idx].attribute = attribute;
        this.cells[idx].fieldId = undefined;
      }
    }
  }

  putField(field: ScreenField, value?: string): void {
    const attribute = fieldAttribute(field);
    const raw = value ?? field.value ?? "";
    const text = isSubfileOptionField(field)
      ? formatSubfileOptionValue(field.length, raw)
      : raw.padEnd(field.length, " ").slice(0, field.length);
    const isInput =
      !field.protected ||
      field.type === "input" ||
      field.type === "password" ||
      field.type === "command";

    if (isInput) {
      const attrIdx = this.index(field.row, field.col);
      if (attrIdx >= 0 && attrIdx < this.cells.length) {
        this.cells[attrIdx].char = " ";
        this.cells[attrIdx].attribute = attribute;
        this.cells[attrIdx].fieldId = field.id;
      }
      for (let i = 0; i < field.length; i++) {
        const idx = this.index(field.row, field.col + 1 + i);
        if (idx >= 0 && idx < this.cells.length) {
          this.cells[idx].char = text[i] ?? " ";
          this.cells[idx].attribute = attribute;
          this.cells[idx].fieldId = field.id;
        }
      }
      return;
    }

    for (let i = 0; i < field.length; i++) {
      const idx = this.index(field.row, field.col + i);
      if (idx >= 0 && idx < this.cells.length) {
        this.cells[idx].char = text[i] ?? " ";
        this.cells[idx].attribute = attribute;
        this.cells[idx].fieldId = field.id;
      }
    }
  }

  bufferAddress(row: number, col: number): number {
    return (row - 1) * this.cols + col;
  }

  addressToPosition(address: number): { row: number; col: number } {
    const zeroBased = address - 1;
    return {
      row: Math.floor(zeroBased / this.cols) + 1,
      col: (zeroBased % this.cols) + 1,
    };
  }

  getFieldIdAtAddress(address: number): string | undefined {
    const { row, col } = this.addressToPosition(address);
    const idx = this.index(row, col);
    return idx >= 0 ? this.cells[idx].fieldId : undefined;
  }

  getCell(row: number, col: number): BufferCell | undefined {
    const idx = this.index(row, col);
    return idx >= 0 ? this.cells[idx] : undefined;
  }

  getCells(): BufferCell[] {
    return this.cells;
  }

  private index(row: number, col: number): number {
    if (row < 1 || col < 1 || row > this.rows || col > this.cols) {
      return -1;
    }
    return (row - 1) * this.cols + (col - 1);
  }
}

export function fieldAttribute(field: ScreenField): number {
  return resolve5250Attribute(field);
}
