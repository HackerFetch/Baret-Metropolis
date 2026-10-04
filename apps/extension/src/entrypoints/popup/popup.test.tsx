/**
 * Fail-closed in the signing phase: while Baret is unreachable, or its reach
 * is still unknown, no request offers a one-click Sign or pay. And a payment
 * amount that cannot be read never passes the caps check.
 */

import { signRequest } from "@baret/content/extension/popup/sign-request.content";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { REQUESTS } from "../../data/sample.js";
import { ExtensionProvider } from "../../data/store.js";
import type { PopupRequest } from "../../data/types.js";
import { capsValid } from "./parts/Requests.js";
import { asChecked, SignPhase } from "./screens/Sign.js";

afterEach(cleanup);

const SAFE_TYPED: PopupRequest = { ...REQUESTS.permit, verdict: "safe", rules: [] };

function renderSign(request: PopupRequest, reachable: boolean | null) {
  return render(
    <ExtensionProvider start={{ scenario: "full", reachable }}>
      <SignPhase queue={[request]} onFinished={() => {}} />
    </ExtensionProvider>,
  );
}

describe("asChecked", () => {
  it("keeps the verdict while Baret is reachable", () => {
    expect(asChecked(SAFE_TYPED, true)).toBe(SAFE_TYPED);
  });

  it.each([null, false])("counts every verdict as unreachable when reach is %s", (reachable) => {
    const typed = asChecked(SAFE_TYPED, reachable);
    expect(typed.kind === "typedData" && typed.verdict).toBe("unreachable");
    const tx = asChecked(REQUESTS.safe, reachable);
    expect(tx.kind === "transaction" && tx.request.verdict).toBe("unreachable");
    const pay = asChecked(REQUESTS.firstPayment, reachable);
    expect(pay.kind === "payment" && pay.state).toBe("notChecked");
    const auto = asChecked(REQUESTS.autoPayment, reachable);
    expect(auto.kind === "payment" && auto.state).toBe("notChecked");
  });
});

describe("structured data", () => {
  it("offers Sign on a Safe request while Baret is reachable", () => {
    renderSign(SAFE_TYPED, true);
    expect(
      screen.queryByRole("button", { name: signRequest.typedData.actions.sign }),
    ).not.toBeNull();
  });

  it.each([null, false])("offers no Sign on a Safe request when reach is %s", (reachable) => {
    renderSign(SAFE_TYPED, reachable);
    expect(screen.queryByRole("button", { name: signRequest.typedData.actions.sign })).toBeNull();
    expect(
      screen.queryByRole("button", { name: signRequest.typedData.actions.decline }),
    ).not.toBeNull();
  });
});

describe("capsValid", () => {
  const caps = { perPayment: "1", hour: "5", day: "10" };

  it("accepts caps above a readable amount", () => {
    expect(capsValid("0.50", caps)).toBe(true);
  });

  it.each(["abc", "0.0000005", ""])("refuses caps for an unreadable amount %j", (amount) => {
    expect(capsValid(amount, caps)).toBe(false);
  });
});
