# Baret — Kaynak Haritası

> Hangi sponsor aracı/dokümanı nerede, nasıl kullanılıyor ve claim durumu ne. Kaynak: `Resources.txt` (hackathon.monad.xyz/resources, 2026-09-13 anlık görüntüsü). Bir entegrasyona başlamadan önce bu dosyadaki ilgili satırı ve `ARCHITECTURE.md` §9'daki env değişkenlerini kontrol et.

Son güncelleme: 2026-09-13

---

## 1. Sponsor Perk'leri — Claim Takibi

| Perk | Değer | Claim linki (Resources.txt'de) | Kullanım amacı Baret'te | Claim durumu |
|---|---|---|---|---|
| Tenderly Pro | ~$7,200 | Notion: Tenderly Access for Metropolis | PaymentGuard.sol debug/simulate, revert trace inceleme, virtual testnet ile çok-adımlı senaryo provası (demo öncesi kayıt) | ⬜ Claim edilmedi |
| Quicknode Build Plan | ~$147 | Notion: Quicknode Credits for Metropolis Hackers | Alchemy'ye yedek RPC + webhook (chain event izleme) | ⬜ Claim edilmedi |
| Zerion API Builder | ~$149 | Notion: Free Zerion API Builder Plan | Opsiyonel — wallet activity/parsed tx görünümü için yedek veri kaynağı (birincil değil) | ⬜ Claim edilmedi |

**Aksiyon (Hafta 1):** Üç perk'i de claim et, key'leri `.env`'e ekle, bu tabloyu güncelle.

---

## 2. Monad Resmi Dokümantasyonu — Zorunlu Okuma

| Kaynak | Ne zaman lazım |
|---|---|
| [Differences from Ethereum](https://docs.monad.xyz/developer-essentials/differences) | Kod yazmaya başlamadan önce — parallel execution, reserve balance gibi farklar risk modelini etkiliyor |
| [Gas pricing](https://docs.monad.xyz/developer-essentials/gas-pricing) + [Opcode pricing](https://docs.monad.xyz/developer-essentials/opcode-pricing) | `compute.ts` dedektörünün eşik değerlerini kalibre ederken |
| [Reserve balance](https://docs.monad.xyz/developer-essentials/reserve-balance) | `minPostNativeBalance` policy alanını doğru hesaplarken |
| [EIP-7702](https://docs.monad.xyz/developer-essentials/eip-7702) | PaymentGuard'ın delege imzalayıcı (Mera sub-key) tasarımı için |
| [MERA guide](https://docs.monad.xyz/guides/mera) | `apps/wallet` Mera entegrasyonu — Hafta 4 |
| [x402 guide](https://docs.monad.xyz/guides/x402) | `X402_FACILITATOR.md` uygulaması |
| [ERC-8004](https://docs.monad.xyz/guides/erc-8004) | Agent identity/reputation — MetaMask plugin ve ReputationRegistry tasarımı için referans |
| [Deploy a smart contract](https://docs.monad.xyz/guides/deploy-smart-contract/index) | Foundry ile PaymentGuard deploy — Hafta 1 |
| [Indexers guide](https://docs.monad.xyz/guides/indexers/index) | Envio kurulumu öncesi |

Foundry'de **Monad gas pricing**'i local testlerde aktif et (MIP-8 notu — bkz. `notes (4).txt`): storage layout kararlarını buna göre ver (per-user alanları tek struct'ta grupla).

---

## 3. SDK / Araç → Kullanım Yeri Eşlemesi

| Araç | Kaynak | Kullanım yeri | Bounty bağlantısı |
|---|---|---|---|
| Alchemy Smart Wallets SDK | [Quickstart](https://www.alchemy.com/docs/wallets/quickstart) | Agent'ın PaymentGuard `pay()` çağrılarına gas sponsorluğu | Tier S #8 |
| Alchemy CLI | [Docs](https://www.alchemy.com/docs/alchemy-cli) | Dev workflow'da RPC/webhook/wallet kurulumu, `--json` ile agent-operable | Tier S #8 |
| Alchemy MCP Server / Agent Skills | [Docs](https://www.alchemy.com/docs/alchemy-mcp-server) | Geliştirme sırasında AI agent'a (bana) canlı chain verisi | Tier S #8 |
| Envio HyperIndex | [Monad testnet quickstart](https://docs.envio.dev/docs/HyperIndex/monad-testnet) | `indexer/` — PaymentGuard + ReputationRegistry event'leri | Tier S #7 |
| Envio HyperSync/HyperRPC | [Overview](https://docs.envio.dev/docs/HyperSync/overview) | Backfill (indexer ilk kurulumda geçmiş event'leri hızlı çeker) | Tier S #7 |
| Nansen API / CLI / MCP | [Zerion CLI benzeri, Resources.txt §MCP] | `reputation.ts` — segment bazlı etiketleme | Tier S #2 |
| Dynamic SDK + CLI | Resources.txt (Dynamic bölümü, detay linki platformda) | `agent-kit` — autonomous/server wallet, delegasyon | Tier S #3 |
| Mera guide | [docs.monad.xyz/guides/mera](https://docs.monad.xyz/guides/mera) | `apps/wallet` — passkey account layer + PRF sub-key | Tier S #4, #5 |
| Cleanverse API | Platformdan alınacak (Bounties.txt'de sponsor adı var, API detayı Resources.txt'de yok — Hafta 1'de sponsor kanalından istenecek) | `compliance.ts` | Tier S #6 |
| Chainlink CRE | Resources.txt (CRE bölümü) + `notes (4).txt` (weather demo pattern) | `workflows/reputation-oracle` | Tier A #10 |
| QuickNode Streams/Webhooks | [Streams](https://www.quicknode.com/docs/streams), [Webhooks](https://www.quicknode.com/docs/webhooks/getting-started) | Yedek/tamamlayıcı chain event izleme | Tier S #8 (Alchemy'nin yedeği) |
| Tenderly Simulator/Debugger/Virtual TestNet/Alerts | [tenderly.co](https://tenderly.co/) | Contract geliştirme + demo prova ortamı | Perk, doğrudan bounty değil ama kalite artırır |
| Zerion CLI/API | [developers.zerion.io](https://developers.zerion.io/) | Opsiyonel — wallet activity yedek veri kaynağı | Perk, opsiyonel |
| Qwen 3.8 Max API | Alibaba Cloud (credits) | `agent-kit` adversarial reviewer | Tier A #11 |
| KIMI API | Moonshot AI (credits) | `baret_explain` MCP aracı | Tier A #13 |
| MetaMask Agent Wallet plugin SDK | Bounty açıklaması, detay dokümanı platformdan alınacak | `packages/metamask-plugin` | Tier A #12 |

---

## 4. Fikir-Bazlı Referanslar (kod yazarken danışılacak)

Bu bölüm `Resources.txt`'nin "Idea-specific resources" kısmından, doğrudan Baret'e uygulanabilir olanlar:

- **Execution-Aware Trading Interfaces** bölümündeki [Monad for Developers](https://docs.monad.xyz/introduction/monad-for-developers) — 400ms blok / 800ms finality performans zarfı, "no pending state" UI tasarımı ilkesi extension popup'ına uygulanacak.
- **Embedded Trading in Non-Trading Apps** → [Monad Embedded Wallets docs](https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets) — showcase'deki sahte dApp'lerin kendi embedded wallet'larını nasıl kuracağına referans (Baret onları dışarıdan korur).
- **Onchain Skill Credentials** → [Ethereum Attestation Service](https://docs.attest.org) — Cleanverse compliance detector'ının yanına opsiyonel EAS tabanlı "compliance kanıtı" attestation'ı eklenebilir (stretch, `DECISIONS.md`'de karar bekliyor).
- **Mobile-Native Proof of Personhood** → [RIP-7212 notu](https://github.com/ethereum/RIPs/blob/master/RIPS/rip-7212.md): "Monad check: RIP-7212 L2 önerisi, Cancun'un parçası değil — mevcut OLMADIĞINI varsay ve doğrula." Mera passkey imzalama maliyetini hesaplarken bu netleştirilmeli.

---

## 5. Ortam Değişkeni / API Key Ana Listesi

Tam teknik liste `ARCHITECTURE.md` §9'da. Bu tablo sadece **hangi key'in hangi sponsordan geldiğini** ve **kimin sorumlu olduğunu** takip eder:

| Key | Sponsor | Nereden alınır | Durum |
|---|---|---|---|
| `MONAD_TESTNET_RPC_URL` | Alchemy | Alchemy dashboard, Monad app oluştur | ⬜ |
| `NANSEN_API_KEY` | Nansen | Bounty sayfasındaki sponsor erişimi | ⬜ |
| `CLEANVERSE_API_KEY` | Cleanverse | Sponsor kanalı | ⬜ |
| `DYNAMIC_ENVIRONMENT_ID` | Dynamic | dashboard.dynamic.xyz | ⬜ |
| `ENVIO_ENDPOINT` | Envio (kendi deploy'umuz) | `indexer/` deploy sonrası | ⬜ |
| `QWEN_API_KEY` | Alibaba Cloud | Bounty credit erişimi | ⬜ |
| `KIMI_API_KEY` | Moonshot AI | Bounty credit erişimi | ⬜ |
| `TENDERLY_ACCESS_KEY` | Tenderly (perk) | Notion linkinden claim | ⬜ |
| `QUICKNODE_ENDPOINT` | QuickNode (perk) | Notion linkinden claim | ⬜ |

**Güvenlik notu (Uttam/Alchemy, `notes-2.txt`):** Hiçbir key kod içine veya prompt metnine yazılmayacak; `.env` + `.gitignore`. Agent secret'ları (`agent-kit`) hiçbir zaman dosyaya yazılmaz, sadece env/config'ten okunur.
