/**
 * The setup, walked end to end the way a reader would: the new-account path
 * through all eight steps, the restore path that skips the key and the
 * backup, and a setup opened again after a browser restart, with the wallet
 * locked. Each step's heading takes the focus when it arrives. Clicks on
 * outside links are stopped before the test document follows them.
 */

import { common, extOnboarding } from "@baret/content";
import { locked } from "@baret/content/extension/popup/locked.content";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type JSX, useEffect, useMemo, useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Gate, GateContext } from "../../../../data/gate.js";
import {
  ExtensionProvider,
  type ExtState,
  initialState,
  type LiveSource,
  useExtension,
} from "../../../../data/store.js";
import { Component } from "../OnboardingPage.js";
import { SAMPLE_PHRASE } from "./words.js";

const { welcome, restore, passphrase, keys, backup, fund, smartWallet, policy, done } =
  extOnboarding;

function stopOutsideLinks(event: MouseEvent): void {
  if (event.target instanceof Element && event.target.closest("a[target=_blank]")) {
    event.preventDefault();
  }
}

function setup(): void {
  const router = createMemoryRouter([{ path: "*", element: <Component /> }], {
    initialEntries: ["/onboarding"],
  });
  render(
    <ExtensionProvider start={{ scenario: "empty" }}>
      <RouterProvider router={router} />
    </ExtensionProvider>,
  );
}

function heading(): HTMLElement {
  return screen.getByRole("heading", { level: 1 });
}

function press(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function setPassphrase(): void {
  type(passphrase.fields.passphrase.label, "a sentence only I would write");
  type(passphrase.fields.confirm.label, "a sentence only I would write");
  press(passphrase.action.label);
}

beforeEach(() => document.addEventListener("click", stopOutsideLinks, true));
afterEach(() => {
  document.removeEventListener("click", stopOutsideLinks, true);
  cleanup();
  vi.useRealTimers();
});

describe("setup, a new account", () => {
  it("walks all eight steps", () => {
    vi.useFakeTimers();
    setup();
    expect(heading().textContent).toContain(welcome.title);
    press(welcome.action.label);

    expect(heading().textContent).toContain(passphrase.title);
    expect(document.activeElement).toBe(heading());
    press(passphrase.action.label);
    expect(screen.getByText(passphrase.errors.tooShort)).toBeTruthy();
    type(passphrase.fields.passphrase.label, "password1234");
    press(passphrase.action.label);
    expect(screen.getByText(passphrase.errors.common)).toBeTruthy();
    expect(screen.getByText(passphrase.errors.mismatch)).toBeTruthy();
    setPassphrase();

    expect(heading().textContent).toContain(keys.title);
    act(() => vi.advanceTimersByTime(2500));
    expect(heading().textContent).toContain(keys.done.title);
    press(keys.action.label);

    expect(heading().textContent).toContain(backup.title);
    expect(screen.queryByText(SAMPLE_PHRASE[0])).toBeNull();
    press(backup.reveal.label);
    expect(screen.getByText(SAMPLE_PHRASE[0])).toBeTruthy();
    const next = screen.getByRole("button", { name: backup.action.label });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(backup.confirm.label));
    type("Word 3", "wrong");
    fireEvent.blur(screen.getByLabelText("Word 3"));
    expect(screen.getByText("That is not word 3. Check your paper and try again.")).toBeTruthy();
    type("Word 3", " Lumber ");
    type("Word 9", "bridge");
    expect(screen.getByText(backup.verify.success)).toBeTruthy();
    expect((next as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(next);

    expect(heading().textContent).toContain(fund.title);
    const onward = screen.getByRole("button", { name: fund.next.label });
    expect((onward as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(fund.minimum)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: fund.action.label }));
    expect(screen.getByText(fund.waiting)).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("40.00 MON arrived.")).toBeTruthy();
    // Funded: the minimum is met, so the note about it goes.
    expect(screen.queryByText(fund.minimum)).toBeNull();
    fireEvent.click(onward);

    expect(heading().textContent).toContain(smartWallet.title);
    const ready = screen.getByRole("button", { name: smartWallet.action.label });
    expect((ready as HTMLButtonElement).disabled).toBe(true);
    act(() => vi.advanceTimersByTime(1800));
    expect((ready as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(ready);

    expect(heading().textContent).toContain(policy.title);
    press(policy.action.label);

    expect(heading().textContent).toContain(done.title);
    expect(document.activeElement).toBe(heading());
    expect(screen.getByRole("link", { name: done.action.label }).getAttribute("href")).toBe("/");
  });
});

describe("setup, going back", () => {
  it("returns from the passphrase to the welcome, and the welcome has no Back", () => {
    setup();
    expect(screen.queryByRole("button", { name: common.actions.back })).toBeNull();
    press(welcome.action.label);
    expect(heading().textContent).toContain(passphrase.title);
    press(common.actions.back);
    expect(heading().textContent).toContain(welcome.title);
    expect(screen.queryByRole("button", { name: common.actions.back })).toBeNull();
  });

  it("offers no Back while the key is being made", () => {
    setup();
    press(welcome.action.label);
    setPassphrase();
    expect(heading().textContent).toContain(keys.title);
    expect(screen.queryByRole("button", { name: common.actions.back })).toBeNull();
  });
});

describe("setup, a restored account", () => {
  it("checks the phrase, then skips the key and the backup", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: welcome.restore.label }));
    expect(heading().textContent).toContain(restore.title);

    const field = screen.getByLabelText(restore.field.label);
    fireEvent.change(field, { target: { value: "crane tunnel" } });
    press(restore.action.label);
    expect(await screen.findByText("That is 2 words. A recovery phrase has twelve.")).toBeTruthy();

    fireEvent.change(field, { target: { value: SAMPLE_PHRASE.join(" ") } });
    press(restore.action.label);
    expect(await screen.findByText(restore.errors.invalid)).toBeTruthy();

    fireEvent.change(field, { target: { value: `${"abandon ".repeat(11)}about` } });
    press(restore.action.label);
    expect(await screen.findByRole("heading", { level: 1, name: passphrase.title })).toBeTruthy();

    setPassphrase();
    expect(heading().textContent).toContain(fund.title);
  });
});

