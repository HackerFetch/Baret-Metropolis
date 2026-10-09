import { explain, sign } from "@baret/content";
import { clearExplainCache } from "@baret/web-ui/lib/explain";
import { fill } from "@baret/web-ui/lib/util";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SIGN_REQUESTS } from "../data/sample.js";
import type { SignRequest as Request } from "../data/types.js";
import { SignRequest } from "./SignRequest.js";

/** The live seam: what a surface's answers and signer can and cannot make
 *  the screen do. Fail-closed throughout: nothing expired or already sent can
 *  be signed again. */

function sample(id: Request["id"]): Request {
  const request = SIGN_REQUESTS.find((r) => r.id === id);
  if (!request) throw new Error(`no sample ${id}`);
  return request;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const SEND = sign.verdict.safe.primary;

/** The screen's own status region, the first child of the request. */
function spoken(): HTMLElement {
  const node = document.querySelector<HTMLElement>("article > p[role='status']");
  if (!node) throw new Error("no status region");
  return node;
}

describe("SignRequest, the live answer", () => {
  it("takes the answer's shorter expiry: an expired answer cannot be signed", () => {
    const onLog = vi.fn();
    const context = { ...sample("safe"), expires: 300 };
    const { rerender } = render(<SignRequest request={context} pending onLog={onLog} />);
    rerender(<SignRequest request={{ ...context, expires: 0 }} pending={false} onLog={onLog} />);
    expect(screen.getByText(sign.result.expired.title)).toBeTruthy();
    expect(screen.queryByRole("button", { name: SEND })).toBeNull();
    expect(onLog).toHaveBeenCalledWith(expect.objectContaining({ kind: expect.anything() }));
  });

  it("keeps the request's own window when the answer allows longer", () => {
    const context = { ...sample("safe"), expires: 120 };
    const { rerender } = render(<SignRequest request={context} pending onLog={vi.fn()} />);
    rerender(
      <SignRequest request={{ ...context, expires: 300 }} pending={false} onLog={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: SEND })).toBeTruthy();
    expect(screen.getByText(/120/)).toBeTruthy();
  });
});

describe("SignRequest, signing", () => {
  it("moves focus to the status and speaks each step", async () => {
    const run = deferred<{ hash: string; block: string }>();
    let sending: () => void = () => {};
    const onSign = vi.fn((_outcome: string, go: () => void) => {
      sending = go;
      return run.promise;
    });
    render(
      <SignRequest request={sample("safe")} pending={false} onSign={onSign} onLog={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    const status = spoken();
    await waitFor(() => expect(status.textContent).toBe(sign.status.signing));
    expect(document.activeElement?.textContent).toBe(sign.status.signing);
    act(() => sending());
    await waitFor(() => expect(status.textContent).toBe(sign.status.sending));
    expect(document.activeElement?.textContent).toBe(sign.status.sending);
    await act(async () => {
      run.resolve({ hash: "0xabc", block: "42" });
    });
    // The result focuses its title; the status region does not repeat it.
    expect(document.activeElement?.textContent).toBe(sign.result.sent.title);
    expect(status.textContent).not.toBe(sign.result.sent.title);
  });

  it("goes back to the decision when signing fails before it leaves", async () => {
    const onSign = vi.fn(() => Promise.reject(new Error("refused")));
    render(
      <SignRequest request={sample("safe")} pending={false} onSign={onSign} onLog={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(spoken().textContent).toBe(sign.status.failed));
    expect(screen.getByRole("button", { name: SEND })).toBeTruthy();
  });

  it("never offers a second send once the transaction has left", async () => {
    const run = deferred<{ hash: string; block: string }>();
    const onSign = vi.fn((_outcome: string, go: () => void) => {
      go();
      return run.promise;
    });
    const onLog = vi.fn();
    render(<SignRequest request={sample("safe")} pending={false} onSign={onSign} onLog={onLog} />);
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(spoken().textContent).toBe(sign.status.sending));
    await act(async () => {
      run.reject(new Error("receipt timed out"));
    });
    expect(screen.queryByRole("button", { name: SEND })).toBeNull();
    expect(screen.getAllByText(sign.status.sending).length).toBeGreaterThan(0);
    expect(onSign).toHaveBeenCalledTimes(1);
    expect(onLog).not.toHaveBeenCalled();
  });
});

describe("SignRequest, Check again", () => {
  it("shows a new request from the surface over the earlier fresh answer", async () => {
    const onCheckAgain = vi.fn(() => Promise.resolve(sample("safe")));
    const { rerender } = render(
      <SignRequest
        request={sample("unreachable")}
        pending={false}
        onCheckAgain={onCheckAgain}
        onLog={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: sign.verdict.unreachable.primary }));
    await waitFor(() => expect(screen.getByRole("button", { name: SEND })).toBeTruthy());
    rerender(
      <SignRequest
        request={sample("blocked")}
        pending={false}
        onCheckAgain={onCheckAgain}
        onLog={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: SEND })).toBeNull();
    expect(screen.getByRole("button", { name: sign.verdict.blocked.secondary })).toBeTruthy();
  });
});

