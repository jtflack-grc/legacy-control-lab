import {
  getSystemValue as getSystemValueRow,
  listSystemValues as listSystemValueRows,
  updateSystemValue as updateSystemValueRow,
} from "../db/repositories/systemValueRepository.js";

export type SystemValueSummary = {
  name: string;
  value: string;
  category: string;
  description: string;
};

export function listSecuritySystemValues(systemName = "CLAIMS400"): SystemValueSummary[] {
  return listSystemValueRows(systemName);
}

export function getSystemValue(name: string, systemName = "CLAIMS400"): SystemValueSummary | undefined {
  return getSystemValueRow(systemName, name);
}

export function changeSystemValue(
  name: string,
  value: string,
  systemName = "CLAIMS400",
): { ok: true; summary: SystemValueSummary } | { ok: false; message: string } {
  const updated = updateSystemValueRow(systemName, name, value);
  if (!updated) {
    return { ok: false, message: `CPF1104 - System value ${name.trim().toUpperCase()} not found.` };
  }
  return { ok: true, summary: updated };
}