/** The passphrase of the stand-in keystore below. */
const SECRET = "a sentence only I would write";
const ADDRESS = "0x1111111111111111111111111111111111111111";

/**
 * A live wallet made before a browser restart: the keystore is locked, the
 * stored balance is zero (the page reads it from Monad only while the wallet
 * is open) and the address holds 0.5 MON. `backedUp` is what setup recorded.
 */
function lockedWallet(backedUp: boolean): LiveSource {
  const empty = initialState({ scenario: "empty" });
  const initial: ExtState = {
    ...empty,
    scenario: "live",
    accounts: [{ id: "main", name: "Account 1", address: ADDRESS, balance: "0" }],
    active: "main",
    settings: { ...empty.settings, backedUp },
  };
  return {
    initial,
    save: () => {},
    subscribe: () => () => {},
    unlock: async (passphrase) => passphrase === SECRET,
    reach: async () => true,
    derive: async () => null,
    revoke: async () => ({ closed: [], stopped: [] }),
  };
}

/** The live page's gate, in small: locked until the passphrase opens it, then the balance is read. */
function Gated({ children }: { children: JSX.Element }): JSX.Element {
  const { dispatch } = useExtension();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    dispatch({
      type: "patch",
      patch: { accounts: [{ id: "main", name: "Account 1", address: ADDRESS, balance: "0.5" }] },
    });
  }, [open, dispatch]);
  const gate = useMemo<Gate>(
    () => ({
      exists: true,
      locked: !open,
      lockReason: "restart",
      lock: () => setOpen(false),
      opened: () => setOpen(true),
      wipe: () => {},
      create: async () => ({ error: "A wallet already exists." }),
      phrase: async () => (open ? [...SAMPLE_PHRASE] : null),
      reveal: async () => null,
      rekey: async () => false,
      checkAccount: async () => true,
    }),
    [open],
  );
  return <GateContext value={gate}>{children}</GateContext>;
}

function resume(backedUp: boolean): void {
  const router = createMemoryRouter([{ path: "*", element: <Component /> }], {
    initialEntries: ["/onboarding"],
  });
  render(
    <ExtensionProvider start={{ scenario: "live" }} live={lockedWallet(backedUp)}>
      <Gated>
        <RouterProvider router={router} />
      </Gated>
    </ExtensionProvider>,
  );
}

async function openWallet(): Promise<void> {
  expect(await screen.findByRole("heading", { level: 1, name: locked.title })).toBeTruthy();
  expect(screen.getByText(locked.reason.restart)).toBeTruthy();
  fireEvent.change(screen.getByLabelText(locked.field.label), { target: { value: SECRET } });
  press(locked.action.label);
}

describe("setup, opened again after a browser restart", () => {
  it("asks for the passphrase before funds, then reads the balance and opens Continue", async () => {
    resume(true);
    expect(heading().textContent).toContain(extOnboarding.exists.title);
    expect(document.body.textContent).toContain(extOnboarding.exists.body);
    press(extOnboarding.exists.actions.finish);

    await openWallet();
    expect(await screen.findByRole("heading", { level: 1, name: fund.title })).toBeTruthy();
    expect(await screen.findByText("This account already holds 0.50 MON.")).toBeTruthy();
    expect(screen.getByText("0.50 MON")).toBeTruthy();
    const onward = screen.getByRole("button", { name: fund.next.label });
    expect((onward as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(fund.minimum)).toBeNull();
  });

  it("goes back to the backup it never confirmed and shows the words again", async () => {
    resume(false);
    expect(heading().textContent).toContain(extOnboarding.exists.title);
    expect(document.body.textContent).toContain(extOnboarding.exists.backupBody);
    press(extOnboarding.exists.actions.finish);

    await openWallet();
    expect(await screen.findByRole("heading", { level: 1, name: backup.title })).toBeTruthy();
    press(backup.reveal.label);
    expect(await screen.findByText(SAMPLE_PHRASE[0])).toBeTruthy();
  });

  it("keeps the step shut on a wrong passphrase", async () => {
    resume(true);
    press(extOnboarding.exists.actions.finish);
    expect(await screen.findByRole("heading", { level: 1, name: locked.title })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(locked.field.label), {
      target: { value: "not the passphrase" },
    });
    press(locked.action.label);
    expect(await screen.findByText(locked.errors.wrong.title)).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: fund.title })).toBeNull();
  });
});
