/**
 * Live, a revoke screen says "revoked" only for an id Monad confirmed closed.
 * The store's `revoke` resolves with exactly those ids, and the row leaves
 * only then; a refusal or a failed transaction leaves it on the list.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { RevokeResult } from "./revoke-outcome.js";
import {
  ExtensionProvider,
  type ExtState,
  initialState,
  type LiveSource,
  useExtension,
} from "./store.js";

afterEach(cleanup);

const GRANT = `allowance:0x${"a".repeat(40)}:0x${"b".repeat(40)}:main`;

function liveState(): ExtState {
  const state = initialState({ scenario: "full" });
  const [first, ...rest] = state.permissions;
  if (!first) throw new Error("the sample has no permission");
  return { ...state, permissions: [{ ...first, id: GRANT }, ...rest] };
}

function source(revoke: LiveSource["revoke"]): LiveSource {
  return {
    initial: liveState(),
    save: () => {},
    subscribe: () => () => {},
    unlock: async () => true,
    reach: async () => true,
    derive: async () => null,
    revoke,
  };
}

type Probe = { store: ReturnType<typeof useExtension> | null };

function Probe({ into }: { into: Probe }) {
  into.store = useExtension();
  return null;
}

function mount(live?: LiveSource): Probe {
  const probe: Probe = { store: null };
  render(
    <ExtensionProvider start={{ scenario: "full" }} {...(live ? { live } : {})}>
      <Probe into={probe} />
    </ExtensionProvider>,
  );
  return probe;
}

const listed = (probe: Probe) => probe.store?.state.permissions.some((p) => p.id === GRANT);

describe("a live revoke", () => {
  it("resolves with the confirmed id, and only then the row leaves", async () => {
    const probe = mount(
      source(async (grants) => ({ closed: grants.map((g) => g.id), stopped: [] })),
    );
    let closed: readonly string[] = [];
    await act(async () => {
      closed = (await probe.store?.revoke?.([GRANT]))?.closed ?? [];
    });
    expect(closed).toEqual([GRANT]);
    expect(listed(probe)).toBe(false);
  });

  it("resolves empty and keeps the row when Monad did not confirm", async () => {
    const probe = mount(
      source(async () => ({ closed: [], stopped: [{ id: GRANT, why: "failed", code: null }] })),
    );
    let result: RevokeResult = { closed: ["x"], stopped: [] };
    await act(async () => {
      result = (await probe.store?.revoke?.([GRANT])) ?? result;
    });
    expect(result.closed).toEqual([]);
    expect(result.stopped[0]).toMatchObject({ id: GRANT, why: "failed" });
    expect(listed(probe)).toBe(true);
  });

  it("resolves empty and keeps the row when the transaction throws", async () => {
    const probe = mount(
      source(async () => {
        throw new Error("rejected");
      }),
    );
    let result: RevokeResult = { closed: ["x"], stopped: [] };
    await act(async () => {
      result = (await probe.store?.revoke?.([GRANT])) ?? result;
    });
    expect(result.closed).toEqual([]);
    expect(result.stopped[0]).toMatchObject({ id: GRANT, why: "failed" });
    expect(listed(probe)).toBe(true);
  });

  it("keeps one function across state changes, so a revoke screen does not send twice", async () => {
    const probe = mount(source(async () => ({ closed: [], stopped: [] })));
    const first = probe.store?.revoke;
    expect(first).toBeTypeOf("function");
    await act(async () => {
      probe.store?.dispatch({ type: "reachable", value: false, at: new Date().toISOString() });
    });
    expect(probe.store?.revoke).toBe(first);
  });

  it("is absent on the sample, which keeps its own timer", () => {
    const probe = mount();
    expect(probe.store?.revoke).toBeNull();
  });
});
