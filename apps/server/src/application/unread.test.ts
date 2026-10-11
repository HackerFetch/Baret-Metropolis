import { describe, expect, it } from "vitest";
import { buildApp } from "../api/app.js";
import { deps, FakeRpc, policy, USDC, USER } from "../testing/fake.js";
import { UnreadKinds } from "./unread.js";

describe("the tally of unread signed messages", () => {
  it("counts each kind and lists the most seen first", () => {
    const kinds = new UnreadKinds();
    expect(kinds.note("Ballot")).toBe(1);
    expect(kinds.note("Order")).toBe(1);
    expect(kinds.note("Order")).toBe(2);
    expect(kinds.messages).toBe(3);
    expect(kinds.kinds).toBe(2);
    expect(kinds.top(1)).toEqual([{ primaryType: "Order", count: 2 }]);
  });

  it("cannot be grown without bound by a caller who invents names", () => {
    const kinds = new UnreadKinds(2, 8);
    kinds.note("a-very-long-name-a-site-chose");
    expect(kinds.top()[0]?.primaryType).toBe("a-very-l");
    kinds.note("second");
    expect(kinds.note("third")).toBe(0);
    expect(kinds.kinds).toBe(2);
    // Still counted in the total, and a known kind still counts.
    expect(kinds.messages).toBe(3);
    expect(kinds.note("second")).toBe(2);
  });

  it("is fed by /v1/analyze and shown as numbers on /health/ready", async () => {
    const unreadKinds = new UnreadKinds();
    const app = await buildApp({ ...deps(new FakeRpc()), unreadKinds });
    const sign = (primaryType: string, message: Record<string, unknown>) =>
      app.inject({
        method: "POST",
        url: "/v1/analyze",
        payload: {
          network: "testnet",
          policy: policy(),
          typedData: {
            signer: USER,
            domain: { chainId: 10143, verifyingContract: USDC },
            types: {},
            primaryType,
            message,
          },
        },
      });
    expect((await sign("Ballot", { proposalId: "1" })).statusCode).toBe(200);
    expect((await sign("Ballot", { proposalId: "2" })).statusCode).toBe(200);
    // A message the server reads is not counted.
    await sign("Delegation", { delegatee: USER, nonce: 0, expiry: 1 });
    expect(unreadKinds.top()).toEqual([{ primaryType: "Ballot", count: 2 }]);
    const ready = await app.inject({ method: "GET", url: "/health/ready" });
    expect(ready.json().networks[0].configured).toMatchObject({
      unreadSignatures: 2,
      unreadSignatureKinds: 1,
    });
    // No name a site chose is on the open health endpoint.
    expect(ready.body).not.toContain("Ballot");
  });
});
