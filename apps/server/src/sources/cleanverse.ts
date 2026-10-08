import { type Address, createPublicClient, type Hex, http, parseAbi } from "viem";
import type { ComplianceSource, Credential } from "./types.js";

/**
 * Cleanverse on Monad, read from the chain.
 *
 * Two contracts: A-Pass, the identity credential (CVI), one soulbound token
 * per verified wallet; and the aToken policy, which every compliant asset
 * (CVA, such as aUSDC) asks before it moves. The asset enforces the rule
 * itself: a transfer where either side has no active A-Pass reverts. Baret
 * reads the same contracts so it can say why before the user signs.
 *
 * Cleanverse has not published these contracts' sources. `balanceOf` and
 * `isTokenRegistered` are standard and named; the credential record is read
 * through the selector below, whose layout was worked out against the chain
 * and matches what Cleanverse's own API reports for the same wallets (status,
 * tier, countries). The expiry word is the one field never seen non-zero, so
 * its position is an inference: see docs/DECISIONS.md D-030.
 */

const APASS_ABI = parseAbi(["function balanceOf(address owner) view returns (uint256)"]);
const POLICY_ABI = parseAbi(["function isTokenRegistered(address token) view returns (bool)"]);

/** The credential record of a wallet: ten words. Reverts when the wallet has none. */
const RECORD_SELECTOR = "0x6a069f61";
const RECORD_WORDS = 10;
const WORD = { status: 0, tier: 1, expiresAt: 5, countries: 9 } as const;
/** A-Pass `STATUS_ACTIVE`. Frozen and revoked credentials have other values. */
const STATUS_ACTIVE = 1n;

/**
 * ISO 3166-1 alpha-2 in alphabetical order: bit n of the record's country
 * word is the n-th code here.
 */
export const COUNTRY_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );

export function countriesFromBitmap(bitmap: bigint): string[] {
  return COUNTRY_CODES.filter((_, i) => ((bitmap >> BigInt(i)) & 1n) === 1n);
}

/**
 * Decodes a credential record. Returns null for a credential that exists but
 * is not active (frozen or revoked): to a transfer it is the same as none.
 * Throws on a record of the wrong size, so a changed contract fails closed.
 */
export function decodeRecord(data: Hex): Credential | null {
  const hex = data.slice(2);
  if (hex.length !== RECORD_WORDS * 64) throw new Error("unexpected A-Pass record size");
  const word = (i: number) => BigInt(`0x${hex.slice(i * 64, (i + 1) * 64)}`);

  if (word(WORD.status) !== STATUS_ACTIVE) return null;
  const tier = word(WORD.tier);
  const expiresAt = word(WORD.expiresAt);
  if (tier > 1_000_000n || expiresAt > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("A-Pass record out of range");
  }
  return {
    tier: Number(tier),
    // Zero is "no expiry" on A-Pass.
    expiresAt: expiresAt === 0n ? null : Number(expiresAt),
    countries: countriesFromBitmap(word(WORD.countries)),
  };
}

export class OnchainComplianceSource implements ComplianceSource {
  private readonly client;

  constructor(
    rpcUrl: string,
    private readonly contracts: { apass: Address; policy: Address },
    timeoutMs: number,
  ) {
    // One HTTP request per round of reads: these calls come on top of a whole
    // analysis, and a burst of single requests is what an RPC plan throttles.
    this.client = createPublicClient({
      transport: http(rpcUrl, { timeout: timeoutMs, batch: true }),
    });
  }

  /** Throws if any read fails: the caller then treats identity as unavailable. */
  async lookup(addresses: readonly Address[]): Promise<Map<Address, Credential | null>> {
    const entries = await Promise.all(
      addresses.map(async (address): Promise<[Address, Credential | null]> => {
        const held = await this.client.readContract({
          address: this.contracts.apass,
          abi: APASS_ABI,
          functionName: "balanceOf",
          args: [address],
        });
        if (held === 0n) return [address, null];
        const { data } = await this.client.call({
          to: this.contracts.apass,
          data: `${RECORD_SELECTOR}${address.slice(2).toLowerCase().padStart(64, "0")}`,
        });
        if (!data) throw new Error("A-Pass returned no record");
        return [address, decodeRecord(data)];
      }),
    );
    return new Map(entries);
  }

  /** Which of these tokens are compliant assets: registered with the policy. */
  async gatedTokens(tokens: readonly Address[]): Promise<Address[]> {
    const registered = await Promise.all(
      tokens.map((token) =>
        this.client.readContract({
          address: this.contracts.policy,
          abi: POLICY_ABI,
          functionName: "isTokenRegistered",
          args: [token],
        }),
      ),
    );
    return tokens.filter((_, i) => registered[i] === true);
  }
}
