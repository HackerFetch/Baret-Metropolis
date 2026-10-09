import { policies, policy } from "@baret/content";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { fromTemplate } from "../data/rules.js";
import type { GuardPolicy } from "../data/types.js";
import {
  applyTicked,
  DraftFromSentence,
  POLICY_DRAFT_URL,
  parseDraftAnswer,
} from "./DraftFromSentence.js";

/** The model only suggests: tightening starts ticked, loosening never does,
 *  only ticked changes reach the draft, and any failure hides the block. */

const base: GuardPolicy = fromTemplate("balanced", []);

const answer = {
  policy: base,
  changes: [
    {
      field: "maxPerTxCap",
      from: base.maxPerTxCap,
      to: "20",
      why: "You asked for 20.",
      loosens: false,
    },
    {
      field: "blockPermit",
      from: base.blockPermit,
      to: !base.blockPermit,
      why: "Loosen.",
      loosens: true,
    },
  ],
  refused: [{ field: "allowEverything", reason: "Not a rule." }],
  note: "Two changes.",
  model: { provider: "kimi", name: "kimi-k3" },
};

function stub(status: number, body: unknown) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

async function ask(fetchImpl: typeof fetch, onApply = vi.fn()) {
  render(<DraftFromSentence draft={base} onApply={onApply} fetchImpl={fetchImpl} />);
  fireEvent.change(screen.getByLabelText(policies.draft.label), {
    target: { value: "Cap each payment at 20" },
  });
  fireEvent.click(screen.getByRole("button", { name: policies.draft.submit }));
  return onApply;
}

describe("parseDraftAnswer", () => {
  it("moves an unknown field to refused and treats an unmarked change as loosening", () => {
    const parsed = parseDraftAnswer({
      changes: [
        { field: "nope", from: null, to: true, why: "", loosens: false },
        { field: "maxGas", from: null, to: 100, why: "" },
      ],
      refused: [],
      note: "",
    });
    expect(parsed?.changes).toHaveLength(1);
    expect(parsed?.changes[0]?.loosens).toBe(true);
    expect(parsed?.refused[0]?.field).toBe("nope");
  });

  it("is null for a body that is not an answer", () => {
    expect(parseDraftAnswer({ error: "x" })).toBeNull();
    expect(parseDraftAnswer(null)).toBeNull();
  });
});

describe("applyTicked", () => {
  it("lays only the ticked changes over the draft", () => {
    const parsed = parseDraftAnswer(answer);
    if (!parsed) throw new Error("unparsed");
    const next = applyTicked(base, parsed.changes, new Set([0]));
    expect(next.maxPerTxCap).toBe("20");
    expect(next.blockPermit).toBe(base.blockPermit);
  });
});

describe("DraftFromSentence", () => {
  it("sends the sentence and the draft, ticks tightening and leaves loosening unticked", async () => {
    const fetchImpl = stub(200, answer);
    await ask(fetchImpl);
    await screen.findByText(policies.draft.changesTitle);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(POLICY_DRAFT_URL);
    expect(JSON.parse(String(init.body))).toEqual({
      sentence: "Cap each payment at 20",
      current: base,
    });
    const boxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    expect(boxes.map((box) => box.checked)).toEqual([true, false]);
    expect(screen.getByText(policies.draft.loosens)).toBeTruthy();
    expect(screen.getByText("allowEverything: Not a rule.")).toBeTruthy();
    expect(screen.getByText(policies.draft.byline)).toBeTruthy();
  });

  it("applies only the ticked changes", async () => {
    const onApply = await ask(stub(200, answer));
    await screen.findByText(policies.draft.changesTitle);
    fireEvent.click(screen.getByRole("button", { name: policies.draft.apply }));
    const next = onApply.mock.calls[0]?.[0] as GuardPolicy;
    expect(next.maxPerTxCap).toBe("20");
    expect(next.blockPermit).toBe(base.blockPermit);
    expect(screen.getByText(policies.draft.applied)).toBeTruthy();
  });

  it("applies a loosening change once the person ticks it", async () => {
    const onApply = await ask(stub(200, answer));
    await screen.findByText(policies.draft.changesTitle);
    fireEvent.click(screen.getByLabelText(new RegExp(policy.fields.blockPermit.label, "i")));
    fireEvent.click(screen.getByRole("button", { name: policies.draft.apply }));
    const next = onApply.mock.calls[0]?.[0] as GuardPolicy | undefined;
    expect(next?.blockPermit).toBe(!base.blockPermit);
  });

  it("hides itself after one quiet line on 503", async () => {
    await ask(stub(503, { error: "policy_draft_unavailable" }));
    await screen.findByText(policies.draft.unavailable);
    expect(screen.queryByLabelText(policies.draft.label)).toBeNull();
  });

  it("hides itself on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    await ask(fetchImpl);
    await waitFor(() => expect(screen.getByText(policies.draft.unavailable)).toBeTruthy());
    expect(screen.queryByRole("button", { name: policies.draft.submit })).toBeNull();
  });
});
