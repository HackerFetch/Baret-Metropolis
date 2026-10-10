import { settings } from "@baret/content";
import { describe, expect, it } from "vitest";
import { sealedStatus } from "./sealedStatus.js";

const copy = settings.sealed;
const idle = { busy: false, outcome: null, action: null, state: "unknown" } as const;

describe("sealedStatus", () => {
  it("a failed save says the save may still land", () => {
    const line = sealedStatus({
      ...idle,
      outcome: { result: "failed" },
      action: "save",
      state: "current",
    });
    expect(line).toBe(copy.outcome.saveFailed);
  });

  it("a failed restore says nothing was changed", () => {
    const line = sealedStatus({ ...idle, outcome: { result: "failed" }, action: "restore" });
    expect(line).toBe(copy.outcome.failed);
  });

  it("a successful save fills the version", () => {
    const line = sealedStatus({
      ...idle,
      outcome: { result: "saved", version: "7" },
      action: "save",
      state: "current",
    });
    expect(line).toBe("Saved. Encrypted copy number 7 is on Monad.");
  });

  it("a successful restore fills the version", () => {
    const line = sealedStatus({
      ...idle,
      outcome: { result: "restored", version: "3" },
      action: "restore",
      state: "current",
    });
    expect(line).toContain("copy number 3");
  });

  it("empty and cancelled keep their lines", () => {
    expect(sealedStatus({ ...idle, outcome: { result: "empty" }, action: "restore" })).toBe(
      copy.outcome.empty,
    );
    expect(sealedStatus({ ...idle, outcome: { result: "cancelled" }, action: "save" })).toBe(
      copy.outcome.cancelled,
    );
  });

  it("state current gives the new line", () => {
    expect(sealedStatus({ ...idle, state: "current" })).toBe(
      "Nothing has changed here since your last save or restore.",
    );
  });

  it("a change since the outcome shows the changed line", () => {
    const line = sealedStatus({
      ...idle,
      outcome: { result: "failed" },
      action: "save",
      state: "changed",
    });
    expect(line).toBe(copy.state.changed);
  });

  it("unknown with no outcome shows the prompt", () => {
    expect(sealedStatus(idle)).toBe(copy.prompt);
  });

  it("busy wins over everything", () => {
    const line = sealedStatus({
      busy: true,
      outcome: { result: "failed" },
      action: "save",
      state: "changed",
    });
    expect(line).toBe(copy.busy);
  });
});
