import { describe, it, expect } from "vitest";
import {
  relativeTime,
  formatBytes,
  formatDuration,
  formatHours,
  shortenPath,
} from "./format";

describe("relativeTime", () => {
  it("handles null/undefined", () => {
    expect(relativeTime(null)).toBe("never");
    expect(relativeTime(undefined)).toBe("never");
  });

  it("reports recent times as just now", () => {
    expect(relativeTime(Date.now())).toBe("just now");
  });

  it("accepts seconds and millisecond epochs", () => {
    const oneHourAgoSeconds = Math.floor(Date.now() / 1000) - 3600;
    expect(relativeTime(oneHourAgoSeconds)).toBe("1 hour ago");
    const twoHoursAgoMs = Date.now() - 2 * 3600 * 1000;
    expect(relativeTime(twoHoursAgoMs)).toBe("2 hours ago");
  });
});

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats ms, seconds and minutes", () => {
    expect(formatDuration(200)).toBe("200ms");
    expect(formatDuration(2000)).toBe("2.0s");
    expect(formatDuration(90_000)).toBe("1m 30s");
  });
});

describe("formatHours", () => {
  it("formats seconds into hours and minutes", () => {
    expect(formatHours(3600)).toBe("1h");
    expect(formatHours(1800)).toBe("30m");
    expect(formatHours(3600 + 1800)).toBe("1h 30m");
  });
});

describe("shortenPath", () => {
  it("leaves short paths untouched and truncates long ones", () => {
    expect(shortenPath("/a/b")).toBe("/a/b");
    const long = "/very/long/path/to/some/deeply/nested/project/folder";
    const short = shortenPath(long, 20);
    expect(short.length).toBeLessThanOrEqual(20);
    expect(short.startsWith("…")).toBe(true);
  });
});
