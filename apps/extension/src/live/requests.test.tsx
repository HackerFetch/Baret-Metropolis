/**
 * The live request window fails closed on the paths a site can reach:
 * a permit's deadline is a uint256 of seconds and never crashes the screen,
 * a Blocked or unchecked signature has Decline alone (the key never signs
 * past a block), and a screen that throws answers the site with a refusal
 * instead of leaving it waiting.
 */

import { signRequest } from "@baret/content/extension/popup/sign-request.content";
import { sign } from "@baret/content/wallet/sign.content";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { REQUESTS } from "../data/sample.js";
import { ExtensionProvider } from "../data/store.js";
import type { TypedDataRequest } from "../data/types.js";
import { TypedDataView } from "../entrypoints/popup/parts/Requests.js";
import { RequestBoundary } from "./RequestBoundary.js";
import { deadlineOf, permitOf } from "./requests.js";

const PERMIT = REQUESTS.permit as TypedDataRequest;
const MAX = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

describe("a permit's deadline", () => {
  it("reads unix seconds as a date", () => {
    expect(deadlineOf("1893456000")).toBe("2030-01-01T00:00:00.000Z");
    expect(deadlineOf(1893456000)).toBe("2030-01-01T00:00:00.000Z");
  });

  it("has none for the maximum, a value past any calendar, or what is not a number", () => {
    expect(deadlineOf(MAX)).toBeNull();
    expect(deadlineOf("253402300800")).toBeNull();
    expect(deadlineOf("soon")).toBeNull();
    expect(deadlineOf(undefined)).toBeNull();
    expect(deadlineOf("-5")).toBeNull();
  });

  it("is carried into the permit the screen shows", () => {
    const permit = permitOf({
      domain: { name: "dUSDC", chainId: 10143 },
      types: {},
      primaryType: "Permit",
      message: {
        owner: "0x0000000000000000000000000000000000000001",
        spender: "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888",
        value: MAX,
        nonce: "0",
        deadline: "1893456000",
      },
    });
    expect(permit).toEqual({
      spender: "0xeB9EBB97BcD146FF1a4424490cbE8e19b7983888",
      asset: "dUSDC",
      amount: null,
      deadline: "2030-01-01T00:00:00.000Z",
    });
  });

  it("renders a permit with a seconds deadline, and says when there is none", () => {
    render(
      <ExtensionProvider start={{ scenario: "full" }}>
        <TypedDataView
          request={{
            ...PERMIT,
            permit: { spender: "0x0", asset: "USDC", amount: null, deadline: null },
          }}
          onDecide={() => {}}
        />
      </ExtensionProvider>,
    );
    expect(screen.getByText(signRequest.typedData.permit.noDeadline)).toBeTruthy();
  });
});

describe("a stopped signature in the live window", () => {
  const hold = () => screen.queryByRole("button", { name: new RegExp(sign.override.hold, "i") });

  it.each(["blocked", "unreachable"] as const)("offers no hold to sign a %s request", (verdict) => {
    render(
      <ExtensionProvider start={{ scenario: "full" }}>
        <TypedDataView request={{ ...PERMIT, verdict }} onDecide={() => {}} canOverride={false} />
      </ExtensionProvider>,
    );
    expect(hold()).toBeNull();
    expect(
      screen.queryByRole("button", { name: signRequest.typedData.actions.decline }),
    ).not.toBeNull();
  });

  it("keeps the sign button on a Safe request", () => {
    render(
      <ExtensionProvider start={{ scenario: "full" }}>
        <TypedDataView
          request={{ ...PERMIT, verdict: "safe", rules: [] }}
          onDecide={() => {}}
          canOverride={false}
        />
      </ExtensionProvider>,
    );
    expect(
      screen.queryByRole("button", { name: signRequest.typedData.actions.sign }),
    ).not.toBeNull();
  });

  it("still offers the hold on the sample, where it is a stand-in", () => {
    render(
      <ExtensionProvider start={{ scenario: "full" }}>
        <TypedDataView request={{ ...PERMIT, verdict: "blocked" }} onDecide={() => {}} />
      </ExtensionProvider>,
    );
    expect(hold()).not.toBeNull();
  });
});

describe("a request screen that throws", () => {
  function Broken(): never {
    throw new RangeError("Invalid time value");
  }

  it("refuses the site at once and shows a way out", () => {
    const onAnswer = vi.fn();
    const onFinished = vi.fn();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <RequestBoundary onAnswer={onAnswer} onFinished={onFinished}>
        <Broken />
      </RequestBoundary>,
    );
    quiet.mockRestore();
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0]?.[0]).toMatchObject({ error: { code: 4001 } });
    expect(screen.getByText(signRequest.failed.title)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: signRequest.failed.action }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});
