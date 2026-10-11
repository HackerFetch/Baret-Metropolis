import { hub } from "@baret/content";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SignBlock } from "./SignBlock.js";
import { IDLE } from "./useSendFlow.js";

/** Hale's 🐛 P1 (2026-10-10): with the Baret extension connected, the page said the request skips Baret's check. */
const props = {
  flow: IDLE,
  labels: ["Approve", "Swap"],
  need: null,
  switching: "idle" as const,
  onConnect: () => undefined,
  onSwitch: () => undefined,
  token: { symbol: "dUSDC", decimals: 6 },
  outcome: [],
  onSign: () => undefined,
};

describe("SignBlock", () => {
  it("says an ordinary wallet gets the request with no Baret check", () => {
    render(<SignBlock {...props} walletName="MetaMask" />);
    expect(screen.getByText(hub.frame.sign.note)).toBeTruthy();
  });

  it("never says so when the wallet is the Baret extension", () => {
    render(<SignBlock {...props} walletName={hub.frame.wallet.extension.name} checks />);
    expect(screen.getByText(hub.frame.sign.noteChecked)).toBeTruthy();
    expect(screen.queryByText(hub.frame.sign.note)).toBeNull();
  });
});
