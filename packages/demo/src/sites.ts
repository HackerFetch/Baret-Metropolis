import { type Address, encodeFunctionData, type Hex, maxUint256, parseAbi } from "viem";
import type { DemoTx } from "./novaswap.js";

/**
 * The demo contracts of PixelDrop, OrbitYield, ClaimHub and LaunchPad on
 * Monad testnet (chain 10143). Deployed 2026-10-05, source verified.
 * See docs/CONTRACTS.md §7.
 *
 * "Listed" contracts are in the server's MONAD_TESTNET_KNOWN_CONTRACTS, so
 * Baret vouches for them. The attack side of each site is either reported in
 * the ReputationRegistry (the drainer, the sink) or simply on no list.
 */
export const DEMO = {
  chainId: 10143,
  /** The real test USDC on Monad testnet (Circle), 6 decimals. */
  usdc: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  /** A token that calls itself USDC and is not. On no list. */
  fakeUsdc: "0x1486794fc4958686115c9797d21aAcE497326826",
  /** Reported at severity 4: what an attack site's approve button points at. */
  drainer: "0x8D42f14012426F6a844BF0f5E6ab7889F8Cd79Eb",
  /** Reported at severity 4: the wallet everything the drainers take ends up in. */
  sink: "0xac9517a70c88480c9fA7E9a280DA485F7f552C29",
  pixeldrop: {
    /** Night Shift, listed. 0.01 MON a piece, ten per wallet. */
    collection: "0xC3fAFF337A197d7BFa49bB3210C0C057dd188688",
    priceWei: 10n ** 16n,
    perWallet: 10,
  },
  orbityield: {
    /** Listed. `stake()` returns oMON one to one. */
    pool: "0x9dD3Bc0e343Bdc4AB2BCD4c96D01bc8500725f38",
    receipt: "0xB789996F13551eC6f3DF93d54D4F04A1316C3A92",
    /** On no list. `stake()` keeps the MON and returns nothing. */
    silentPool: "0xb4cCbB7A8a0Ff5564115856C008eD9a46d306fa8",
  },
  claimhub: {
    /** Listed. `claim()` sends 2,410 HUB, as often as asked. */
    distributor: "0x7cb4a1B209dF1beDEc7843d1bf20E5723BA6Cc2b",
    hub: "0x26bC901B5489057F76D188631D6252779349684A",
  },
  launchpad: {
    /** Listed. 0.01 to 1 MON, 1,000 LNTL per MON. */
    sale: "0x7Dc38ed77388b1dacB4653b1681dC7FBF6Dc2aac",
    token: "0x45AF9aA34BC4CB4E91B56413f18A6D739254D959",
    /** On no list. Forwards every call with delegatecall to replaceable logic. */
    proxySale: "0x9A217845d5C5b684EBD6BF7973Da8f69dE453439",
    proxyLogic: "0xc8b0f0aA28Bb9E25Cf9d27aff3E9BB059Cb1BCC1",
  },
} as const;

const ABI = parseAbi([
  "function mint(uint256 count) payable",
  "function setApprovalForAll(address operator, bool approved)",
  "function stake() payable",
  "function claim()",
  "function contribute() payable",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const tx = (from: Address, to: Address, data: Hex, value = 0n): DemoTx => ({
  from,
  to,
  value: value.toString(),
  data,
});

export const pixeldrop = {
  /** Honest: mint `count` pieces at 0.01 MON each. Baret: Safe. */
  mint: (from: Address, count: number) =>
    tx(
      from,
      DEMO.pixeldrop.collection,
      encodeFunctionData({ abi: ABI, functionName: "mint", args: [BigInt(count)] }),
      BigInt(count) * DEMO.pixeldrop.priceWei,
    ),

  /** Attack: "approve to list" opens the whole collection to the drainer. Baret: Blocked. */
  attackApproveAll: (from: Address) =>
    tx(
      from,
      DEMO.pixeldrop.collection,
      encodeFunctionData({
        abi: ABI,
        functionName: "setApprovalForAll",
        args: [DEMO.drainer, true],
      }),
    ),
};

const stake = encodeFunctionData({ abi: ABI, functionName: "stake" });

export const orbityield = {
  /** Honest: MON in, oMON out one to one. Baret: Safe at any size (an exchange with a listed pool). */
  stake: (from: Address, monWei: bigint) => tx(from, DEMO.orbityield.pool, stake, monWei),

  /**
   * Attack: the same button on a pool nobody vouches for, which returns
   * nothing. Baret: Caution, and Blocked above the loss limit.
   */
  attackStake: (from: Address, monWei: bigint) =>
    tx(from, DEMO.orbityield.silentPool, stake, monWei),
};

export const claimhub = {
  /** Honest: 2,410 HUB arrive, nothing leaves but the fee. Baret: Safe. */
  claim: (from: Address) =>
    tx(from, DEMO.claimhub.distributor, encodeFunctionData({ abi: ABI, functionName: "claim" })),

  /** Attack: "verify your wallet to claim" is an unlimited USDC allowance to the drainer. Baret: Blocked. */
  attackApprove: (from: Address) =>
    tx(
      from,
      DEMO.usdc,
      encodeFunctionData({ abi: ABI, functionName: "approve", args: [DEMO.drainer, maxUint256] }),
    ),
};

const contribute = encodeFunctionData({ abi: ABI, functionName: "contribute" });

export const launchpad = {
  /** Honest: the plain sale. Baret: Safe. */
  contribute: (from: Address, monWei: bigint) => tx(from, DEMO.launchpad.sale, contribute, monWei),

  /** The proxy sale: honest today, but the code is borrowed and replaceable. Baret: Caution. */
  attackContribute: (from: Address, monWei: bigint) =>
    tx(from, DEMO.launchpad.proxySale, contribute, monWei),
};
