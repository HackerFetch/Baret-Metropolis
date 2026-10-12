/**
 * The extension as a real wallet, end to end in a browser.
 *
 *   pnpm --filter @baret/extension verify:browser
 *
 * It loads the built extension into Chromium and walks what a person does:
 * setup (a new wallet, the backup's own words, funding, the account check),
 * a site (NovaSwap on the showcase) that connects, an attack that must read
 * Blocked with no sign button, an honest transfer that must be signed and
 * land in a block, the toolbar popup, lock and unlock, and NovaSwap's own
 * faucet and attack buttons. It prints one line per check and exits 1 when
 * any fails.
 *
 * Everything is real: the API, Monad testnet and the transactions. Each run
 * makes a new wallet and sends it 1 MON from BARET_FUNDER_KEY_FILE, so that
 * key needs testnet MON. Nothing here is a secret: the key is read from a
 * file that is never in the repository.
 *
 * Needs, none of them a dependency of this repository:
 *   - a build:  WXT_BARET_API_URL=https://baret-monad-api.onrender.com pnpm --filter @baret/extension build
 *   - Playwright's Chromium (`npx playwright install chromium`), and
 *     PLAYWRIGHT_CORE set to its `playwright-core/index.mjs` when it is not
 *     resolvable from here (as apps/showcase/scripts/og.mjs does)
 *   - foundry's `cast` on PATH, to fund the new wallet
 *
 * Settings (environment):
 *   BARET_EXTENSION_DIR    the unpacked build; default .output/chrome-mv3
 *   BARET_SITE             the site to test against; default the live NovaSwap
 *   BARET_FUNDER_KEY_FILE  default ~/.baret/deployer.key
 *   MONAD_TESTNET_RPC_URL  default the public testnet node
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const EXT =
  process.env.BARET_EXTENSION_DIR ??
  fileURLToPath(new URL("../.output/chrome-mv3", import.meta.url));
const SITE = process.env.BARET_SITE ?? "https://usebaret.com/novaswap";
const FUNDER =
  process.env.BARET_FUNDER_KEY_FILE ?? join(process.env.HOME ?? "", ".baret/deployer.key");
const RPC = process.env.MONAD_TESTNET_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const PASS = "lantern orbit quiet meadow 42";
const profile = mkdtempSync(join(tmpdir(), "baret-ext-"));
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  viewport: { width: 1280, height: 1100 },
  args: [
    "--headless=new",
    "--no-sandbox",
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
  ],
});
const say = (m) => console.log("—", m);
let failed = false;
const expect = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed = true;
};
const sw =
  context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 20000 }));
const id = new URL(sw.url()).host;
say(`extension id ${id}`);
const texts = async (page, sel) =>
  (await page.locator(sel).allInnerTexts())
    .map((t) => t.trim().replace(/\s+/g, " "))
    .filter(Boolean);
const buttons = (page) => texts(page, "button:visible, a[role=button]:visible");
const press = async (page, name) => {
  await page.getByRole("button", { name }).first().click();
  await page.waitForTimeout(700);
};

const page = await context.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    console.log("CONSOLE", m.text().slice(0, 400));
  }
});
await page.goto(`chrome-extension://${id}/options.html#/onboarding`);
await page.waitForTimeout(2500);
say(`welcome: ${JSON.stringify(await buttons(page))}`);

await press(page, /get started|create|start|set up/i);
say(
  "passphrase step: " +
    JSON.stringify(await buttons(page)) +
    " inputs " +
    (await page.locator("input:visible").count()),
);
const inputs = page.locator("input[type=password]:visible, input:visible");
await inputs.nth(0).fill(PASS);
await inputs.nth(1).fill(PASS);
await page.locator("form button[type=submit]").first().click();
await page.waitForTimeout(6000);
say(`after passphrase: ${JSON.stringify(await buttons(page))}`);
const address = (await page.locator("code").first().innerText()).trim();
say(`address ${address}`);
expect(
  "a real address is shown",
  /^0x[0-9a-fA-F]{40}$/.test(address) && address !== "0x0000000000000000000000000000000000000000",
);
const stored = await sw.evaluate(async () => ({
  local: Object.keys(await chrome.storage.local.get(null)),
  vault: (await chrome.storage.local.get("baret.vault"))["baret.vault"],
  session: Object.keys(await chrome.storage.session.get(null)),
}));
expect(
  "the vault is sealed on disk",
  stored.vault?.kdf === "pbkdf2-sha256" && !JSON.stringify(stored.vault).includes(" "),
  JSON.stringify(stored.local),
);
expect(
  "the open phrase is in session storage only",
  stored.session.includes("baret.session.phrase") && !stored.local.includes("baret.session.phrase"),
);

await press(page, /continue to the backup/i);
say(`backup: ${JSON.stringify(await buttons(page))}`);
await press(page, /show|reveal/i);
const words = await texts(page, "ol li span.font-mono.text-base");
say(`words shown: ${words.length}`);
expect(
  "twelve real words are shown",
  words.length === 12 &&
    words.join(" ") !==
      "crane tunnel lumber ladder cement helmet hammer timber bridge orange harbor brick",
);
const box = page.locator("input[type=checkbox]:visible").first();
if (await box.count()) await box.check({ force: true });
await page.waitForTimeout(500);
const fields = page.locator("fieldset input:visible");
say(`verify fields: ${await fields.count()}`);
await fields.nth(0).fill(words[2]);
await fields.nth(1).fill(words[8]);
await page.waitForTimeout(500);
say(`backup buttons: ${JSON.stringify(await buttons(page))}`);
await press(page, /^continue$|i have|backed|done|next/i);
say(`funds: ${JSON.stringify(await buttons(page))} | ${JSON.stringify(await texts(page, "dd"))}`);
// Fund the new account from the deploy wallet.
const key = readFileSync(FUNDER, "utf8").trim();
execFileSync(
  "cast",
  ["send", address, "--value", "1ether", "--rpc-url", RPC, "--private-key", key],
  { stdio: "ignore" },
);
await page.waitForTimeout(9000);
say(
  "funds after transfer: " +
    JSON.stringify(await texts(page, "dd")) +
    " status " +
    JSON.stringify(await texts(page, "p[role=status]")),
);
await press(page, /^continue$/i);
await page.waitForTimeout(4000);
say(
  "account check: " +
    JSON.stringify(await texts(page, "ol li")) +
    " " +
    JSON.stringify(await buttons(page)),
);
// The check reads Monad's public node, which now and then refuses a request: try again as a person would.
say(
  `account check says: ${(await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 500)}`,
);
for (let i = 0; i < 3 && (await buttons(page)).some((b) => /try again/i.test(b)); i++) {
  await press(page, /try again/i);
  await page.waitForTimeout(5000);
}
await press(page, /^continue$/i);
say(`rules: ${JSON.stringify(await buttons(page))}`);
await press(page, /continue|use|start|save|next/i);
say(`done: ${JSON.stringify(await buttons(page))} h1 ${JSON.stringify(await texts(page, "h1"))}`);
// ── A site: NovaSwap on the live showcase ──
const site = await context.newPage();
site.on("pageerror", (e) => console.log("SITE PAGEERROR", e.message.slice(0, 200)));
await site.goto(SITE);
await site.waitForTimeout(4000);
const announced = await site.evaluate(
  () =>
    new Promise((res) => {
      const found = [];
      window.addEventListener("eip6963:announceProvider", (e) =>
        found.push(`${e.detail.info.name} ${e.detail.info.rdns}`),
      );
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      setTimeout(() => res(found), 500);
    }),
);
expect(
  "the site hears Baret over EIP-6963",
  announced.some((n) => n.includes("dev.baret.wallet")),
  JSON.stringify(announced),
);
say(
  "chainId via window.ethereum: " +
    (await site.evaluate(() => window.ethereum?.request({ method: "eth_chainId" }))),
);
say(
  "accounts before connect: " +
    JSON.stringify(await site.evaluate(() => window.ethereum.request({ method: "eth_accounts" }))),
);
say(`site buttons: ${JSON.stringify((await buttons(site)).slice(0, 20))}`);
const waitWindow = () => context.waitForEvent("page", { timeout: 20000 });
// Connect through the provider directly: what any dapp does.
const popupPromise = waitWindow();
const connecting = site.evaluate(() =>
  window.ethereum.request({ method: "eth_requestAccounts" }).then(
    (a) => JSON.stringify(a),
    (e) => `ERR ${e.code} ${e.message}`,
  ),
);
const win = await popupPromise;
win.on("pageerror", (e) => console.log("WIN PAGEERROR", e.message.slice(0, 300)));
await win.waitForTimeout(2500);
say(`request window: ${win.url()} ${JSON.stringify(await buttons(win))}`);
say(`window text: ${(await win.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
await press(win, /^connect/i);
const connected = await connecting;
expect(
  "the site gets the account after Connect",
  connected.toLowerCase().includes(address.toLowerCase()),
  connected,
);
say(
  "accounts after connect: " +
    JSON.stringify(await site.evaluate(() => window.ethereum.request({ method: "eth_accounts" }))),
);
await win.waitForTimeout(1500);
say(
  "window after connect closed? " +
    win.isClosed() +
    (win.isClosed() ? "" : ` ${JSON.stringify(await buttons(win))}`),
);
if (!win.isClosed()) {
  await win
    .getByRole("button")
    .first()
    .click()
    .catch(() => {});
}
await site.waitForTimeout(1200);

const send = (tx) =>
  site.evaluate(
    (t) =>
      window.ethereum.request({ method: "eth_sendTransaction", params: [t] }).then(
        (h) => `HASH ${h}`,
        (e) => `ERR ${e.code} ${e.message}`,
      ),
    tx,
  );
const view = async (w) => (await w.locator("body").innerText()).replace(/\s+/g, " ");

// The attack: an unlimited dUSDC allowance to NovaSwap's look-alike drainer.
const DUSDC = "0x5BB6fF1FCbE31ED8FBce6805852Ce279475522fc";
const DRAINER = "eB9EBB97BcD146FF1a4424490cbE8e19b7983888";
const attack = {
  from: address,
  to: DUSDC,
  data: `0x095ea7b3${DRAINER.toLowerCase().padStart(64, "0")}${"f".repeat(64)}`,
  value: "0x0",
};
let wp = waitWindow();
const attacking = send(attack);
const w2 = await wp;
w2.on("pageerror", (e) => console.log("WIN PAGEERROR", e.message.slice(0, 300)));
await w2.waitForTimeout(9000);
const t2 = await view(w2);
say(`attack window: ${t2.slice(0, 420)}`);
say(`attack buttons: ${JSON.stringify(await buttons(w2))}`);
expect("the attack reads Blocked", /blocked/i.test(t2));
expect("no sign button on a block", !(await buttons(w2)).some((b) => /^sign/i.test(b)));
await w2
  .getByRole("button", { name: /decline|close|back|done/i })
  .first()
  .click();
const refused = await attacking;
expect("the site is told the request was refused", refused.startsWith("ERR 4001"), refused);

// An honest transfer: 0.01 MON to the demo merchant.
wp = waitWindow();
const paying = send({
  from: address,
  to: "0x1365566191bAA9872A64AcDce963751d5343ff49",
  value: "0x2386f26fc10000",
});
const w3 = await wp;
w3.on("pageerror", (e) => console.log("WIN PAGEERROR", e.message.slice(0, 300)));
await w3.waitForTimeout(9000);
const t3 = await view(w3);
say(`honest window: ${t3.slice(0, 380)}`);
say(`honest buttons: ${JSON.stringify(await buttons(w3))}`);
expect("the honest transfer reads Safe", /safe/i.test(t3) && !/blocked/i.test(t3.slice(0, 200)));
await w3.getByRole("button", { name: /^sign/i }).first().click();
const paid = await paying;
expect("the site gets a transaction hash", /^HASH 0x[0-9a-f]{64}$/.test(paid), paid);
await site.waitForTimeout(6000);
say(`after signing: ${w3.isClosed() ? "window closed" : (await view(w3)).slice(0, 260)}`);
const hash = paid.replace("HASH ", "");
const receipt = await site.evaluate(
  (h) => window.ethereum.request({ method: "eth_getTransactionReceipt", params: [h] }),
  hash,
);
expect(
  "the transfer is in a block",
  receipt?.status === "0x1",
  JSON.stringify({ status: receipt?.status, block: receipt?.blockNumber }),
);
const log = await sw.evaluate(async () => {
  const s = (await chrome.storage.local.get("baret.state"))["baret.state"];
  return JSON.stringify({
    sites: s.sites.map((x) => [x.origin, x.status]),
    activity: s.activity.map((a) => [a.kind, a.status, a.verdict]),
  });
});
say(`stored: ${log}`);
expect("the blocked attack is in the log", /"blocked"/.test(log));

// ── The toolbar popup, as a page ──
const pop = await context.newPage();
pop.on("pageerror", (e) => console.log("POP PAGEERROR", e.message.slice(0, 300)));
await pop.goto(`chrome-extension://${id}/popup.html`);
await pop.waitForTimeout(5000);
const home = (await pop.locator("body").innerText()).replace(/\s+/g, " ");
say(`popup home: ${home.slice(0, 300)}`);
expect("the popup shows no sample notice", !/sample/i.test(home));
expect(
  "the popup shows a real balance under 1 MON",
  /0\.9\d/.test(home),
  home
    .match(/\d+\.\d+/g)
    ?.slice(0, 4)
    .join(","),
);
say(`popup buttons: ${JSON.stringify((await buttons(pop)).slice(0, 16))}`);
// Lock from the popup's settings tab, then open again with the passphrase.
await pop
  .getByRole("button", { name: /settings/i })
  .first()
  .click();
await pop.waitForTimeout(800);
await pop.getByRole("button", { name: /^lock/i }).first().click();
await pop.waitForTimeout(1500);
const lockedText = (await pop.locator("body").innerText()).replace(/\s+/g, " ");
expect("locking shows the lock screen", /passphrase/i.test(lockedText), lockedText.slice(0, 140));
expect(
  "a locked wallet shows the site no account",
  (await site.evaluate(() => window.ethereum.request({ method: "eth_accounts" }))).length === 0,
);
expect(
  "the open phrase left session storage",
  !(await sw.evaluate(async () => Object.keys(await chrome.storage.session.get(null)))).includes(
    "baret.session.phrase",
  ),
);
await pop.locator("input[type=password]").first().fill("wrong passphrase 123");
await pop.locator("form button[type=submit]").first().click();
await pop.waitForTimeout(3000);
expect("a wrong passphrase opens nothing", (await pop.locator("input[type=password]").count()) > 0);
await pop.locator("input[type=password]").first().fill(PASS);
await pop.locator("form button[type=submit]").first().click();
await pop.waitForTimeout(4000);
expect(
  "the right passphrase opens the wallet",
  (await pop.locator("input[type=password]").count()) === 0,
);

// ── NovaSwap's own buttons, with Baret picked from its wallet list ──
await site.reload();
await site.waitForTimeout(3500);
await site
  .getByRole("button", { name: /connect wallet/i })
  .first()
  .click();
await site.waitForTimeout(1500);
say(`picker: ${JSON.stringify((await buttons(site)).slice(0, 14))}`);
await site
  .getByRole("button", { name: /^close$/i })
  .first()
  .click()
  .catch(() => {});
await site.waitForTimeout(500);
const modes = await texts(site, "[role=radio]:visible, [role=tab]:visible, label:visible");
say(`modes: ${JSON.stringify(modes.slice(0, 10))}`);
await site
  .getByText(/attack version/i)
  .first()
  .click()
  .catch(() => {});
await site.waitForTimeout(1000);
const amountField = site.locator("main input:visible").first();
say(
  "inputs: " +
    (await site.locator("main input:visible").count()) +
    " value " +
    (await amountField.inputValue().catch(() => "?")),
);
// The attack sells dUSDC: take 100 from the site's faucet first, through Baret.
const openWindow = () =>
  context.pages().find((p) => p.url().includes("popup.html?request=1") && !p.isClosed()) ?? null;
const wpF = context.waitForEvent("page", { timeout: 12000 }).catch(() => null);
await site
  .getByRole("button", { name: /get 100 test dusdc/i })
  .first()
  .click();
const wF = (await wpF) ?? openWindow();
if (wF) {
  await wF.waitForTimeout(9000);
  const tF = (await wF.locator("body").innerText()).replace(/\s+/g, " ");
  say(`faucet in Baret: ${tF.slice(0, 200)} | ${JSON.stringify(await buttons(wF))}`);
  expect("the site's faucet call is not blocked", !/Verdict: Blocked/.test(tF), tF.slice(0, 40));
  await wF
    .getByRole("button", { name: /^sign/i })
    .first()
    .click()
    .catch(() => {});
  await site.waitForTimeout(9000);
  if (!wF.isClosed())
    await wF
      .getByRole("button", { name: /back|done|close/i })
      .first()
      .click()
      .catch(() => {});
  await site.waitForTimeout(1500);
} else say("the faucet opened no window");
say(`card: ${(await site.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 500)}`);
const wp4 = context.waitForEvent("page", { timeout: 12000 }).catch(() => null);
await site
  .getByRole("button", { name: /sign with your wallet/i })
  .first()
  .click();
await site.waitForTimeout(2500);
say(`site after sign press: ${JSON.stringify((await buttons(site)).slice(0, 14))}`);
const w4 = (await wp4) ?? openWindow();
if (w4) {
  await w4.waitForTimeout(9000);
  const t4 = (await w4.locator("body").innerText()).replace(/\s+/g, " ");
  say(`NovaSwap attack in Baret: ${t4.slice(0, 330)}`);
  say(`buttons: ${JSON.stringify(await buttons(w4))}`);
  expect("NovaSwap's own attack button ends at Blocked in the extension", /blocked/i.test(t4));
  await w4
    .getByRole("button", { name: /decline/i })
    .first()
    .click()
    .catch(() => {});
  await site.waitForTimeout(2500);
  say(
    "site says: " +
      (await site.locator("main").innerText())
        .replace(/\s+/g, " ")
        .match(/[^.]*(refus|declin|reject|blocked|nothing was signed)[^.]*\./i)?.[0],
  );
} else {
  say(
    "no request window opened; site text: " +
      (await site.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 400),
  );
}
const finalLog = await sw.evaluate(async () =>
  JSON.stringify(
    (await chrome.storage.local.get("baret.state"))["baret.state"].activity.map((a) => [
      a.kind,
      a.status,
      a.values,
    ]),
  ),
);
say(`log rows: ${finalLog}`);
expect(
  "no placeholder is left in a log row",
  !/\{/.test(
    finalLog.replace(/^\[|\]$/g, "").replace(/\{"[a-z]+":"[^"]*"(,"[a-z]+":"[^"]*")*\}|\{\}/g, ""),
  ),
);

// ── What the wallet keeps from what it signed: grants, payments, a second account ──
const state = () =>
  sw.evaluate(async () => (await chrome.storage.local.get("baret.state"))["baret.state"]);
const USDC = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const MERCHANT = "0x1365566191bAA9872A64AcDce963751d5343ff49";
const pad = (hex) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const signIn = async (w) => {
  await w.waitForTimeout(9000);
  const t = await view(w);
  await w.getByRole("button", { name: /^sign/i }).first().click();
  return t;
};

// An allowance of 1 test USDC to the demo merchant: signed, so it goes on the list.
wp = waitWindow();
const allowing = send({
  from: address,
  to: USDC,
  data: `0x095ea7b3${pad(MERCHANT)}${pad((1_000_000).toString(16))}`,
  value: "0x0",
});
const w5 = await wp;
say(`allowance window: ${(await signIn(w5)).slice(0, 160)}`);
const allowed = await allowing;
await site.waitForTimeout(7000);
const grantId = `allowance:${USDC.toLowerCase()}:${MERCHANT.toLowerCase()}:main`;
const listed = (await state()).permissions.find((p) => p.id === grantId);
expect(
  "a signed allowance is on the allowances list",
  listed?.kind === "allowance" && listed.amount === "1" && listed.asset === "USDC",
  `${allowed.slice(0, 16)} ${JSON.stringify(listed ?? null).slice(0, 160)}`,
);
if (!w5.isClosed()) await w5.close().catch(() => {});

// Revoking it on the options page is a transaction: the row goes once Monad confirmed it.
await page.goto(`chrome-extension://${id}/options.html#/permissions`);
await page.waitForTimeout(3000);
say(`allowances page: ${JSON.stringify((await buttons(page)).slice(0, 14))}`);
await page
  .getByRole("button", { name: /revoke the 1 permission/i })
  .first()
  .click();
await page.waitForTimeout(1200);
say(`after revoke press: ${JSON.stringify((await buttons(page)).slice(-6))}`);
// The dialog's own confirm button, when the page asks first.
await page
  .getByRole("dialog")
  .getByRole("button", { name: /revoke/i })
  .first()
  .click({ timeout: 4000 })
  .catch(() => {});
let open = true;
for (let i = 0; i < 20 && open; i++) {
  await page.waitForTimeout(1500);
  open = (await state()).permissions.some((p) => p.id === grantId);
}
const left = await site.evaluate(
  ([token, owner, spender]) =>
    window.ethereum.request({
      method: "eth_call",
      params: [{ to: token, data: `0xdd62ed3e${owner}${spender}` }, "latest"],
    }),
  [USDC, pad(address), pad(MERCHANT)],
);
expect("the revoke took the row off the list", !open);
expect("the allowance is zero on Monad", BigInt(left) === 0n, left);

// An x402 payment message (EIP-3009). With no USDC in the wallet Baret stops it,
// and the payments page says why; with USDC it is signed and listed as checked.
const paymentMessage = (nonce) => ({
  domain: { name: "USDC", version: "2", chainId: 10143, verifyingContract: USDC },
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: {
    from: address,
    to: MERCHANT,
    value: "50000",
    validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + 600),
    nonce,
  },
});
const askPayment = (nonce) =>
  site.evaluate(
    ([from, data]) =>
      window.ethereum.request({ method: "eth_signTypedData_v4", params: [from, data] }).then(
        (sig) => `SIG ${sig}`,
        (e) => `ERR ${e.code} ${e.message}`,
      ),
    [address, JSON.stringify(paymentMessage(nonce))],
  );

wp = waitWindow();
const refusedPayment = askPayment(`0x${"5a".repeat(32)}`);
const w6 = await wp;
await w6.waitForTimeout(9000);
const t6 = await view(w6);
say(`payment with no USDC: ${t6.slice(0, 200)}`);
expect("a payment the wallet cannot cover reads Blocked", /blocked/i.test(t6));
await w6
  .getByRole("button", { name: /decline/i })
  .first()
  .click();
expect("the site is told the payment was refused", (await refusedPayment).startsWith("ERR"));
await site.waitForTimeout(1500);
const problems = (await state()).problems;
expect(
  "the blocked payment is on the payments page with its reason",
  problems.length === 1 &&
    problems[0].merchant === MERCHANT &&
    problems[0].values.amount === "0.05",
  JSON.stringify(problems[0] ?? null).slice(0, 200),
);
if (!w6.isClosed()) await w6.close().catch(() => {});

// The same payment once the wallet holds test USDC (BARET_USDC_FUNDER_KEY_FILE pays 0.2).
const usdcFunder =
  process.env.BARET_USDC_FUNDER_KEY_FILE ??
  join(process.env.HOME ?? "", ".baret/playground-agent.key");
let usdcKey = null;
try {
  usdcKey = readFileSync(usdcFunder, "utf8").trim();
} catch {
  say("no USDC funder key: the signed payment is not checked");
}
if (usdcKey) {
  execFileSync(
    "cast",
    [
      "send",
      USDC,
      "transfer(address,uint256)",
      address,
      "200000",
      "--rpc-url",
      RPC,
      "--private-key",
      usdcKey,
    ],
    { stdio: "ignore" },
  );
  await site.waitForTimeout(4000);
  const nonce = `0x${"5b".repeat(32)}`;
  wp = waitWindow();
  const paying402 = askPayment(nonce);
  const w7 = await wp;
  await w7.waitForTimeout(9000);
  say(`payment window: ${(await view(w7)).slice(0, 200)} | ${JSON.stringify(await buttons(w7))}`);
  await w7.getByRole("button", { name: /^sign/i }).first().click();
  const signature = await paying402;
  await site.waitForTimeout(1500);
  const payment = (await state()).payments.find(
    (p) => p.id === `${address.toLowerCase()}:${nonce}`,
  );
  expect(
    "the site gets the payment's signature",
    /^SIG 0x[0-9a-f]{130}$/.test(signature),
    signature.slice(0, 24),
  );
  expect(
    "a signed x402 payment is on the payments page",
    payment?.amount === "0.05" && payment.asset === "USDC" && payment.stage === "checked",
    JSON.stringify(payment ?? null).slice(0, 200),
  );
  if (!w7.isClosed()) await w7.close().catch(() => {});

  // The site's own caps, kept in the wallet: 0.05 was just paid, and an hourly
  // cap of 0.07 has no room for another 0.05. Then the site is paused.
  const host = new URL(site.url()).host;
  const setCard = (status) =>
    sw.evaluate(
      async ([origin, cardStatus]) => {
        const s = (await chrome.storage.local.get("baret.state"))["baret.state"];
        const at = new Date().toISOString();
        const card = {
          id: "caps-verify",
          kind: "payment",
          origin,
          account: s.active,
          status: cardStatus,
          granted: at,
          lastUsed: null,
          holder: origin,
          uses: [],
          merchant: origin,
          asset: "USDC",
          caps: { perPayment: "0.10", hour: "0.07", day: "1.00" },
          spent: { hour: "0.00", day: "0.00" },
          paymentsToday: 0,
          facilitator: "",
          week: [0, 0, 0, 0, 0, 0, 0],
        };
        const permissions = [...s.permissions.filter((x) => x.id !== card.id), card];
        await chrome.storage.local.set({ "baret.state": { ...s, permissions } });
      },
      [host, status],
    );
  await setCard("active");
  await site.waitForTimeout(1000);
  wp = waitWindow();
  const overCap = askPayment(`0x${"5c".repeat(32)}`);
  const w8 = await wp;
  await w8.waitForTimeout(5000);
  const t8 = await view(w8);
  say(`payment over the site's cap: ${t8.slice(0, 260)} | ${JSON.stringify(await buttons(w8))}`);
  expect(
    "a payment over the site's hourly cap reads Blocked and names the cap",
    /blocked/i.test(t8) && /hourly cap/i.test(t8),
  );
  expect(
    "a payment over the site's cap has no sign button",
    !(await buttons(w8)).some((b) => /^sign/i.test(b)),
  );
  await w8
    .getByRole("button", { name: /decline/i })
    .first()
    .click();
  const capAnswer = await overCap;
  expect("the site is told its payment is over a cap", /over a cap/i.test(capAnswer), capAnswer);
  if (!w8.isClosed()) await w8.close().catch(() => {});

  // The closing window saves its log row first: the card is written after it.
  await site.waitForTimeout(2500);
  await setCard("paused");
  await site.waitForTimeout(1000);
  wp = waitWindow();
  const paused = askPayment(`0x${"5d".repeat(32)}`);
  const w9 = await wp;
  await w9.waitForTimeout(5000);
  const t9 = await view(w9);
  say(`payment to a paused site: ${t9.slice(0, 200)}`);
  expect("a payment to a paused site reads Blocked", /blocked/i.test(t9));
  await w9
    .getByRole("button", { name: /decline/i })
    .first()
    .click();
  const pausedAnswer = await paused;
  expect("the site is told it is paused", /is paused/i.test(pausedAnswer), pausedAnswer);
  expect(
    "neither refused payment was signed",
    (await state()).payments.every((x) => !/5c5c|5d5d/.test(x.id)),
  );
  if (!w9.isClosed()) await w9.close().catch(() => {});
}

// A second account: the recovery phrase's next one, not a made-up address.
await pop.reload();
await pop.waitForTimeout(3000);
say(`popup: ${JSON.stringify((await buttons(pop)).slice(0, 12))}`);
await pop
  .getByRole("button", { name: /account 1|accounts|switch/i })
  .first()
  .click();
await pop.waitForTimeout(800);
await pop
  .getByRole("button", { name: /add account/i })
  .first()
  .click();
await pop.waitForTimeout(600);
await pop.locator("input:visible").first().fill("Savings");
await pop.locator("form button[type=submit]").first().click();
await pop.waitForTimeout(2500);
const accounts = (await state()).accounts;
const second = accounts[1]?.address ?? "";
say(`accounts: ${JSON.stringify(accounts.map((a) => [a.id, a.name, a.address]))}`);
expect(
  "a second account is added with an address of its own",
  accounts.length === 2 && /^0x[0-9a-fA-F]{40}$/.test(second) && second !== address,
);
await context.close();
process.exit(failed ? 1 : 0);
