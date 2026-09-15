/**
 * One entry per risk finding code produced by apps/server.
 *
 * `title` is the line in the findings list. `body` says what this transaction
 * actually does, in words someone who has never read a contract can follow.
 * `why` opens when the reader taps the finding and explains why it matters.
 *
 * Values in braces are filled in by the caller: {spender}, {amount}, {asset},
 * {contract}, {origin}, {cap}, {limit}, {country}, {tier}. Never invent a new
 * placeholder without adding it to the renderer in the same commit.
 *
 * Rules for writing one of these:
 *  - Name what happens to the reader's money, not what the opcode is called.
 *  - The body is one sentence. The why may be two.
 *  - Never say "malicious" unless an address is actually on a list.
 */

export const findings = {
  SIMULATION_FAILED: {
    title: "This transaction would fail",
    body: "Running it against the current state of Monad makes it revert, so it would do nothing.",
    why: "A failed transaction still costs a network fee. Sites sometimes ship broken calls, and drainers sometimes use a failing call to get you used to clicking through warnings.",
  },
  LOW_CONFIDENCE_INCOMPLETE_DATA: {
    title: "Baret could not see everything",
    body: "Part of the simulation data was missing, so this result covers less than usual.",
    why: "Baret would rather tell you it is unsure than give you a clean answer it cannot back up. Your policy decides whether an incomplete check is enough to sign.",
  },

  ERC20_APPROVAL_GRANTED: {
    title: "You are letting {spender} spend your {asset}",
    body: "The limit is {amount}, and it stays until you remove it.",
    why: "An approval is a standing permission, not a one-time payment. The site can take up to that amount whenever it wants, without asking you again.",
  },
  ERC20_APPROVAL_UNLIMITED: {
    title: "This is an unlimited approval",
    body: "{spender} would be able to move all of your {asset}, now and anything you receive later.",
    why: "This is the single most common way wallets get emptied. The signature looks like a normal approval, and it never expires. If the site is compromised next year, the permission is still there.",
  },
  NFT_OPERATOR_GRANTED: {
    title: "You are handing over a whole collection",
    body: "{spender} would be able to transfer every item you own in this collection, including items you buy later.",
    why: "Mint pages ask for this because it is convenient. It is also exactly what a drainer asks for, and one signature covers the whole collection instead of one item.",
  },
  PERMIT_SIGNATURE_DETECTED: {
    title: "This is an approval disguised as a signature",
    body: "Signing this gives {spender} permission to move your {asset} without any transaction appearing in your history.",
    why: "A permit is signed off-chain, so it does not show up as a transaction and does not cost a fee. That makes it easy to miss and popular with phishing pages.",
  },

  RISKY_CONTRACT_INTERACTION: {
    title: "This contract has been reported",
    body: "{contract} is on the risky list Baret reads from the reputation registry.",
    why: "The entry came from threat intelligence written on-chain, not from a guess. Reports can be wrong, so you can still override, but you should know first.",
  },
  UNKNOWN_CONTRACT_EXPOSURE: {
    title: "Nobody has verified this contract",
    body: "{contract} has no published source and no history that Baret recognises.",
    why: "Unverified does not mean bad. It means you cannot read what it does, and neither can Baret. Under a strict policy that is enough to stop.",
  },

  SELFDESTRUCT_CALL: {
    title: "This contract deletes itself",
    body: "The call removes the contract from Monad and sends whatever it holds somewhere else.",
    why: "After this runs there is nothing left to withdraw from and nothing left to read. If you have funds in that contract, they move in the same transaction.",
  },
  DELEGATECALL_DETECTED: {
    title: "Another contract runs code here",
    body: "This call lets code from a different contract act with the permissions of {contract}.",
    why: "Upgradeable contracts do this legitimately. So do attacks, because the code that actually runs is not the code you looked at.",
  },
  OWNERSHIP_TRANSFER: {
    title: "Control of this contract changes hands",
    body: "Administrative rights over {contract} move to another address.",
    why: "Whoever holds those rights can usually mint, pause or drain. If you did not expect a handover, this is the moment to stop.",
  },

  KNOWN_MALICIOUS_ADDRESS: {
    title: "This address is on a blocklist",
    body: "{spender} was reported for draining wallets.",
    why: "The report is written on-chain by the reputation oracle, so you can check it yourself. This is the one finding Baret never treats as a warning.",
  },
  NANSEN_FLAGGED_FRESH_WALLET: {
    title: "This wallet is brand new",
    body: "{spender} was created recently and has almost no history.",
    why: "Real counterparties usually leave a trail. A fresh wallet on the receiving end of a large transfer is the normal shape of a scam payout address.",
  },
  NANSEN_FLAGGED_WHALE_COUNTERPARTY: {
    title: "You are trading against a very large holder",
    body: "{spender} holds enough of this asset to move its price on its own.",
    why: "This is information, not an accusation. It matters because your fill can be much worse than the quote you were shown.",
  },

  COMPLIANCE_NO_CREDENTIAL: {
    title: "This asset needs a verified identity",
    body: "One of the two accounts in this transfer has never been verified.",
    why: "The asset itself refuses transfers between unverified accounts. The transfer would be rejected on-chain, so Baret stops it earlier and tells you which side is missing.",
  },
  COMPLIANCE_EXPIRED: {
    title: "The verification has expired",
    body: "The credential on this account was valid and is not any more.",
    why: "Credentials have an end date. Renewing takes a few minutes and the transfer works again afterwards.",
  },
  COMPLIANCE_TIER_INSUFFICIENT: {
    title: "This transfer needs a higher verification level",
    body: "The asset requires level {tier} and this account is below it.",
    why: "Higher amounts and some asset classes need a stronger identity check. The issuer sets that, not Baret.",
  },
  COMPLIANCE_COUNTRY_DISALLOWED: {
    title: "This asset does not move to {country}",
    body: "The issuer has excluded the country registered on the receiving account.",
    why: "The rule lives in the asset contract. Nothing Baret or you can change from this screen.",
  },

  DEEP_CALL_NESTING: {
    title: "This call goes deeper than it looks",
    body: "One click reaches {limit} contracts, most of which the site never showed you.",
    why: "Depth alone is not an attack. It matters because the more contracts are involved, the less the summary on the page tells you about what actually happens.",
  },
  HIGH_OPERATION_COUNT: {
    title: "This does many things at once",
    body: "The transaction bundles {limit} separate operations.",
    why: "Batching is normal. It is also how an extra transfer gets hidden between two operations you expected.",
  },

  EXCESSIVE_GAS: {
    title: "The fee is far above what this needs",
    body: "The simulation used much less gas than the transaction asks you to pay for.",
    why: "Sometimes it is a sloppy gas estimate. Sometimes the extra headroom is there so a second, heavier path can run without failing.",
  },

  ESTIMATED_LOSS_EXCEEDS_MAX: {
    title: "This costs more than your limit",
    body: "You would be down {amount}, and your rule stops at {limit}.",
    why: "Baret compares your balance before and after the simulation. The number includes the network fee.",
  },
  POST_BALANCE_TOO_LOW: {
    title: "This leaves you below your floor",
    body: "After this you would hold less {asset} than the minimum you set.",
    why: "The floor exists so you always keep enough to pay a fee and get out. Lower the floor or lower the amount.",
  },
  LOSS_PERCENT_UNAVAILABLE: {
    title: "Baret could not work out the cost",
    body: "Your balance before or after could not be read, so the loss limit could not be applied.",
    why: "When a rule cannot be checked, Baret treats it as failed rather than passed. That is deliberate.",
  },

  X402_DESTINATION_MISMATCH: {
    title: "The payment goes somewhere else",
    body: "The site asked to be paid at one address and this transaction pays a different one.",
    why: "An agent following an HTTP 402 response does not usually compare the two. This is what a tampered payment request looks like.",
  },
  X402_ASSET_MISMATCH: {
    title: "The payment is in the wrong asset",
    body: "The site asked for {asset} and this transaction sends something else.",
    why: "Swapping the asset at the last step is how a payment that looks like a dollar ends up being something else.",
  },
  X402_NON_CANONICAL_ASSET: {
    title: "This token is not the real {asset}",
    body: "The name matches the one you allow, the contract address does not.",
    why: "Anyone can deploy a token and call it USDC. Baret compares the contract address against the canonical one on Monad, not the name.",
  },
  X402_MEMO_MISSING: {
    title: "This payment has no reference",
    body: "Your rules require a reference and the request does not include one.",
    why: "Without a reference you cannot match the payment to an invoice later, and neither can the merchant.",
  },
} as const;

export type FindingCode = keyof typeof findings;
export type FindingsContent = typeof findings;
