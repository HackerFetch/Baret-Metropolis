import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { afterEach, describe, expect, it } from "vitest";
import { render } from "./entry-server.js";
import { routeObjects } from "./router.js";

/**
 * The landing ships prerendered (scripts/prerender.mjs). These tests keep it
 * that way: a component that reads the browser while rendering either throws
 * here or makes hydration fall back to a full client render.
 */
describe("prerendered landing", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders without a browser, head tags left to the static head", async () => {
    const html = await render("/");
    expect(html.startsWith("<div")).toBe(true);
    expect(html).toContain("<h1");
    expect(html).toContain('id="main"');
    expect(html).not.toMatch(/<title/);
  });

  it("hydrates with no mismatch", async () => {
    const container = document.createElement("div");
    container.innerHTML = await render("/");
    document.body.append(container);
    const errors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <RouterProvider router={createBrowserRouter(routeObjects)} />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
  }, 30_000);
});
