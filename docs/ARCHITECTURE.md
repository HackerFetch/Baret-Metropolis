# Baret — Sistem Mimarisi

> Bu doküman Monad Metropolis için sıfırdan yazılacak Baret implementasyonunun **hedef mimarisidir** (henüz kod yok). Kod yazılmaya başlandıkça bu dosya kodla senkron tutulmalı — bir çelişki görülürse kaynak kod otorite kabul edilir ve bu dosya güncellenir.

Son güncelleme: 2026-09-13 · Durum: **Tasarım aşaması**

---

## 1. Tasarım İlkeleri

1. **Sadece Monad.** Hiçbir dosyada "any EVM chain" / "point at any chain" genellemesi yok. `chain.ts` (veya eşdeğeri) sadece iki girişe sahip: `testnet` (10143) ve `mainnet` (143). Başka bir zincirin adı hiçbir yerde geçmez.
2. **Fail-closed.** Yeterli veri yoksa (simülasyon başarısız, hesap durumu eksik) karar **blok** yönünde düşer, "allow" değil.
3. **SDK'lar zincir kütüphanesinden bağımsız tüketilebilir.** `@baret/guard` gibi paketler `ethers`/`viem` import etmeden tüketilebilmeli — cüzdan UI'ları hafif kalsın.
4. **Sponsor entegrasyonu ürünün içinde, ayrı bir "demo modu" değil.** Nansen, Cleanverse, Mera, Dynamic, Envio entegrasyonları ana analiz akışının parçası; kapatıldığında ürün gerçekten eksilir.
5. **Politika kullanıcının, motor Baret'in.** `GuardPolicy` tamamen veri (JSON) olarak taşınır; motor kodu policy'yi yorumlar ama policy'ye gömülü değildir.

---

## 2. Üst Düzey Bileşen Diyagramı

```mermaid
flowchart TB
    subgraph Clients
        EXT[apps/extension<br/>Chrome MV3 wallet + x402 interceptor]
        WAL[apps/wallet<br/>Mera-powered standalone smart wallet]
        SHOW[apps/showcase<br/>tehdit senaryoları + /agents kontrol paneli]
        MM[MetaMask Agent Wallet<br/>packages/metamask-plugin üzerinden]
    end

    subgraph Core
        SDK[packages/guard<br/>TransactionGuard SDK]
        AGENT[packages/agent-kit<br/>guarded signer + CLI]
        API[apps/server<br/>Fastify analiz API]
    end

    subgraph OnChain["Monad testnet / mainnet"]
        PG[PaymentGuard.sol]
        RR[ReputationRegistry.sol]
    end

    subgraph OffChainInfra
        IDX[indexer/ Envio HyperIndex]
        CRE[workflows/ Chainlink CRE<br/>reputation-oracle]
        NANSEN[Nansen API]
        CLEAN[Cleanverse API]
        DYNAMIC[Dynamic SDK]
        MERA[Mera passkey / PRF]
    end

    EXT --> SDK
    WAL --> SDK
    SHOW --> SDK
    MM --> SDK
    AGENT --> SDK
    SDK --> API
    API --> NANSEN
    API --> CLEAN
    API -->|okur| RR
    API -->|okur/yazar| IDX
    CRE -->|threat intel yazar| RR
    WAL --> MERA
    AGENT --> DYNAMIC
    AGENT -->|guardedSign/guardedSubmit| PG
    MERA -->|PRF sub-key| PG
    IDX -->|indexler| PG
    IDX -->|indexler| RR
```

---

## 3. Monorepo Yapısı

```
baret/
├── apps/
│   ├── server/        Fastify + TypeScript analiz API'si (motorun kalbi)
│   ├── wallet/        Mera passkey ile çalışan bağımsız akıllı cüzdan demosu
│   ├── extension/     Chrome MV3 (+ mümkünse Firefox) tarayıcı eklentisi
│   └── showcase/      Tehdit senaryoları galerisi + /agents kontrol sayfası
├── packages/
│   ├── guard/             @baret/guard — TransactionGuard + GuardPolicy SDK
│   ├── agent-kit/         @baret/agent-kit — guarded signer (Dynamic destekli) + CLI
│   ├── metamask-plugin/   Baret firewall'ının MetaMask Agent Wallet plugin paketi
│   ├── wallet-adapter/    dApp ↔ cüzdan postMessage köprüsü
│   ├── ext-protocol/      Eklenti mesaj-yolu tipleri
│   ├── ui/                Tasarım token'ları + paylaşılan React bileşenleri
│   └── showcase-ui/       Showcase siteleri için ortak UI iskeleti
├── contracts/         Foundry — PaymentGuard.sol, ReputationRegistry.sol
├── workflows/         Chainlink CRE — reputation-oracle workflow
├── indexer/           Envio HyperIndex config + handler'lar
├── docs/              Bu doküman seti
├── pnpm-workspace.yaml
└── docker-compose.yml / render.yaml / vercel.json (deploy config)
```

