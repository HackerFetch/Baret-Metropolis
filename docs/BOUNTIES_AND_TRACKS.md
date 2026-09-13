# Baret — Track & Bounty Stratejisi

> Bu dosya "neyi neden hedefliyoruz / hedeflemiyoruz" sorusunun tek otoritesidir. Kapsam tartışması çıktığında önce burası kontrol edilir. Durum sütunları ilerledikçe güncellenmelidir.

Son güncelleme: 2026-09-13 · Kaynak: `Bounties.txt` (2026-09-13 itibarıyla platformdan alınmış tracks & bounties listesi)

---

## 1. Track Seçimi

**Seçilen ana track: Trust, Identity & AI Infrastructure — $30,000**

**Gerekçe:** Baret bire bir "Protocol-level primitives for trust, provenance, and user-owned data that make AI genuinely useful without any single platform capturing the value" tanımına giriyor. Agent guard, policy-bound/zaman-sınırlı/iptal edilebilir delegasyon, x402 firewall, on-chain itibar registry — hepsi bu track'in çekirdek teması. Diğer track'lerdeki rakip havuzu muhtemelen daha "ürün" ağırlıklı olacağından, Baret burada altyapı olarak daha net farklılaşır.

**Değerlendirilip elenen alternatifler:**
- *Consumer Products & Payments* — Baret bir tüketici finansal ürünü değil, bir güvenlik katmanı; zorlarsak konumlandırma bulanıklaşır.
- *Onchain Finance & Trading* — Baret trading arayüzü değil; MetaMask plugin bounty'si bu track'te olsa da proje kimliğini buraya taşımak yanlış.

> **Doğrulanması gereken açık soru:** Track-etiketli sponsor bounty'lerinin (ör. Kuru, Agora, MetaMask plugin → Onchain Finance & Trading) kazanılması için projenin *o* track'te de gönderilmesi mi gerekiyor, yoksa bounty'ler ana track'ten bağımsız mı değerlendiriliyor? Platform netleştiğinde bu dosyaya not düşülecek. Bu belirsizlik plana yansıtıldı: track-uyumsuz bounty'ler için efor ayrılmadı, sadece "All tracks" etiketli veya doğal track uyumu olanlar planlandı.

---

## 2. Tier S — Kesin Hedef (mimarinin doğal parçası)

| # | Bounty | Sponsor | Tutar | Track | Nasıl kazanılır | Sorumlu bileşen | Durum |
|---|---|---|---|---|---|---|---|
| 1 | Ana track ödülü | Monad Foundation | $30,000 | Trust/Identity/AI | Ürün bütünlüğü + demo kalitesi | Tüm proje | ⬜ Başlanmadı |
| 2 | Best use of Nansen | Nansen AI | $5,000 (havuz) | All tracks | `reputation.ts` dedektörü Nansen API/CLI/MCP ile adres segmentasyonu yapar (whale/fresh/market-maker/public figure) — ham skor değil, segment gösterilir | `apps/server/src/risk/detectors/reputation.ts` | ⬜ Başlanmadı |
| 3 | Best Use of Dynamic | Dynamic | $5,000 | All tracks | `agent-kit` içinde autonomous/server wallet + delegated permission modeli — login-only DEĞİL | `packages/agent-kit` | ⬜ Başlanmadı |
| 4 | Best Mera-Powered UX on Monad | Monad Foundation | $2,500 | All tracks | `apps/wallet` tamamen Mera passkey account layer — seed phrase yok | `apps/wallet` | ⬜ Başlanmadı |
| 5 | Mera: One Passkey, Many Keys | Monad Foundation | $2,500 | All tracks | PaymentGuard'ın agent imzalayıcısı Mera PRF-türetilmiş sub-key'den geliyor (non-wallet, yaratıcı kullanım) | `apps/wallet` + `contracts/PaymentGuard.sol` | ⬜ Başlanmadı |
| 6 | Best Integration of Cleanverse | Cleanverse | $2,000 | Trust/Identity/AI | Compliance detector: CVI doğrulaması geçmeyen transfer asla yürümüyor (silinince ürün kırılıyor testi) | `risk/detectors/compliance.ts` | ⬜ Başlanmadı |
| 7 | Best Use of Envio | Envio | $1,000 | All tracks | PaymentGuard + ReputationRegistry event'leri HyperIndex ile indexlenip audit dashboard'u besliyor | `indexer/` | ⬜ Başlanmadı |
| 8 | Best Projects using Alchemy | Alchemy | $1,000 kredi | All tracks | RPC + `debug_traceCall` + Smart Wallets SDK (gas sponsorship) + webhook izleme + Alchemy CLI dev akışında | `apps/server/src/infra/`, agent gas sponsorship | ⬜ Başlanmadı |
| 9 | Best Community Team Project | Monad Foundation | $5,000 | All tracks | Ek iş yok — platformda "community supporter" statüsünü doğrula | — | ⬜ Doğrulanmadı |

