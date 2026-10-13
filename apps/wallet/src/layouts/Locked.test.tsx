import { walletFrame } from "@baret/content";
import { fill } from "@baret/web-ui/lib/util";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Locked } from "./Locked.js";

const ORIGIN = "https://novaswap.example";

describe("the locked request window", () => {
  it("replaces the waiting line with the answer once the request is declined", () => {
    const onDecline = vi.fn();
    render(<Locked onUnlock={vi.fn()} request origin={ORIGIN} onDecline={onDecline} />);
    const waiting = fill(walletFrame.locked.requestFrom, { origin: ORIGIN });
    expect(screen.getByText(waiting)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: walletFrame.locked.decline }));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(waiting)).toBeNull();
    expect(screen.getByText(walletFrame.locked.declined)).toBeTruthy();
    expect(screen.queryByRole("button", { name: walletFrame.locked.decline })).toBeNull();
  });
});

describe("the request window on a device with no wallet", () => {
  it("leads with creating the wallet, not with a lock", () => {
    const onCreate = vi.fn();
    const onUnlock = vi.fn();
    render(
      <Locked
        onUnlock={onUnlock}
        onCreate={onCreate}
        request
        origin={ORIGIN}
        onDecline={vi.fn()}
      />,
    );
    const { locked } = walletFrame;
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(locked.fresh.title);
    expect(screen.queryByText(locked.title)).toBeNull();
    expect(screen.getByText(fill(locked.fresh.bodyFrom, { origin: ORIGIN }))).toBeTruthy();
    expect(screen.queryByRole("button", { name: locked.action })).toBeNull();
    const buttons = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttons).toEqual([locked.create, locked.fresh.existing, locked.decline]);
    fireEvent.click(screen.getByRole("button", { name: locked.create }));
    fireEvent.click(screen.getByRole("button", { name: locked.fresh.existing }));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("keeps the locked wording when the device has an account", () => {
    render(<Locked onUnlock={vi.fn()} request origin={ORIGIN} onDecline={vi.fn()} />);
    const { locked } = walletFrame;
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(locked.title);
    expect(screen.getByRole("button", { name: locked.action })).toBeTruthy();
    expect(screen.queryByRole("button", { name: locked.create })).toBeNull();
  });
});
