import { sign } from "@baret/content";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoldButton } from "./HoldButton.js";

/** The hold is the only way past Blocked, so every way of losing it must sign
 *  nothing (fail-closed). Fake timers stand in for the 1.5 s hold. */

const HOLD_MS = 1500;

function setup(): { onHeld: ReturnType<typeof vi.fn>; button: HTMLElement } {
  const onHeld = vi.fn();
  render(<HoldButton onHeld={onHeld} />);
  const button = screen.getByRole("button");
  return { onHeld, button };
}

function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("HoldButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("signs after a full keyboard hold", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    expect(button.textContent).toContain(sign.override.holding);
    advance(HOLD_MS);
    expect(onHeld).toHaveBeenCalledTimes(1);
  });

  it("signs after a full pointer hold", () => {
    const { onHeld, button } = setup();
    fireEvent.pointerDown(button);
    advance(HOLD_MS);
    expect(onHeld).toHaveBeenCalledTimes(1);
  });

  it("signs nothing on an early release and says so", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: "Enter" });
    advance(200);
    fireEvent.keyUp(button, { key: "Enter" });
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(sign.override.released);
  });

  it("does nothing on a plain click", () => {
    const { onHeld, button } = setup();
    fireEvent.click(button);
    advance(HOLD_MS * 2);
    expect(onHeld).not.toHaveBeenCalled();
  });

  it("cancels when focus leaves the button mid-hold", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    advance(200);
    fireEvent.blur(button);
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe(sign.override.released);
  });

  it("cancels when the hold key is released somewhere else", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    advance(200);
    fireEvent.keyUp(document.body, { key: " " });
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
  });

  it("keeps holding when a different key is released elsewhere", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(document.body, { key: "Shift" });
    advance(HOLD_MS);
    expect(onHeld).toHaveBeenCalledTimes(1);
  });

  it("cancels when the window loses focus", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    advance(200);
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
  });

  it("cancels when the tab is hidden", () => {
    const { onHeld, button } = setup();
    fireEvent.keyDown(button, { key: " " });
    advance(200);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    visibility.mockRestore();
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
  });

  it("cancels on pointer cancel and on pointer leave", () => {
    const { onHeld, button } = setup();
    fireEvent.pointerDown(button);
    advance(200);
    fireEvent.pointerCancel(button);
    advance(HOLD_MS);
    fireEvent.pointerDown(button);
    advance(200);
    fireEvent.pointerLeave(button);
    advance(HOLD_MS);
    expect(onHeld).not.toHaveBeenCalled();
  });

  it("fills the bar with transform, not width", () => {
    const { button } = setup();
    const bar = button.querySelector<HTMLElement>("[data-hold-bar]");
    expect(bar?.style.transform).toBe("scaleX(0)");
    fireEvent.keyDown(button, { key: " " });
    expect(bar?.style.width).toBe("");
  });
});
