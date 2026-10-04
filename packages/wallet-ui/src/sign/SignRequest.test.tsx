import { sign } from "@baret/content";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
