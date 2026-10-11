/**
 * The web wallet with a passkey, end to end in a browser.
 *
 *   pnpm --filter @baret/wallet verify:browser
 *
 * Chromium gets a virtual authenticator that supports the PRF extension, so
 * the wallet makes a real passkey account with no person at the keyboard.
 * The script then walks the sealed settings (D-039): the Strict template, a
 * renamed account and a named merchant are saved as an encrypted copy on
 * Monad; storage is cleared and the page loaded again, as a fresh browser
 * with the same passkey; the copy is brought back. One line per check, exit 1
 * when any fails. The saves are real writes to the SealedStore on testnet,
 * paid by the API's relayer.
 *
 * Two things a later script will want to know:
 *   - the authenticator needs `hasPrf: true`; `extensions: ["prf"]` is not
 *     enough and the wallet then says the passkey is not compatible;
 *   - the keys live in memory, so `page.goto` after unlock locks the wallet:
 *     move between screens by clicking the sidebar.
 *
 * Needs Playwright's Chromium (`npx playwright install chromium`) and
 * PLAYWRIGHT_CORE set to its `playwright-core/index.mjs` when it is not
 * resolvable from here. BARET_WALLET_URL picks the wallet to test; default
 * the live one. A local wallet (`VITE_BARET_WALLET=live pnpm --filter
 * @baret/wallet dev`) needs an API on port 8080 with the sealed relay set.
 */
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const base = (process.env.BARET_WALLET_URL ?? "https://baret-wallet.vercel.app").replace(
  /\/+$/,
  "",
);
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 1280, height: 1600 } });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("response", (r) => {
  if (r.url().includes("/api/v1/sealed")) console.log("  relay:", r.status());
});
const cdp = await context.newCDPSession(page);
await cdp.send("WebAuthn.enable");
const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
  options: {
    protocol: "ctap2",
    ctap2Version: "ctap2_1",
    transport: "internal",
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
    automaticPresenceSimulation: true,
    hasPrf: true,
  },
});
const say = (m) => console.log("—", m);
const texts = async (sel) =>
  (await page.locator(sel).allInnerTexts())
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter(Boolean);
const stored = () =>
  page.evaluate(() => ({
    template: JSON.parse(localStorage.getItem("baret.wallet.rules") ?? "null")?.template ?? null,
    maxLoss:
      JSON.parse(localStorage.getItem("baret.wallet.rules") ?? "null")?.policy?.maxLossPercent ??
      null,
    name: localStorage.getItem("baret.wallet.name"),
    merchants: localStorage.getItem("baret.wallet.merchants"),
  }));
const nav = async (name) => {
  await page.getByRole("link", { name, exact: false }).first().click();
  await page.waitForTimeout(1200);
};
const status = async () =>
  (await texts('p[role="status"]')).filter((t) => t.length > 8).join(" | ");
const click = async (name) => {
  await page.getByRole("button", { name }).first().click();
};
const settle = async (ms = 9000) => {
  await page.waitForTimeout(ms);
};
let failed = false;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};

// 1. A new account from a new passkey.
await page.goto(`${base}/onboarding`);
await click(/create my wallet/i);
await page.waitForTimeout(4000);
say(`after create: ${page.url()} ${JSON.stringify((await texts("button:visible")).slice(0, 8))}`);
const creds = await cdp.send("WebAuthn.getCredentials", { authenticatorId });
expect("one passkey exists", creds.credentials.length === 1);

// 2. Distinctive settings: a merchant's name and the Strict template.
await page.evaluate(() =>
  localStorage.setItem(
    "baret.wallet.merchants",
    JSON.stringify({ "0x1365566191baa9872a64acdce963751d5343ff49": "Scrybe (sealed test)" }),
  ),
);
await nav(/rules/i);
const strict = page.getByRole("radio", { name: /strict/i }).first();
if (await strict.count()) {
  await strict.check({ force: true });
} else {
  await page
    .getByText(/^strict$/i)
    .first()
    .click();
}
await page.waitForTimeout(800);
await click(/save rules/i);
await page.waitForTimeout(1500);
await nav(/settings/i);
await page.locator("form input").first().fill("Sealed test account");
await click(/^done$/i);
await page.waitForTimeout(800);
const before = await stored();
say(`stored before save: ${JSON.stringify(before)}`);

// 3. Save the sealed copy.
await click(/save an encrypted copy/i);
await settle();
say(`status: ${await status()}`);
expect("the save reports copy number 1", /copy number 1 is on Monad/.test(await status()));

// 4. A fresh browser profile: storage cleared, the page loaded again, the same passkey.
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/onboarding`);
await page.waitForTimeout(1500);
await click(/open with my passkey/i);
await page.waitForTimeout(4000);
const fresh = await stored();
say(`stored after clear + unlock: ${JSON.stringify(fresh)}`);
expect(
  "the fresh profile starts without the settings",
  fresh.merchants === null && fresh.template !== before.template && fresh.name !== before.name,
);

// 5. Restore.
await nav(/settings/i);
await click(/bring them back here/i);
await settle(6000);
say(`status: ${await status()}`);
const after = await stored();
say(`stored after restore: ${JSON.stringify(after)}`);
expect(
  "the rules are back",
  after.template === before.template && after.maxLoss === before.maxLoss,
);
expect("the account name is back", after.name === before.name);
expect("the merchant's name is back", (after.merchants ?? "").includes("Scrybe (sealed test)"));
expect("the restore says which copy", /from copy number 1/.test(await status()));

// 6. A second save is copy number 2, with no second passkey prompt needed for the keys.
await click(/save an encrypted copy/i);
await settle();
say(`status: ${await status()}`);
expect("the second save is copy number 2", /copy number 2 is on Monad/.test(await status()));
await browser.close();
process.exit(failed ? 1 : 0);
