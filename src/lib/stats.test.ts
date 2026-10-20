import { describe, expect, it } from "vitest";
import { daysBetween, formatDuration, formatPercent, median, ratio } from "./stats";

describe("median", () => {
  it("handles empty, odd and even lists", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("ratio", () => {
  it("returns null when there's nothing to measure", () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(3, 4)).toBe(0.75);
  });
});

describe("formatting", () => {
  it("formats durations in hours under a day and days otherwise", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.01)).toBe("1 hour");
    expect(formatDuration(0.25)).toBe("6 hours");
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(2.46)).toBe("2.5 days");
  });

  it("formats percentages", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(0.666)).toBe("67%");
  });

  it("measures days between dates", () => {
    expect(daysBetween(new Date("2026-01-01"), new Date("2026-01-03T12:00:00Z"))).toBe(2.5);
  });
});
