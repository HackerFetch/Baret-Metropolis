import { agents } from "@baret/content";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RegistryLookup } from "./RegistryLookup.js";

const { registry } = agents;
const HASH = "0xa1b9799281003c7a6d9113007540f31735033d6fba125fa20619395b16e359e8";
const CLEAR_ADDRESS = "0x1365566191bAA9872A64AcDce963751d5343ff49";

/** The live answer for the sample address, 2026-10-11. */
const listed = (reasonCode = "SCAMSNIFFER_BLACKLIST") => ({
  entry: {
    id: registry.sample,
    severity: 3,
    reasonCode,
    flaggedAt: 1791340079,
    block: 68851519,
    txHash: HASH,
  },
  history: [{ id: "68851519-18", kind: "flagged" }],
});

function serve(status: number, body: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchImpl);
  return fetchImpl;
}

const status = () => screen.getByRole("status");
const input = () => screen.getByLabelText(registry.label) as HTMLInputElement;

function lookUp(text: string) {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: registry.lookUp }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RegistryLookup", () => {
  it("starts with a labelled input, both actions and an empty status", () => {
    render(<RegistryLookup />);
    expect(screen.getByRole("heading", { name: registry.title })).toBeTruthy();
    expect(input().value).toBe("");
    expect(screen.getByRole("button", { name: registry.tryListed })).toBeTruthy();
    expect(status().textContent).toBe("");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("the listed sample names the reason, the severity and links its transaction", async () => {
    const fetchImpl = serve(200, listed());
    render(<RegistryLookup />);
    fireEvent.click(screen.getByRole("button", { name: registry.tryListed }));
    expect(input().value).toBe(registry.sample);
    await waitFor(() =>
      expect(status().textContent).toBe(
        `This address is on Baret's registry: ${registry.reasons.SCAMSNIFFER_BLACKLIST}. Severity 3 of 4, high.`,
      ),
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      `/api/v1/audit/reputation/${registry.sample}`,
      expect.anything(),
    );
    const link = screen.getByRole("link", { name: registry.view });
    expect(link.getAttribute("href")).toBe(`https://testnet.monadexplorer.com/tx/${HASH}`);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("an unknown reason code is written out in words, never as a raw code", async () => {
    serve(200, listed("DRAINER_KIT"));
    render(<RegistryLookup />);
    lookUp(registry.sample);
    await waitFor(() => expect(status().textContent).toContain("flagged for drainer kit"));
    expect(status().textContent).not.toContain("DRAINER_KIT");
  });

  it("the showcase's own entries (NovaSwap drainer, demo drainer, sink) read as sentences", () => {
    for (const code of ["NOVASWAP_LOOKALIKE_DRAINER", "DEMO_DRAINER", "DRAINER_SINK"]) {
      expect(Object.hasOwn(registry.reasons, code)).toBe(true);
    }
  });

  it("a clean address is not on the registry, and never called safe", async () => {
    serve(200, { entry: null, history: [] });
    render(<RegistryLookup />);
    lookUp(CLEAR_ADDRESS);
    await waitFor(() => expect(status().textContent).toBe(registry.clear));
    expect(status().textContent?.toLowerCase()).not.toContain("safe");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("an unanswered lookup is unavailable, never clear", async () => {
    serve(503, { entry: null, history: [] });
    render(<RegistryLookup />);
    lookUp(CLEAR_ADDRESS);
    await waitFor(() => expect(status().textContent).toBe(registry.unavailable));
    expect(status().textContent).not.toBe(registry.clear);
  });

  it("a bad body is unavailable", async () => {
    serve(200, { entry: { id: registry.sample }, history: [] });
    render(<RegistryLookup />);
    lookUp(registry.sample);
    await waitFor(() => expect(status().textContent).toBe(registry.unavailable));
  });

  it("a bad address says what an address looks like, without asking the API", async () => {
    const fetchImpl = serve(200, { entry: null, history: [] });
    render(<RegistryLookup />);
    lookUp("0x12");
    await waitFor(() => expect(status().textContent).toBe(registry.invalid));
    expect(input().getAttribute("aria-invalid")).toBe("true");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
