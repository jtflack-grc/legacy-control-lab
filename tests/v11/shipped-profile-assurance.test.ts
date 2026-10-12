import { afterEach, describe, expect, it } from "vitest";
import { closeDatabase, initTestDatabase } from "../../src/db/sqlite.js";
import {
  analyzeDefaultPasswords,
  analyzeShippedProfiles,
} from "../../src/ibmi-runtime/securityAnalysisService.js";
import {
  changeUserProfile,
  deleteUserProfile,
  getUserProfile,
} from "../../src/ibmi-runtime/userProfileService.js";

afterEach(() => closeDatabase());

describe("LCL 1.1 shipped-profile assurance", () => {
  it("distinguishes configured-interactive and provenance findings from compliant supplied profiles", () => {
    initTestDatabase();

    const findings = analyzeShippedProfiles("CLAIMS400");
    const names = findings.map((finding) => finding.userName);

    expect(names).toContain("QSYSOPR");
    expect(names).toContain("QCLMSADM");
    expect(names).not.toContain("QSYS");
    expect(names).not.toContain("QUSER");
    expect(names).not.toContain("QSRV");
    expect(names).not.toContain("QTMHHTTP");

    expect(findings.find((finding) => finding.userName === "QSYSOPR")?.finding)
      .toMatch(/interactive password/i);
    expect(findings.find((finding) => finding.userName === "QCLMSADM")?.finding)
      .toMatch(/declared IBM-supplied baseline/i);
  });

  it("treats PASSWORD(*NONE) as noninteractive state rather than a default-password defect", () => {
    initTestDatabase();

    expect(getUserProfile("QSYSOPR", "CLAIMS400")?.passwordSet).toBe(true);
    expect(changeUserProfile("CLAIMS400", "QSYSOPR", { password: null })).toEqual({ ok: true });
    expect(getUserProfile("QSYSOPR", "CLAIMS400")?.passwordSet).toBe(false);

    const shipped = analyzeShippedProfiles("CLAIMS400");
    expect(shipped.some((finding) => finding.userName === "QSYSOPR")).toBe(false);

    const defaults = analyzeDefaultPasswords("CLAIMS400");
    expect(defaults.some((finding) => finding.userName === "QSYSOPR")).toBe(false);
  });

  it("removes the provenance finding only when the unexpected Q-prefixed identity is removed", () => {
    initTestDatabase();

    expect(analyzeShippedProfiles("CLAIMS400").some((finding) => finding.userName === "QCLMSADM")).toBe(true);
    expect(deleteUserProfile("CLAIMS400", "QCLMSADM")).toEqual({ ok: true });
    expect(analyzeShippedProfiles("CLAIMS400").some((finding) => finding.userName === "QCLMSADM")).toBe(false);
  });

  it("never exposes a password through the profile summary used by assurance surfaces", () => {
    initTestDatabase();

    const profile = getUserProfile("QSYSOPR", "CLAIMS400");
    expect(profile?.passwordSet).toBe(true);
    expect(profile && "password" in profile).toBe(false);
  });
});
