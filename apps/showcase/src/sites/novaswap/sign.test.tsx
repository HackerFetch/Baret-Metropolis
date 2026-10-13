import { hub, novaswap } from "@baret/content";
import { NOVASWAP } from "@baret/demo";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { type Address, parseEther } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askBaret } from "../kit/wallet/baretWindow.js";
import { BARET_KEY, type Engine, resetForTests } from "../kit/wallet/store.js";
import { NovaSwapSite } from "./NovaSwapSite.js";

/**
 * Live test 2026-10-14 (P1): with only the Baret web wallet connected,
 * NovaSwap's "Sign with your wallet" opened the picker and said "Connect a
 * wallet to sign". It now goes to the Baret wallet's window, like the other
 * sites (useSiteSign), on both versions.
 */

vi.mock("../kit/wallet/baretWindow.js", async (original) => ({
  ...(await original<typeof import("../kit/wallet/baretWindow.js")>()),
  // The window never answers here: the test reads what it was asked.
  askBaret: vi.fn(() => new Promise(() => undefined)),
}));

const WALLET: Address = "0x5aE13F1028144842f0384d09091067D6184F8197";

/** An engine with no injected wallet: 1 MON and no dUSDC on the Baret window's address. */
function noInjectedWallet(): void {
  const engine: Engine = {
    connect: async () => undefined,
    disconnect: async () => undefined,
    switchToMonad: async () => undefined,
    refreshBalance: async () => undefined,
    send: async () => {
      throw new Error("no injected wallet");
    },
    signTyped: async () => {
      throw new Error("no injected wallet");
    },
    confirm: async () => "success",
    balanceOf: async () => parseEther("1"),
    tokenBalance: async () => 0n,
  };
  resetForTests(async () => engine);
}

beforeEach(() => {
  localStorage.setItem(BARET_KEY, JSON.stringify({ address: WALLET }));
  noInjectedWallet();
  vi.mocked(askBaret).mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  resetForTests();
});

async function renderWithBaret(): Promise<void> {
  render(
    <MemoryRouter initialEntries={["/novaswap"]}>
      <NovaSwapSite />
    </MemoryRouter>,
  );
  // The Baret window's address comes back from storage after the first render.
  await waitFor(() => expect(screen.getByText(hub.frame.sign.noteBaret)).toBeTruthy());
}

describe("NovaSwap with only the Baret web wallet connected", () => {
  it("says the request is checked by Baret, never that it skips the check", async () => {
    await renderWithBaret();
    expect(screen.queryByText(hub.frame.sign.note)).toBeNull();
  });

  it("sends the honest swap to the Baret wallet's window", async () => {
    await renderWithBaret();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: hub.frame.sign.action }));
    });
    expect(screen.queryByText(hub.frame.sign.needs.wallet)).toBeNull();
    expect(askBaret).toHaveBeenCalledWith(
      "sign",
      expect.objectContaining({ to: NOVASWAP.router, value: parseEther("0.02").toString() }),
    );
  });

  it("sends the attack's approval there too, with no dUSDC needed first", async () => {
    await renderWithBaret();
    const attack = screen.getAllByRole("radio", {
      name: new RegExp(novaswap.analysis.modes.danger.label, "i"),
    })[0];
    if (!attack) throw new Error("no attack switch");
    await act(async () => {
      fireEvent.click(attack);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: hub.frame.sign.action }));
    });
    expect(screen.queryByText(novaswap.sign.empty)).toBeNull();
    expect(askBaret).toHaveBeenCalledWith(
      "sign",
      expect.objectContaining({ to: NOVASWAP.usdc, value: "0" }),
    );
  });
});
