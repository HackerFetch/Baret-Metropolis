import { home } from "@baret/content";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AllChecks } from "./AllChecks.js";

const { allChecks, allChecksList, items } = home.marquee;

function mount(): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(
    <AllChecks summary={allChecks} listLabel={allChecksList} items={items} />,
  );
  return host;
}

describe("marquee: see all checks (H4)", () => {
  it("the number in the summary and the list label matches the checks", () => {
    const n = String(items.length);
    expect(allChecks).toContain(n);
    expect(allChecksList).toContain(n);
  });

  it("is a closed native disclosure that lists every check as static text", () => {
    const details = mount().querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
    expect(details?.querySelector("summary")?.textContent).toBe(allChecks);
    const list = details?.querySelector("ul");
    expect(list?.getAttribute("aria-label")).toBe(allChecksList);
    const texts = [...(list?.querySelectorAll("li") ?? [])].map((li) => li.textContent);
    expect(texts).toEqual([...items]);
  });
});
