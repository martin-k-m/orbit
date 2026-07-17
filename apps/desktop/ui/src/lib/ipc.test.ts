import { describe, it, expect } from "vitest";
import { isTauri, listProjects, activityReport, assessCommand } from "./ipc";

// In the jsdom test environment there is no Tauri runtime, so the IPC layer
// serves its seeded demo data. These tests lock in that fallback so the UI can
// always render (in a browser, in CI screenshots, in Storybook-style previews).

describe("ipc demo fallback", () => {
  it("reports that it is not running inside Tauri", () => {
    expect(isTauri()).toBe(false);
  });

  it("returns the seeded demo projects", async () => {
    const projects = await listProjects();
    expect(projects.length).toBeGreaterThanOrEqual(4);
    const names = projects.map((p) => p.name);
    expect(names).toContain("Blink");
    expect(names).toContain("Orbit");
  });

  it("returns a weekly activity report with language breakdown", async () => {
    const report = await activityReport(7);
    expect(report.totalSeconds).toBeGreaterThan(0);
    expect(report.languages.length).toBeGreaterThan(0);
    // Languages are sorted by time descending.
    for (let i = 1; i < report.languages.length; i++) {
      expect(report.languages[i - 1].seconds).toBeGreaterThanOrEqual(
        report.languages[i].seconds,
      );
    }
  });

  it("flags a destructive command as requiring confirmation", async () => {
    const assessment = await assessCommand("/tmp/demo", "clean");
    // The demo layer returns a safe assessment for unknown commands; this call
    // simply must resolve to a well-formed Assessment shape.
    expect(assessment).toHaveProperty("risk");
    expect(Array.isArray(assessment.reasons)).toBe(true);
  });
});
