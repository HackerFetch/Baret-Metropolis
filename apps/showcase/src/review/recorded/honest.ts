/** Recorded on Monad testnet, 9 October 2026 with qwen3.8-max, from POST /v1/review. Only the fields the page shows. */
import type { ReviewAnswer } from "../reducer.js";

export const honest: ReviewAnswer = {
  scenario: "honest",
  intent:
    "Pay 0.10 dUSDC (100000 base units) from vault 0x46F159DA1aD40A78526d35ea1Adb8531aDa52158 to merchant 0x1365566191bAA9872A64AcDce963751d5343ff49 for invoice inv-2001.",
  call: {
    to: "0x46F159DA1aD40A78526d35ea1Adb8531aDa52158",
    valueWei: "0",
    data: "0x5e5571ac0000000000000000000000001365566191baa9872a64acdce963751d5343ff4900000000000000000000000000000000000000000000000000000000000186a077cedf93e7f9dcea152e6ed4fd88b81f031bb5f05a6921b5f73c85340bc0636a",
    merchant: "0x1365566191bAA9872A64AcDce963751d5343ff49",
    amount: "100000",
  },
  baret: {
    decision: "safe",
    findings: [],
  },
  review: {
    decision: "approve",
    reason:
      "Transaction matches intent: pays 100000 base units to the specified merchant from the correct vault with matching ref. Merchant is active, not paused, listed in vault, payment fits caps, and neither address is in the reputation registry.",
    mismatches: [],
    transcript: {
      plan: [
        "Decode the transaction to verify function, merchant, amount and ref match the intent.",
        "Get Baret verdict to check for unexpected effects or approvals.",
        "Read vault state to confirm merchant is listed, not paused, and payment fits caps.",
        "Check reputation of the merchant address.",
        "Check reputation of the vault address.",
        "Decide approve or veto based on all gathered facts.",
      ],
      steps: [
        {
          tool: "decode_transaction",
          arguments: {},
          ok: true,
          result: {
            to: "0x46F159DA1aD40A78526d35ea1Adb8531aDa52158",
            valueWei: "0",
            selector: "0x5e5571ac",
            function: "pay",
            args: {
              merchant: "0x1365566191bAA9872A64AcDce963751d5343ff49",
              amount: "100000",
              ref: "0x77cedf93e7f9dcea152e6ed4fd88b81f031bb5f05a6921b5f73c85340bc0636a",
            },
          },
          ms: 1,
        },
        {
          tool: "get_baret_verdict",
          arguments: {},
          ok: true,
          result: {
            decision: "safe",
            confidence: "high",
            findings: [],
            firedRules: [],
            balanceChanges: [
              {
                account: "0x227ba9d7B649988C48662Ac42360727bA971647E",
                isAgent: true,
                asset: "MON",
                assetAddress: null,
                decimals: 18,
                deltaBaseUnits: "-12981540000000000",
              },
            ],
            approvals: [],
            checksUnavailable: [],
          },
          ms: 0,
        },
        {
          tool: "read_vault",
          arguments: {
            address: "0x46F159DA1aD40A78526d35ea1Adb8531aDa52158",
          },
          ok: true,
          result: {
            now: 1791551051,
            vault: {
              id: "0x46f159da1ad40a78526d35ea1adb8531ada52158",
              owner: "0x8c1453cd190c75cf9efa1968cb36b5384ac02a5c",
              token: "0x5bb6ff1fcbe31ed8fbce6805852ce279475522fc",
              agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
              deposited: "50000000",
              withdrawn: "0",
              paid: "300000",
              paymentCount: 3,
              createdAtBlock: 69536190,
              merchants: [
                {
                  address: "0x1365566191baa9872a64acdce963751d5343ff49",
                  perTxCap: "1000000",
                  hourlyCap: "2000000",
                  dailyCap: "5000000",
                  paused: false,
                  active: true,
                  paid: "300000",
                  paymentCount: 3,
                },
              ],
            },
            recentActivity: [
              {
                id: "69545568-2",
                kind: "paid",
                merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
                agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
                amount: "100000",
                timestamp: 1791550754,
                block: 69545568,
                txHash: "0x51c302810b19fb2410c34c7e39108a6edfdccd0077915d11ac598063963eb456",
              },
              {
                id: "69543063-37",
                kind: "paid",
                merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
                agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
                amount: "100000",
                timestamp: 1791549986,
                block: 69543063,
                txHash: "0x5bae7893322611b99738d1f688da8200c45e33408d7011aa0272e5faa990aff6",
              },
              {
                id: "69538897-3",
                kind: "deposited",
                merchant: null,
                agent: null,
                amount: "40000000",
                timestamp: 1791548710,
                block: 69538897,
                txHash: "0x14c2c71bb12e1f4b094b140089b436e992cdc853efc14156a7c2d566b75ef278",
              },
              {
                id: "69536894-96",
                kind: "paid",
                merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
                agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
                amount: "100000",
                timestamp: 1791548102,
                block: 69536894,
                txHash: "0x206bbd5cc3ee0ee092b52076d9da054b53e50b134c173427f87a7dc08821095d",
              },
              {
                id: "69536200-47",
                kind: "agentSet",
                merchant: null,
                agent: "0x227ba9d7b649988c48662ac42360727ba971647e",
                amount: null,
                timestamp: 1791547889,
                block: 69536200,
                txHash: "0xf74f5754fca5cb75cb75392f3c9ccc7e572b020634b00d65d70e88e6687b0173",
              },
            ],
            paidByMerchant: {
              "0x1365566191baa9872a64acdce963751d5343ff49": {
                lastHour: "300000",
                lastDay: "300000",
              },
            },
            windowsComplete: true,
            thisPayment: {
              merchant: "0x1365566191baa9872a64acdce963751d5343ff49",
              amountBaseUnits: "100000",
              listed: true,
              active: true,
              paused: false,
              roomBaseUnits: "1000000",
              fits: true,
            },
          },
          ms: 542,
        },
        {
          tool: "check_reputation",
          arguments: {
            address: "0x1365566191bAA9872A64AcDce963751d5343ff49",
          },
          ok: true,
          result: {
            listed: false,
          },
          ms: 147,
        },
        {
          tool: "check_reputation",
          arguments: {
            address: "0x46F159DA1aD40A78526d35ea1Adb8531aDa52158",
          },
          ok: true,
          result: {
            listed: false,
          },
          ms: 73,
        },
      ],
    },
  },
  sent: {
    hash: "0xb4339027d5b38d32a04c15424ca2a4501c996dad462efef728aa9be3b054e528",
    status: "confirmed",
  },
  model: {
    provider: "qwen",
    name: "qwen3.8-max",
  },
  ranAt: "2026-10-09T13:04:03.337Z",
  cached: false,
};
