import { describe, expect, it } from "vitest";
import { sessionTime } from "./session.js";

describe("sessionTime", () => {
  it("shows hours and minutes in the reader's own time", () => {
    const iso = "2026-10-09T14:32:00Z";
    const expected = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
    expect(sessionTime(iso)).toBe(expected);
    expect(sessionTime(iso)).toMatch(/\d{2}.\d{2}/);
  });
});