**Tier S toplam potansiyel (ana track hariç): ~$24,000**

---

## 3. Tier A — Kapasite Kalırsa (orta efor, düşük çakışma, iyi anlatı)

| # | Bounty | Sponsor | Tutar | Track | Nasıl kazanılır | Sorumlu bileşen | Durum |
|---|---|---|---|---|---|---|---|
| 10 | Best workflow with CRE | Chainlink | $3,000 | All tracks | "Reputation oracle" workflow: dış tehdit-istihbaratı API'si → CRE → `ReputationRegistry.sol`'a doğrulanmış yazma. Simülasyon kaydı bile hackathon'da kabul edilebilir | `workflows/reputation-oracle`, `contracts/ReputationRegistry.sol` | ⬜ Başlanmadı |
| 11 | Best Builds with Qwen 3.8 Max | Alibaba Cloud | $5,000 kredi | Trust/Identity/AI | `agent-kit`'e "adversarial CFO agent" katmanı — agent imzalamadan önce Qwen pending tx'i policy+bağlamla değerlendirip veto edebilir | `packages/agent-kit` (reviewer hook) | ⬜ Başlanmadı |
| 12 | Best Agent Wallet Plugin | Metamask | $2,500 | Onchain Finance & Trading | Baret guard/policy motoru MetaMask Agent Wallet plugin manifest'i olarak paketlenir | `packages/metamask-plugin` | ⬜ Başlanmadı |
| 13 | Best Builds Powered by KIMI | Kimi (Moonshot AI) | $3,000 kredi | All tracks | Risk bulgularını düz dille açıklayan LLM katmanı (`baret_explain` MCP aracı / popup metni) | `apps/server/src/mcp/`, extension popup | ⬜ Başlanmadı |
| 14 | Best Analytics / Risk Tool | Perpl | $3,000 | Onchain Finance & Trading | Audit dashboard'a Perpl pozisyon-likidasyon riski paneli (opsiyonel veri kaynağı) | `apps/server` audit modülü | ⬜ Başlanmadı |

---

## 4. Açıkça Atlanacaklar (ve neden)

| Bounty | Sponsor | Neden atlanıyor |
|---|---|---|
| Best Cross-Border Payments App | Agora | Ürün şekli tamamen farklı (mobil ödeme app); Baret bir güvenlik katmanı |
| Best Mobile Trading App | Agora | Aynı gerekçe — mobil trading app değiliz |
| Build the Next Consumer Trading App on Kuru | Kuru | Trading arayüzü inşa etmek istiyor, Baret trading ürünü değil |
| Bring New Assets and Markets to Kuru | Kuru | Aynı gerekçe |
| Best use of Perpl's API (trading bot) | Perpl | Trading bot inşası ayrı bir ürün — kapsam dışı |
| Bring Any-Chain Liquidity (Aurora Intents) | Aurora | İlginç ama çekirdek teze dolaylı katkı; zaman kalırsa "korumalı cüzdana herhangi bir zincirden fonlama" olarak 1 haftalık stretch değerlendirilebilir, garanti verilmiyor |
| Best Builds with Hunyuan | Tencent | Yanlış track (Social/Culture), multimodal deneyim istiyor |
| Privy! | Privy | Dynamic ile aynı slotu (wallet/onboarding SDK) paylaşıyor; ikisini derinlemesine entegre etmek efor israfı ve anlatıyı bulanıklaştırır — Dynamic seçildi |

---

## 5. Her Bounty İçin Teslim Gereksinimleri (genel, sponsor bazlı netleşecek)

Genel prensip (Aurora örneğinden genellenmiş, her sponsor kendi kriterini yayınlıyor — platformdan teyit edilmeli):
- [ ] Public repository (bu repo)
- [ ] Teknik demo (özellik bazlı, kısa)
- [ ] Pitch video
- [ ] Canlı link (mümkünse)
- [ ] Sponsor'a özel alanlar (submission formunda doldurulacak — her sponsor bounty'sinin kendine özel "review criteria" listesi olabilir, hafta 5-6'da tek tek kontrol edilecek)

---

## 6. Güncelleme Kuralı

Bu dosyadaki her satırın **Durum** sütunu şu değerlerden birini alır: `⬜ Başlanmadı`, `🔶 Devam ediyor`, `✅ Tamamlandı`, `❌ Vazgeçildi (gerekçe eklenmeli)`. Bir bounty'nin kapsamı/durumu değiştiğinde bu tablo güncellenir ve gerekirse `DECISIONS.md`'ye kısa bir not düşülür.
