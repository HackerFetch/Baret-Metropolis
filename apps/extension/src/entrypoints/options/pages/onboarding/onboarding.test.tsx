/**
 * The setup, walked end to end the way a reader would: the new-account path
 * through all eight steps, and the restore path that skips the key and the
 * backup. Each step's heading takes the focus when it arrives. Clicks on
 * outside links are stopped before the test document follows them.
 */

import { common, extOnboarding } from "@baret/content";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExtensionProvider } from "../../../../data/store.js";
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
    fireEvent.click(screen.getByRole("link", { name: fund.action.label }));
    expect(screen.getByText(fund.waiting)).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText("40.00 MON arrived.")).toBeTruthy();
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
