import { describe, expect, it } from "vitest";
import {
  estimateDurationSec,
  formatDuration,
  formatMinutes,
  formatRelativeDate,
} from "@/lib/format";

describe("formatDuration", () => {
  it("formats m:ss and h:mm:ss", () => {
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3723)).toBe("1:02:03");
  });
});

describe("formatMinutes", () => {
  it("rounds to whole minutes with a floor of 1", () => {
    expect(formatMinutes(20)).toBe("1 דק׳");
    expect(formatMinutes(370)).toBe("6 דק׳");
    expect(formatMinutes(null)).toBe("");
  });
});

describe("estimateDurationSec", () => {
  it("uses 150 words per minute", () => {
    const words = Array.from({ length: 300 }, () => "מילה").join(" ");
    expect(estimateDurationSec(words)).toBe(120);
  });
});

describe("formatRelativeDate", () => {
  it("says היום for same day and counts days back", () => {
    const now = new Date("2026-09-13T12:00:00Z").getTime();
    expect(formatRelativeDate("2026-09-13T08:00:00Z", now)).toBe("היום");
    expect(formatRelativeDate("2026-09-10T12:00:00Z", now)).toContain("3");
  });
});
