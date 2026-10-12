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