**Teknoloji seçimleri:**
- **Fastify** — API sunucusu (TypeScript).
- **ethers.js veya viem** — Monad RPC etkileşimi (karar: `DECISIONS.md`'de netleşecek).
- **Zod** — env ve request şema doğrulaması.
- **Foundry** — sözleşme geliştirme/test/deploy.
- **React + Vite** — wallet/extension/showcase UI'ları.
- **Envio HyperIndex** — on-chain event indexleme (GraphQL sorgu yüzeyi).

---

## 4. Zincir Konfigürasyonu (SADECE Monad)

```ts
// apps/server/src/config/chains.ts — hedef şekil
export const CHAINS = {
  testnet: {
    chainId: 10143,
    rpcUrl: process.env.MONAD_TESTNET_RPC_URL, // Alchemy birincil
    explorerUrl: "https://testnet.monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: process.env.MONAD_TESTNET_USDC_ADDRESS, // build sırasında doğrulanacak, placeholder YOK
    faucetUrl: "https://faucet.monad.xyz",
  },
  mainnet: {
    chainId: 143,
    rpcUrl: process.env.MONAD_MAINNET_RPC_URL,
    explorerUrl: "https://monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: process.env.MONAD_MAINNET_USDC_ADDRESS,
    faucetUrl: "",
  },
} as const;
```

> Not: Önceki (Monad dışı) implementasyonlarda "any EVM chain"e genişletmek için `RPC_URL`/`CHAIN_ID` gibi genel env değişkenleri kullanılmıştı. Bu projede **bilerek tersine çevriliyor**: env değişkenleri `MONAD_TESTNET_*` / `MONAD_MAINNET_*` şeklinde adlandırılır, kod hiçbir yerde "generic EVM chain" varsayımı yapmaz.

---

## 5. Bir Analiz İsteğinin Yaşam Döngüsü

`POST /v1/analyze` — girdi: `{ network, transaction, userWallet?, policy?, integratorRequestId? }`

```
[1] Rate limit (IP bazlı)
[2] Auth (API key veya x402 ödeme — DELTAG_* değil, BARET_* prefix'i kullanılacak)
[3] Zod gövde doğrulama
     ↓  apps/server/src/application/analyze-transaction.ts
[4]  decodeTransaction()          raw hex veya {from,to,value,data} → normalize edilmiş tx
[5]  collectTouchedAddresses()    dokunulan kontrat/adresler toplanır
[6]  simulate()                   Monad RPC: eth_call + debug_traceCall (varsa) ile call-trace
[7]  extractEstimatedChanges()    bakiye/allowance delta'ları (native MON + ERC-20)
[8]  fetchReputationLabels()      Nansen API: adres etiketleri (whale/fresh/market-maker/flagged)
[9]  readOnchainReputation()      ReputationRegistry.sol'dan CRE-beslemeli itibar verisi
[10] checkCompliance()            Cleanverse: CVI kimlik doğrulaması + CVA transfer kuralı
[11] runRiskDetection()           tüm dedektörler (bkz. §6) sırayla çalışır, bulgular birleşir
[12] evaluatePolicy()             GuardPolicy uygulanır → Decision
[13] generateSuggestions()        "şöyle yapsan daha güvenli" önerileri
[14] audit.record()               Envio indexer'ın okuyacağı on-chain event + (varsa) yerel audit kaydı
     ↓
YANIT { safe, reasons, findingCodes, estimatedChanges, confidence, meta, suggestions }
```

---

## 6. Risk Dedektörleri

| Dedektör | Dosya (hedef) | Ne yakalar | Örnek bulgu kodları |
|---|---|---|---|
| simulation | `risk/detectors/simulation.ts` | Simülasyon başarısız, sadece-calldata (trace yok) | `SIMULATION_FAILED`, `LOW_CONFIDENCE_INCOMPLETE_DATA` |
| approvals | `risk/detectors/approvals.ts` | Sınırsız `approve`, `setApprovalForAll`, EIP-2612 `permit` | `ERC20_APPROVAL_GRANTED`, `ERC20_APPROVAL_UNLIMITED`, `NFT_OPERATOR_GRANTED` |
| programs | `risk/detectors/programs.ts` | Riskli listedeki kontrat / bilinmeyen kontrat | `RISKY_CONTRACT_INTERACTION`, `UNKNOWN_CONTRACT_EXPOSURE` |
| evm-danger | `risk/detectors/evm-danger.ts` | `SELFDESTRUCT`, `DELEGATECALL`, sahiplik devri | `SELFDESTRUCT_CALL`, `DELEGATECALL_DETECTED`, `OWNERSHIP_TRANSFER` |
| reputation | `risk/detectors/reputation.ts` | Nansen etiketleri + on-chain ReputationRegistry | `KNOWN_MALICIOUS_ADDRESS`, `NANSEN_FLAGGED_FRESH_WALLET`, `NANSEN_FLAGGED_WHALE_COUNTERPARTY` |
| compliance | `risk/detectors/compliance.ts` **(yeni)** | Cleanverse CVI doğrulaması geçmemiş transfer | `COMPLIANCE_NO_CREDENTIAL`, `COMPLIANCE_EXPIRED`, `COMPLIANCE_TIER_INSUFFICIENT`, `COMPLIANCE_COUNTRY_DISALLOWED` |
| cpi | `risk/detectors/cpi.ts` | Derin internal-call nesting, yüksek işlem sayısı | `DEEP_CALL_NESTING`, `HIGH_OPERATION_COUNT` |
| compute | `risk/detectors/compute.ts` | Aşırı gas tavanı | `EXCESSIVE_GAS` |
| x402 | `risk/detectors/x402.ts` | Memo eksik, allowlist dışı asset, hedef/asset uyuşmazlığı | `X402_DESTINATION_MISMATCH`, `X402_ASSET_MISMATCH`, `X402_NON_CANONICAL_ASSET` |

Her bulgu: `{ code, severity: low|medium|high|critical, message, details? }`.

---

## 7. Policy Motoru

`GuardPolicy` — tamamen veri, ~20 bağımsız aç/kapa + eşik alanı:

| Kategori | Alanlar |
|---|---|
| Simülasyon | `requireSuccessfulSimulation` |
| Kontrat | `blockRiskyContracts`, `blockUnknownContractExposure` |
| Approval | `blockUnlimitedApprovals`, `blockSetApprovalForAll`, `blockPermit` |
| Tehlikeli opcode | `blockSelfdestruct`, `blockDelegatecall`, `blockOwnershipTransfer` |
| Kayıp limiti | `maxLossPercent`, `minPostUsdcBalance`, `minPostNativeBalance` |
| İtibar | `blockKnownMalicious`, `minNansenTrustLevel` |
| Compliance | `requireComplianceCheck`, `allowedCountries`, `minComplianceTier` |
| Kaynak | `maxGas` |
| x402 | `requireMemo`, `maxPerTxCap`, `maxHourlyCap`, `maxDailyCap`, `allowedAssets`, `allowedMerchantOrigins` |
| Genel | `allowWarnings` |

**Hazır şablonlar:** `STRICT_POLICY`, `BALANCED_POLICY` (üretim varsayılanı), `PERMISSIVE_POLICY` — `packages/guard/src/policy-templates.ts`.

**Karar mantığı fail-closed'dur:** kayıp hesaplanamıyorsa, compliance verisi çekilemiyorsa, itibar API'sine ulaşılamıyorsa → blok.

---

## 8. Bileşen Detayları

### 8.1 `apps/server`
Analiz motorunun tamamı burada. Endpoint'ler:

| Method | Path | Açıklama |
|---|---|---|
| GET | `/health`, `/health/ready` | Liveness / RPC hazır mı |
| POST | `/v1/analyze` | Tek işlem analizi |
| POST | `/v1/analyze/batch` | ≤25 işlem |
| POST | `/v1/analyze/stream` | SSE sonuç akışı |
| POST | `/v1/replay` | Yeniden simülasyon |
| GET | `/v1/audit/recent`, `/aggregate`, `/contract/:address` | Audit (Envio-destekli) |
| GET/POST | `/mcp/tools`, `/mcp/call` | AI agent araçları |
| GET | `/demo/paywall` | x402 demo (bkz. `X402_FACILITATOR.md`) |

MCP araçları: `baret_analyze`, `baret_health`, `baret_list_profiles`, `baret_explain` (LLM destekli düz-dil açıklama — KIMI/Qwen).

### 8.2 `apps/wallet` — Mera destekli bağımsız cüzdan
- Passkey ile hesap oluşturma (seed phrase yok).
- Mera PRF-türetilmiş anahtar materyalinden agent sub-key türetme akışı.
- Görsel policy editörü (`Policies` sayfası) — şablon seç, sonra tek tek kuralı ayarla.
- Her imza öncesi `@baret/guard` üzerinden analiz.

### 8.3 `apps/extension` — Chrome MV3
- EIP-1193 / EIP-6963 provider.
- `background`: hesap durum makinesi, IndexedDB (keystore, history, allowances, site izinleri), zincir monitörü (WebSocket — polling değil, notes.txt'nin Alchemy tavsiyesine göre).
- `inpage`: `window.ethereum` sağlayıcı + x402 fetch interceptor.
- Her imza talebi guard'dan geçer; riskli işlem dApp'te değil cüzdanda bloklanır.

### 8.4 `apps/showcase`
- En az 4-5 tehdit senaryosu (safe/danger varyantlı sahte dApp'ler — Monad temalı isimlerle, eski repodaki "novaswap" gibi isimler yeniden kullanılmayacak, yeni Monad-temalı isimler seçilecek).
- `/agents` sayfası: agent-kit + PaymentGuard + (varsa) Qwen adversarial reviewer canlı playground'u.

### 8.5 `packages/guard`
`TransactionGuard.evaluate({ transaction, userWallet, policy })` → `{ decision, blockingReasons, analysis }`. **Asla imzalamaz/göndermez** — sadece karar döner.

### 8.6 `packages/agent-kit`
`AgentWallet` sınıfı: `evaluate()`, `guardedSign()`, `guardedSubmit()`. Dynamic SDK ile agent/server wallet oluşturma ve delege yetki yönetimi. CLI: `baret analyze | sign | submit | address | policy list`. Exit kodları: `0` allow, `1` policy bloğu, `2` hata.

### 8.7 `packages/metamask-plugin`
Baret'in guard/policy motorunu MetaMask Agent Wallet plugin manifest formatına saran ayrı paket. Salt-okunur + tx-request-öneren yetkilerle sınırlı; agent-wallet policy motorunu bypass edemez (bounty'nin şartı).

---

## 9. Ortam Değişkenleri (taslak — `BARET_*` prefix'i, `DELTAG_*` değil)

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `MONAD_TESTNET_RPC_URL` | Evet | Alchemy Monad testnet RPC |
| `MONAD_MAINNET_RPC_URL` | Hayır | Alchemy Monad mainnet RPC |
| `MONAD_TESTNET_USDC_ADDRESS` | Evet (x402/compliance için) | Build sırasında doğrulanmış gerçek adres |
| `BARET_API_KEYS` | Hayır | Virgülle ayrılmış API key'leri |
| `BARET_AUTH_MODE` | Hayır | `api_key` / `x402` / `both` |
| `NANSEN_API_KEY` | Nansen entegrasyonu için | |
| `CLEANVERSE_API_KEY` / `CLEANVERSE_VALIDATOR_ADDRESS` | Compliance detector için | |
| `X402_ENABLED` / `X402_PAY_TO` / `X402_NETWORK=eip155:10143` / `X402_FACILITATOR_URL` | x402 için | bkz. `X402_FACILITATOR.md` |
| `ENVIO_ENDPOINT` | Audit/dashboard için | Envio HyperIndex GraphQL endpoint'i |
| `DYNAMIC_ENVIRONMENT_ID` | agent-kit için | |
| `MERA_*` | apps/wallet için | Mera doküman setine göre netleşecek |
| `QWEN_API_KEY` / `KIMI_API_KEY` | Stretch — LLM açıklama/reviewer katmanı | |

Tam liste kod yazılırken `apps/server/.env.example`'da tutulacak; bu tablo değiştikçe güncellenmeli.

---

## 10. Açıkça Yapılmayacaklar

- Genel "her EVM zincirinde çalışır" konfigürasyonu yok.
- Kalıcı olmayan (in-memory only) audit trail'e geri dönülmeyecek — Envio indexer birincil kaynak.
- Akıllı cüzdan adresi placeholder olarak bırakılmayacak (önceki repolardaki bilinen eksik) — Mera entegrasyonu ile gerçek hesap.