/** Fake time, one second at a time, rendering between: each timer is set after a render. */
async function tick(seconds: number): Promise<void> {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  }
}

describe("SignRequest, live only", () => {
  it("links the sent transaction on the explorer", async () => {
    const onSign = vi.fn((_outcome: string, go: () => void) => {
      go();
      return Promise.resolve({ hash: "0xabc", block: "42" });
    });
    render(
      <SignRequest
        request={sample("safe")}
        pending={false}
        onSign={onSign}
        onLog={vi.fn()}
        explorer={(hash) => `https://explorer.test/tx/${hash}`}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    const link = await screen.findByRole("link", { name: sign.result.sent.action.label });
    expect(link.getAttribute("href")).toBe("https://explorer.test/tx/0xabc");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("shows no explorer link on the sample, which has no hash", async () => {
    vi.useFakeTimers();
    try {
      render(
        <SignRequest
          request={sample("safe")}
          pending={false}
          onLog={vi.fn()}
          explorer={(hash) => `https://explorer.test/tx/${hash}`}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: SEND }));
      await tick(4);
      expect(screen.getByText(sign.result.sent.title)).toBeTruthy();
      expect(screen.queryByRole("link", { name: sign.result.sent.action.label })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers no override on a block when canOverride is false, only Decline and the rules", () => {
    render(
      <SignRequest
        request={sample("blocked")}
        pending={false}
        onLog={vi.fn()}
        canOverride={false}
        editRules={(label, className) => (
          <a href="/policies" className={className}>
            {label}
          </a>
        )}
      />,
    );
    expect(screen.queryByRole("button", { name: sign.verdict.blocked.secondary })).toBeNull();
    expect(screen.getByRole("button", { name: sign.verdict.blocked.primary })).toBeTruthy();
    expect(screen.getByText(sign.verdict.blocked.noOverride)).toBeTruthy();
    expect(screen.getByRole("link", { name: sign.verdict.blocked.editRule })).toBeTruthy();
  });

  it("goes stale instead of Expired when the answer runs out, and checks again", async () => {
    vi.useFakeTimers();
    try {
      const onLog = vi.fn();
      const onCheckAgain = vi.fn(() => Promise.resolve({ ...sample("safe"), expires: 30 }));
      render(
        <SignRequest
          request={{ ...sample("safe"), expires: 2 }}
          pending={false}
          onCheckAgain={onCheckAgain}
          onLog={onLog}
        />,
      );
      expect(
        screen.getByText(fill(sign.countdown.fresh, { seconds: "2" }), { exact: false }),
      ).toBeTruthy();
      await tick(3);
      // Focus moves to why the decision is gone.
      expect(document.activeElement?.textContent).toBe(sign.stale.title);
      expect(screen.queryByText(sign.result.expired.title)).toBeNull();
      expect(screen.queryByRole("button", { name: SEND })).toBeNull();
      expect(onLog).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: sign.stale.action }));
      });
      expect(onCheckAgain).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: SEND })).toBeTruthy();
      // Fresh again: focus is back on the request, not lost with the stale panel.
      expect(document.activeElement?.tagName).toBe("H1");
      // A fresh 30 seconds: the countdown line is hidden until the last 10.
      expect(screen.queryByText(/This check is good for/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("can still be declined once stale, while Baret does not answer", async () => {
    vi.useFakeTimers();
    try {
      const onDecline = vi.fn();
      render(
        <SignRequest
          request={{ ...sample("safe"), expires: 1 }}
          pending={false}
          onCheckAgain={() => new Promise(() => undefined)}
          onDecline={onDecline}
          onLog={vi.fn()}
        />,
      );
      await tick(2);
      expect(document.activeElement?.textContent).toBe(sign.stale.title);
      fireEvent.click(screen.getByRole("button", { name: sign.verdict.safe.secondary }));
      expect(onDecline).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lists only the sources that answered, and words the unreachable ones", () => {
    render(
      <SignRequest
        request={{
          ...sample("safe"),
          sources: [
            { name: "alchemy", status: "ok" },
            { name: "nansen", status: "unavailable" },
            { name: "reputation-registry", status: "ok" },
            { name: "cleanverse", status: "skipped" },
          ],
        }}
        pending={false}
        onLog={vi.fn()}
      />,
    );
    const { live, unavailable, sources } = sign.verdict.checkedBy;
    expect(screen.getByText(live.registry)).toBeTruthy();
    expect(screen.getByText(fill(unavailable, { source: live.nansen }))).toBeTruthy();
    expect(screen.queryByText(live.cleanverse)).toBeNull();
    expect(screen.queryByText(sources.compliance)).toBeNull();
  });

  it("keeps the passkey step until the surface moves on, and words a cancelled passkey", async () => {
    const run = deferred<{ hash: string; block: string }>();
    let progress: (step: "signing" | "sending") => void = () => {};
    const onSign = vi.fn(
      (_outcome: string, _go: () => void, next: (step: "signing" | "sending") => void) => {
        progress = next;
        return run.promise;
      },
    );
    render(
      <SignRequest
        request={sample("safe")}
        pending={false}
        passkey
        onSign={onSign}
        onLog={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(spoken().textContent).toBe(sign.status.passkey));
    expect(onSign).toHaveBeenCalledTimes(1);
    act(() => progress("signing"));
    await waitFor(() => expect(spoken().textContent).toBe(sign.status.signing));
    expect(onSign).toHaveBeenCalledTimes(1);
  });

  it("goes back to the decision when the passkey is not given", async () => {
    const onSign = vi.fn(() => Promise.reject(new Error("the passkey was not given")));
    render(
      <SignRequest
        request={sample("safe")}
        pending={false}
        passkey
        onSign={onSign}
        onLog={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: SEND }));
    await waitFor(() => expect(spoken().textContent).toBe(sign.status.passkeyCancelled));
    expect(screen.getByRole("button", { name: SEND })).toBeTruthy();
  });
});

describe("SignRequest, in plain words", () => {
  afterEach(() => {
    clearExplainCache();
    vi.unstubAllGlobals();
  });

  it("shows KIMI's explanation under the findings for a checked live request", async () => {
    vi.stubGlobal("navigator", { ...navigator, language: "en-US" });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            decision: "safe",
            explanation: {
              headline: "The spender is new",
              summary: "It was deployed today.",
              points: [],
              advice: "Lower the amount.",
            },
            language: "en",
            model: { provider: "kimi", name: "kimi-k2" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <SignRequest request={sample("safe")} pending={false} explainId="req-1" onLog={vi.fn()} />,
    );
    expect(await screen.findByText("The spender is new")).toBeTruthy();
    expect(screen.getByRole("heading", { name: explain.title })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows nothing when the answer is about another verdict", async () => {
    vi.stubGlobal("navigator", { ...navigator, language: "en-US" });
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            decision: "safe",
            explanation: {
              headline: "All clear",
              summary: "Nothing found.",
              points: [],
              advice: "Go on.",
            },
            language: "en",
            model: { provider: "kimi", name: "kimi-k2" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <SignRequest request={sample("caution")} pending={false} explainId="req-2" onLog={vi.fn()} />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("heading", { name: explain.title })).toBeNull());
    expect(screen.queryByText("All clear")).toBeNull();
  });

  it("asks nothing without an explain id", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<SignRequest request={sample("safe")} pending={false} onLog={vi.fn()} />);
    expect(screen.queryByRole("heading", { name: explain.title })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
