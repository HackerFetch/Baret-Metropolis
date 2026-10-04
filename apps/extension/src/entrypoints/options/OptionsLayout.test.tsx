/**
 * The forgot-passphrase reset on the options page. The store lives only in
 * memory, so the reload must carry the empty wallet in its URL: if it kept
 * the old sample, the reader would land back in a full wallet, unlocked.
 */

import { extFrame } from "@baret/content/extension/frame.content";
import { locked } from "@baret/content/extension/popup/locked.content";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtensionProvider } from "../../data/store.js";
import { Component, resetHref } from "./OptionsLayout.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("resetHref", () => {
  it("reloads to an empty wallet on restore", () => {
    expect(resetHref("/options.html", true)).toBe(
      "/options.html?sample=empty&restore=1#/onboarding",
    );
  });

  it("keeps the offline preview", () => {
    expect(resetHref("/options.html", false)).toBe(
      "/options.html?sample=empty&offline=1&restore=1#/onboarding",
    );
  });
});

describe("forgot passphrase", () => {
  it("navigates to the empty wallet, never the sample it started from", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/options.html",
      assign,
    } as Location);
    const router = createMemoryRouter(
      [{ path: "/", element: <Component />, children: [{ index: true, element: null }] }],
      { initialEntries: ["/"] },
    );
    render(
      <ExtensionProvider start={{ scenario: "full" }}>
        <RouterProvider router={router} />
      </ExtensionProvider>,
    );

    const [lock] = screen.getAllByRole("button", { name: extFrame.lock.label });
    if (!lock) throw new Error("no lock button");
    fireEvent.click(lock);
    fireEvent.click(await screen.findByRole("button", { name: locked.forgot.label }));
    fireEvent.click(await screen.findByRole("button", { name: locked.forgot.reset.label }));

    expect(assign).toHaveBeenCalledTimes(1);
    const href = String(assign.mock.calls[0]?.[0]);
    expect(href).toContain("sample=empty");
    expect(href).toContain("restore=1");
  });
});
