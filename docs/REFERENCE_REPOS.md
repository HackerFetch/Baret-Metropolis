# Baret — Referans Repolar (5 Eski Versiyon) Karşılaştırmalı İnceleme

> `baret-repos/` altında yerel olarak duran (gitignore'da, asla commit edilmeyen) beş eski Baret versiyonunun kod seviyesinde incelenmesi. Amaç: Monad rewrite'ında neyi yeniden kullanacağımızı, neyi kesinlikle tekrar etmeyeceğimizi bilmek. Her repo tam okundu (kaynak dosyalar, testler, kontratlar, git geçmişi). Hepsi Ezgin (GitHub `Aeztrest`) tarafından yazılmış.

Son güncelleme: 2026-09-15 · İnceleyen: Meriç + Claude

---

## 0. Tek Bakışta

| | Baret-EVM | Baret-Stellar | CasperBaret | Baret-Midnight | Baret-OKX |
|---|---|---|---|---|---|
| **Zincir** | EVM, tüm varsayılanlar **Monad testnet 10143** | Stellar testnet (Soroban) | Casper testnet | Midnight preprod (ZK) | Çok-zincir calldata analizi; OKX.AI agent pazaryeri için x402 servisi |
| **Tarih** | 16–20 Tem 2026 | 3 Haz – 17 Ağu 2026 | 13 Haz – 27 Tem 2026 | 28 Ağu 2026 (tek gün) | 16–28 Tem 2026 |
| **Commit / dosya** | 34 / 284 | 48 / 530 | 98 / 310 | 13 / 89 | 23 / 33 |
| **Olgunluk** | Orta — gerçek simülasyon var, extension canlı test edildi | **En olgun** — en çok test, CI, gerçek x402 settlement, on-chain sub-key policy | Orta — x402 gerçek, simülasyon yok | Prototip — hiçbir şey zincire çıkmadı | Küçük ama temiz mikroservis, gerçek x402 ödeme |
| **Gerçek simülasyon** | ✅ `eth_call` + `debug_traceCall` | ✅ Horizon + Soroban preflight | ❌ 4 heuristik | ❌ girdi dışarıdan verilir | ❌ sadece `getCode` + `getBalance` |
| **Dedektör (gerçek çıkan kod)** | 22 | ~16 | 10 | 8 | 10 |
| **Policy şablonları** | Strict/Balanced/Permissive | Strict/Balanced/Permissive (+ölü DSL) | Strict/Balanced/Permissive | Yok (sadece cap) | Strict/Balanced/Permissive (eşik+ignore) |
| **Kontrat** | `PaymentGuard.sol` — **Monad testnet'te deploy** | `MerchantSpendPolicy` (Soroban, co-signer policy) + eski `PaymentGuard` | `PaymentGuard` + `Cep18x402` (Odra/Rust), deploy | `merchant-spend-policy.compact` — deploy edilmedi | Yok |
| **Extension** | ✅ MV3, EIP-1193/6963, x402 interceptor | ✅ MV3, en gelişmiş (sub-key, mandate, drift) | ✅ MV3, Casper | ✅ MV3, Lace proxy (iki bug) | Yok |
| **Showcase 6 site** | ✅ Stellar'dan port | ✅ orijinal | ✅ | 5 farklı isim | Landing page |
| **agent-kit / CLI** | `GuardedWallet` + `premon` CLI (exit 2 = blok) | `AgentWallet` + `baret` CLI (exit 1 = blok) + attestation | Yok (MCP agent var) | Yok | Yok (MCP tool var) |
| **Test** | server 20+, guard 3, agent-kit 4, forge 11 | **~215 vitest + 40 Rust**, CI 3 job | Az, CI yok | 22 vitest, CI test koşmuyor | 39 vitest, CI var |
| **Bilinen büyük eksik** | Extension "Sign anyway" ile bloğu geçer; delta'lar calldata'dan, trace'ten değil | 11 finding kodu hiç emit edilmiyor; analyzer URL localhost'a sabit | Simülasyon yok, 18 policy alanı no-op | Extension gerçek Lace payload'ını decode edemiyor | Bilinmeyen network sessizce fallback |

---

## 1. Soy Ağacı (hangisi hangisinden türedi)

```
"DeltaGuard" / "Blackthorn"  (Solana, Swig sub-key)   ← kod yok, sadece izler (DELTAG_* env, cpi.ts, blackthron_docs)
        │
        ├──► Baret-Stellar   (3 Haz → 17 Ağu)  en uzun yaşayan, en olgun; WALLET.md/FRONTEND.md buradan uyarlandı
        │        │
        │        ├──► CasperBaret    (13 Haz → 27 Tem)  Stellar şekilli ext-protocol'den port
        │        │
        │        └──► Baret-EVM      (16 → 20 Tem)  "Premon" markası, Monad testnet varsayılan
        │                 │
        │                 └──► Baret-OKX  (16 → 28 Tem)  EVM analizinin tek-servis versiyonu ("Vetra" → Baret)
        │
        └──► Baret-Midnight  (28 Ağu)  showcase şekli Stellar'dan, kod sıfırdan, ZK/Compact
```

**Önemli:** Baret-EVM zaten Monad'ı hedefliyor. `PaymentGuard.sol` Monad testnet'te `0x1e09E971c53bD59e481Ef02147C6CeeBf0B09717` adresinde deploy edilmiş (USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3`). Bu, yeni projenin en yakın başlangıç noktası — ama git geçmişi taşınmayacak, kod sıfırdan yazılacak (D-001).

---

## 2. Repo Kartları

### 2.1 Baret-EVM ("Premon") — en yakın akraba

- **Yapı:** pnpm monorepo. `apps/server` (Fastify 5 + ethers 6 + zod), `apps/extension` (MV3, ~8.8k satır), `apps/wallet` (plaintext localStorage key — demo), `apps/showcase`, `packages/guard`, `packages/agent-kit`, `packages/wallet-adapter`, `packages/ext-protocol`, `packages/ui`, `packages/showcase-ui`, `contracts/` (Foundry).
- **Pipeline:** decode (`ethers.Transaction.from` veya `{from,to,value,data}`) → adres toplama (ABI decode: transfer/transferFrom/approve/permit/setApprovalForAll/safeTransferFrom/transferOwnership) → paralel `eth_getBalance`/`eth_getCode`/`balanceOf`/`eth_call`/`eth_estimateGas`/`debug_traceCall` → calldata'dan delta projeksiyonu → 9 dedektör → fail-closed policy → öneriler → in-memory audit.
- **Dedektörler:** simulation, programs, cpi (trace derinliği), reputation (2 seed adres), compute (gas), approvals, evm-danger (SELFDESTRUCT critical, DELEGATECALL, OWNERSHIP_TRANSFER, PERMIT, NATIVE_TRANSFER_TO_CONTRACT), x402. Policy motorunda `LOSS_PERCENT_UNAVAILABLE`, `ESTIMATED_LOSS_EXCEEDS_MAX`, `POST_BALANCE_TOO_LOW`.
- **API:** `/health`, `/health/ready`, `/v1/analyze`, `/v1/analyze/batch` (≤25), `/v1/analyze/stream` (SSE), `/v1/replay`, `/v1/audit/*`, `/mcp/tools|call` (gerçek MCP transport değil, düz JSON), `/demo/scrybe` (402 döner ama header'ı **doğrulamaz**), `/demo/novaswap/*` (gerçek MON↔USDC swap vault).
- **Kontrat:** `PaymentGuard.sol` — tek owner, tek token, merchant başına `capPerTx/capPerDay`, Active/Paused/Revoked, kendi reentrancy kilidi, 10 test + 1 fuzz. **Eksikler:** `pay()` herkes çağırabilir (agent allowlist yok), pencere gerçek kayan değil (sabit başlangıç + 24h), non-standard ERC-20 revert eder, hiçbir app kontratı çağırmıyor.
- **Extension:** EIP-1193 + EIP-6963 (`rdns dev.premon.wallet`), PBKDF2 100k + AES-GCM, IndexedDB + storage.local yedek, BIP-44, 15 dk idle kilit, popup pencere anchoring, x402 fetch interceptor (canlı test edilmiş), 9 adımlı x402 review pipeline'ı, native bakiye drift monitörü (12 sn polling). **Blok kararı bağlayıcı değil** ("Sign anyway" butonu). x402 auto-approve analizden geçmeden imzalıyor. Analyzer URL + `dev-key-change-me` API key hardcoded.
- **Showcase senaryoları:** NovaSwap (unlimited approve), PixelDrop (setApprovalForAll), OrbitYield (100 MON deposit → loss %), ClaimHub (9.9 MON → "malicious" adres — **ama seed adres uyuşmuyor, bug**), LaunchPad (500 MON → revert), Scrybe (x402).
- **agent-kit:** `GuardedWallet.sendTransaction()` → evaluate → `GuardBlockedError` → ethers Wallet. CLI `premon address|analyze|send|policy`, exit 0/2/1. `evaluate()` gas alanlarını düşürüyor → gas dedektörleri agent için hiç çalışmıyor.
- **İsim borcu:** `@premon/*`, `DELTAG_*`, `cpi.ts` (Solana), `assetIssuer`/`signedTxXdr` (Stellar), "any EVM chain" kopyası.

### 2.2 Baret-Stellar — en olgun, UI/spec kaynağı

- **Yapı:** `apps/server`, `apps/extension`, `apps/showcase`, `apps/wallet` (vestigial), `packages/swig-guard`, `packages/agent-guard`, `packages/baret-adapter`, `packages/ext-protocol`, `packages/ui` (oklch token + shadcn + Baret primitifleri), `packages/showcase-ui`, `contracts/` (2 Soroban kontratı), `docs/` (3.462 satır spec), `baret_docs/` (Solana-devri stale Next.js docs sitesi).
- **Pipeline:** XDR decode (fee-bump unwrap) → hesap/kontrat/asset toplama → paralel Horizon `loadAccount` + Soroban `simulateTransaction` (auth stripped) → bigint stroop delta'lar (Soroban token event'leri dahil) → auth tree parse → 7 dedektör → fail-closed policy → öneriler → **Ed25519 verdict attestation** → in-memory audit → response Zod doğrulama → x402 settle.
- **x402 (gerçek):** `@x402/core` + `@x402/stellar` ile `/v1/analyze` paywall'u; `/demo/scrybe` facilitator `/verify` + `/settle` çağırıyor (payai / x402.org). Extension null-source SAC transfer'ın sadece auth entry'sini imzalıyor, facilitator fee-bump + submit ediyor.
- **Kontrat `MerchantSpendPolicy`:** passkey-kit `PolicyInterface` co-signer; deny-by-default `policy__`: tek context, `transfer`, `from == wallet`, merchant başına `signer` bağlama (`WrongSigner`), Active, expiry, per-tx, **gerçek kayan 24h pencere** (`spend_log`), TTL uzatma; `install/uninstall` guard'ı. 14 test, testnet deploy `CCWTPB4F…`. PR #18 → #19 hikayesi önemli: ilk deploy'da policy signer olarak kurulmamıştı, enforcement inertti; #19 düzeltti.
- **Extension (en gelişmiş):** state machine (uninitialized/locked/ready/signing/alert), port router, PBKDF2 **600k** + iteration upgrade, attempt limiter (5 deneme → backoff), SEP-0005 HD multi-account, IndexedDB v4 (allowances atomik `tryReserveSpend/release`, TOFU mandate promotion nonce-guarded, account-scoped migration), Horizon drift monitörü, Shadow-DOM "Baret is guarding" overlay, **1.5 sn basılı tutarak override** (blok sürtünmesi), Freighter-uyumlu inpage API, x402 9-adım pipeline + sub-key provisioning (best-effort; passphrase cache 5 dk geçince sessizce atlanıyor).
- **Showcase:** 6 site + Hub + `/agents` (canlı playground + audit feed) + `/install` + `/docs`; "Send with unprotected wallet" dürüst karşılaştırması; RiskPreview / ResultOverlay / WalletModal bileşenleri.
- **agent-guard:** `AgentWallet.fromSecret/random`, `evaluate/guardedSign/guardedSubmit`, `allowOffline` kaçış kapısı, pinned server key ile attestation doğrulama, config `~/.baret/config.json` (0600). CLI `baret analyze|sign|submit|address|init|policy list`, **exit 0 allow / 1 blocked / 2 error** — bizim `ARCHITECTURE.md` §8.6 bunu takip ediyor.
- **Eksikler:** 11 finding kodu (ACCOUNT_MERGE, MASTER_KEY_REMOVED, SIGNER_CHANGE…) hiç emit edilmiyor → 3 policy bayrağı ölü; reputation DB'de tek geçersiz seed; extension analyzer'ı `localhost:8080`'e sabit; policy DSL/profiles hiç kullanılmıyor; `LIMITATIONS.md`/`x402-defense.md` stale; docs ile kod arasında şablon değeri/alan adı uyuşmazlıkları; Dockerfile paket adı yanlış; sdk versiyon kayması.

### 2.3 CasperBaret ("Blackthorn") — x402 gerçek, simülasyon yok

- **Yapı:** Stellar'la aynı iskelet; `packages/casper-core`, `packages/casper-guard`, `apps/agent-mcp` (stdio MCP server + Claude demo agent), `contracts/` (Odra 2.7 Rust), `blackthron_docs/` (Solana-devri Tailwind template — alakasız), iki ölü paket (`blackthorn-adapter`, boş `showcase-ui`).
- **Analiz:** `parseIntent()` Casper Deploy/TransactionV1 JSON'ı sığ decode ediyor → 4 pure dedektör (contract exposure, allowance, transfer loss-%, x402 shape) → policy. `LIMITATIONS.md` dürüstçe "simülasyon yok" diyor ama showcase "25+ dedektör, WebSocket monitor" iddia ediyor. `makeSpeculativeClient` var ama hiç çağrılmıyor; `monitor.ts` no-op.
- **x402 (gerçek):** EIP-712 `TransferWithAuthorization` (`@casper-ecosystem/casper-eip-712`), `raw` ve `casperMessage` imza şemaları (resmi Casper Wallet için), built-in facilitator (`/facilitate/verify|settle|supported`) treasury key ile `transfer_with_authorization` submit ediyor; gas ücreti imzalanan USDC tutarına katlanıyor. `X402_DEMO_MODE` sahte settlement. Overclaim düzeltme commit'i (`3c14e67`): "Casper'da x402 yoktu" iddiası yanlıştı, `make-software/casper-x402` daha önce vardı.
- **Kontratlar:** `Cep18x402` (CEP-18 + `transfer_with_authorization`, nonce replay, time window, 6 test), `PaymentGuard` (owner+tek agent slotu, merchant cap, rolling 24h, 13 test). İkisi de Casper testnet'te deploy; PaymentGuard hiçbir app'e bağlı değil (`provision.ts` no-op).
- **Policy:** 30+ alan tanımlı, server sadece 6'sını, extension 8'ini uyguluyor; **18 alan sessizce yok sayılıyor** ama UI'da toggle olarak duruyor. `refuseUnlimitedAllowances` yanlış implement edilmiş (her approve'u unlimited sayıyor).
- **Extension:** Stellar'ın portu; `window.baret` + `window.CasperWalletProvider`; sign flow, keystore, session aynı desen; analyzer offline → `advisory` + "Sign anyway" (fail-open). API key hardcoded, `vercel.json`'da commit edilmiş.
- **agent-mcp:** 3 tool (`check_balance`, `list_policy`, `ask_scrybe`), in-process spend log ile cap, Anthropic tool loop demo — "policy-capped agent" için kompakt örnek.
- **CI yok**, testler ince, `docker-compose.yml` bozuk, `DELTAG_*` + `blackthorn` isimleri ~25 yerde.

### 2.4 Baret-Midnight — ZK prototipi, tek günde yazılmış

- **Yapı:** `packages/policy-engine` (pure dedektörler), `contracts/merchant-spend-policy` (Compact 0.26 + proof-free simülatör + 12 test + headless preprod deploy CLI), `apps/server` (analyze + demo facilitator), `apps/extension` (Lace proxy), `apps/showcase` (5 senaryo), `spike/` (hello-world Compact — ADX CPU sorununu ortaya çıkaran deney).
- **Dedektörler:** `blind-sign` (bilinmeyen circuit → critical), `unlimited-approval`, `agentic-x402`, `policy-inactive/over-per-tx-cap/over-per-day-cap`, `balance-delta`, `contract-interactions`, `disclosure` (witness sızıntısı), `proving-mode`. Simülasyon yok; delta/disclosure girdileri dışarıdan veriliyor.
- **Kontrat:** commitment tabanlı yetki (`hash("baret:owner:" || sk) == commitment`), ACTIVE/PAUSED/REVOKED, per-tx + günlük cap; `mandateSeconds` saklanıyor ama **enforce edilmiyor**; `currentTime` prover-controlled witness (manipüle edilebilir). Deploy edilmedi (faucet güvenilmez).
- **Extension bug'ları:** `knownCircuits` hiç yazılmıyor → her çağrı blind-sign; cap'ler string, karşılaştırma bigint → günlük cap matematiği yanlış. Gerçek Lace payload'ı decode edilemiyor.
- **Öğrenilecek:** "bu işlem ne ifşa ediyor" bulgusunu birinci sınıf yapmak; prover/relayer'ı güven sınırı olarak modellemek (Monad'da bundler/paymaster karşılığı); zamanı asla çağırandan almamak (`block.timestamp`).

### 2.5 Baret-OKX ("Vetra") — tek servis, temiz

- **Ne:** OKX.AI Agent Service Provider (A2MCP) pazaryeri için x402-ölçümlü REST + MCP servisi. OKX API'si hiç kullanılmıyor; sadece OKX'in tanıdığı x402 `PaymentRequirements` formatı üretiliyor. Facilitator `x402.org`. Ödeme Base Sepolia'da **gerçek USDC ile çalışmış** (commit geçmişi kanıtlıyor); "TEMP" testnet ayarı hiç geri alınmamış.
- **Zincirler:** Ethereum, Base, Base Sepolia, Polygon, **Monad testnet 10143** (analiz-only; x402.org Monad'da settle etmiyor).
- **Analiz:** `parseTransaction` → `getCode` + `getBalance` → wrapper unwrapping (`multicall` ×2, Safe `execTransaction`, derinlik 2, ≤20 iç çağrı) → 9 selector allowlist → 10 kod. Policy = `blockSeverity` eşiği + `ignoreCodes`. **Fail-open** (RPC düşerse low finding ile devam).
- **MCP (gerçek SDK):** `POST /mcp` stateless Streamable HTTP; `tools/call` gövdesi sniff'lenip transport'a girmeden x402 verify; settle tool başarısından **sonra** — "verify-then-settle-after-success" disiplini iki yolda da var.
- **Zayıf:** REST body Zod'suz cast; bilinmeyen `network` sessizce config zincirine düşüyor; `rpcUrl` çağırandan → SSRF; `/v1/demo-check` motoru ücretsiz veriyor.
- **Kalite:** ~1.100 satır strict TS, "neden"i kaydeden yorumlar (başarısız ödemelerden öğrenilen 3 x402 spec düzeltmesi: network kısa adı + absolute resource, EIP-712 domain, Base Sepolia USDC adı "USDC").

---

## 3. Beş Versiyonda Tekrarlayan Hatalar (Monad'da yapmayacaklarımız)

1. **"25+ dedektör" iddiası hiçbir versiyonda doğru değil** (gerçek: 8–22). `docs/FRONTEND.md`'deki rakam kodla senkron tutulacak.
2. **Tanımlı ama hiç emit edilmeyen finding kodları** ve **UI'da görünen ama enforce edilmeyen policy alanları** (Stellar 11 kod / 3 bayrak, Casper 18 alan, EVM 5 kod + `refuseUnlimitedApprovals`). Kural: bir kod/alan ya implement edilir ya tanımlanmaz. QA bunu test edecek.
3. **Extension'da blok bağlayıcı değil** ("Sign anyway" — EVM, Casper; Stellar'da 1.5 sn basılı tutma var). Monad: blok = blok; override ancak policy `allowOverride` derse ve çift onayla.
4. **Analyzer'a ulaşılamayınca fail-open** (EVM/Casper `advisory`, OKX low finding). `ARCHITECTURE.md` §1.2 fail-closed diyor; extension bunu "Sign without protection" olarak açıkça etiketlemeli ama varsayılan primary olmamalı.
5. **Hardcoded analyzer URL + `dev-key-change-me`** her client'ta (EVM, Stellar `localhost:8080`, Casper). Monad: build-time env, extension `host_permissions`'a prod host.
6. **In-memory audit / reputation / replay guard** — restart'ta sıfırlanıyor. D-008: Envio.
7. **Reputation DB seed'i boş veya geçersiz** (EVM 2 sahte adres, Stellar Solana-formatlı tek adres, OKX boş). Monad: Nansen + ReputationRegistry (gerçek veri).
8. **Kontrat ↔ app kopukluğu:** EVM ve Casper PaymentGuard deploy edildi ama hiçbir client çağırmıyor; Stellar'da policy ilk deploy'da signer olarak kurulmamıştı. Monad: `apps/wallet` Agent Delegation sayfası kontratı gerçekten çağıracak, uçtan uca test edilecek (Meriç).
9. **Doküman kod'dan sapıyor** (stale LIMITATIONS, docs'ta farklı şablon değerleri, Solana-devri docs siteleri). CLAUDE.md kuralı: kod + doküman birlikte.
10. **Eski isimler taşınıyor** (`DELTAG_*`, `swig`, `blackthorn`, `cpi.ts`, `signedTxXdr`). D-002.
11. **Demo senaryosu ile dedektör uyuşmuyor** (EVM ClaimHub "malicious" adresi seed ile eşleşmiyor; Stellar Soroban "safe" senaryoları da `SIMULATION_FAILED` veriyor çünkü sahte kontratlar zincirde yok). Monad: showcase kontratları gerçekten deploy edilecek, her senaryonun beklenen bulgu kodu test edilecek.
12. **Testnet "TEMP" ayarı kalıcı oluyor** (OKX Base Sepolia). Deploy env'leri `docs/RESOURCES.md`'de takip edilecek.

---

## 4. Ne Yeniden Kullanılır (fikir/desen olarak, dosya kopyalamadan)

### 4.1 Backend / kontrat (Ezgin)
- **Server katmanlaması** (Baret-EVM): `config → domain → simulation → analysis → risk → policy → api`, `EvmRpc` arayüzü + `MockRpc` ile test. `docs/ARCHITECTURE.md` §5 bunu zaten hedefliyor.
- **EVM decode/simülasyon** (Baret-EVM): `tx-decode.ts`, `abi.ts` selector seti + `UNLIMITED_APPROVAL_THRESHOLD`, `account-keys.ts`, `parse-call-trace.ts` (delegatecall/selfdestruct bayrakları, `debug_traceCall` yoksa cache'lenmiş degrade), paralel pre-state.
- **Wrapper unwrapping** (Baret-OKX): `multicall`, Uniswap V3 `multicall(uint256,bytes[])`, Safe `execTransaction` — derinlik ve iç çağrı sınırlı.
- **Delta çıkarma: yeniden tasarla.** EVM'deki calldata projeksiyonu swap/multicall'da boş dönüyor. Monad: trace/log tabanlı (`Transfer`/`Approval` event'leri) veya state-diff; loss % ERC-20'yi de kapsasın.
- **Policy motoru** (Stellar + EVM): fail-closed `isBlocked()`, critical her zaman blok, bigint hassasiyet, `LOW_CONFIDENCE_INCOMPLETE_DATA` semantiği; `allowWarnings` gerçekten generic medium bulguları yönetsin (EVM'de yönetmiyordu).
- **x402:** OKX'in stateless MCP + transport-öncesi verify + tool başarısı sonrası settle deseni; Stellar'ın `@x402/core` Fastify adaptörü; Casper'ın EIP-712 `TransferWithAuthorization` + nonce replay kontrat mantığı (Monad'da EIP-3009). `FacilitatorClient` URL-swappable (`docs/X402_FACILITATOR.md` AK-1).
- **PaymentGuard.sol** (Baret-EVM) başlangıç noktası, şunlar **eklenerek**: `setAgentSigner/revokeAgentSigner` (spec §2.2), gerçek kayan pencere (Stellar `spend_log` gibi ya da Casper'daki gibi blok zamanı), SafeERC20, withdraw'da aktif rezerv (Stellar PaymentGuard `TotalReserved`), Envio için event'ler (spec §2.4). Fuzz invariant testi `testFuzz_NeverExceedsDailyCap` deseni.
- **Verdict attestation** (Stellar): Ed25519/secp256k1 imzalı karar — agent-kit pinned key ile doğrular. Stretch.
- **agent-kit** (Stellar agent-guard): config katmanları (explicit → env → `~/.baret/config.json` 0600 → default), secret sadece env'den, `allowOffline` açık kaçış kapısı, **exit 0/1/2**. EVM'deki "gas alanlarını düşürme" hatasını tekrarlama.
- **Audit:** in-memory yerine Envio (D-008); Stellar'ın `/v1/audit/recent|aggregate|contract/:addr` şekli korunur.

### 4.2 Frontend / extension / showcase (Meriç)
- **`packages/ui`** (Stellar): oklch token sistemi, shadcn katmanı, `Verdict/Meter/StatTile/CompareSplit/SpotlightCard/Reveal`, `ThemeProvider` (shadow host dahil), `DangerModeToggle`. Renkler `BRAND.md`'den gelecek; yapı aynen.
- **Extension mimarisi** (Stellar > EVM): state machine 5 faz, `ext-protocol` typed envelope + port router (`await ready` cold-start), popup pencere anchoring (EVM), PBKDF2 600k + iteration upgrade + attempt limiter + idle lock (Stellar), IndexedDB + storage.local yedek + migration, allowances atomik reservation + kayan pencere + TOFU mandate promotion (Stellar), x402 fetch interceptor (`PAYMENT-REQUIRED` header veya body `accepts[0]`), 9-adım x402 review, Shadow-DOM overlay, 1.5 sn basılı-tut override.
- **Showcase** (Stellar): Hub, 6 site UI'ları, `RiskPreview`, `ResultOverlay`, `WalletModal` + EIP-6963 sürekli dinleyici (EVM), "korumasız cüzdanla gönder" karşılaştırması, `/agents` playground + audit feed, `/install` tarayıcı algılama + zip. Sadece `transactions.ts` (senaryo builder'ları) ve adresler EVM'e göre yazılır — `docs/FRONTEND.md` §2.3 zaten uyarlanmış.
- **Wallet spec** zaten `docs/WALLET.md`'de; Stellar `docs/wallet-spec.md`, `extension-architecture.md`, `policy-dsl.md`, `x402-defense.md` şablon olarak okunabilir (baret-repos/Baret-Stellar/docs/).
- **Midnight'tan:** `blind-sign` fikri (bilinmeyen kontrat/selector → critical), `/demo` sayfasında motoru tarayıcıda çalıştırma.

### 4.3 QA (Meriç) — test planı için doğrudan çıkarımlar
- Her finding kodu için en az bir pozitif test (ölü kod yasağı).
- Her policy alanı için "toggle değişince karar değişiyor mu" testi.
- Extension: blok → imza butonu yok; analyzer down → açıkça "korumasız" etiketi; x402 auto-approve de analizden geçiyor.
- Showcase: her senaryonun beklenen bulgu kodu (`docs/FRONTEND.md` §2.3 "Watch for") assert edilir.
- Kontrat: cap aşımı, revoke sonrası `pay` revert, pencere geçişi (`vm.warp`), withdraw rezerv, fuzz.
- Uçtan uca: `apps/wallet` Agent Delegation → `setAgentSigner` → sub-key ile `pay` → `revokeAgentSigner` → `pay` revert.
- Deploy sonrası `cast call` ile canlı doğrulama, adres tablosu (`docs/CONTRACTS.md`).

---

## 5. Kesin Atılacaklar

`baret_docs/` ve `blackthron_docs/` (Solana-devri), `apps/wallet` (EVM/Stellar plaintext-key demo — Monad'da Mera ile yeniden), `packages/wallet-adapter` popup protokolü (extension varken vestigial), server-side policy DSL/profiles (Stellar, hiç kullanılmadı), `X402_DEMO_MODE` sahte settlement (Casper), `/v1/demo-check` ücretsiz motor (OKX), NovaSwap treasury vault (EVM — showcase için gerekiyorsa küçük bir demo kontratı yazılır, EOA değil), tüm `DELTAG_*`/`premon`/`swig`/`blackthorn` isimleri.
