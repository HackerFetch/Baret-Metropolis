# Baret — 6 Haftalık Yol Haritası

> Bu dosya **canlı bir checklist**'tir. Her hafta sonunda kutucuklar işaretlenir, kaymalar/gecikmeler "Notlar" satırına yazılır. `README.md`'deki durum tablosu bu dosyayla senkron tutulur.

Son güncelleme: 2026-09-13 · Şu an: **Hafta 0 (planlama)**

---

## Hafta 0 — Planlama (tamamlandı: 2026-09-13)
- [x] İki eski repo (Baret-Stellar, Baret-EVM) kod seviyesinde incelendi
- [x] Bounties/Resources/Notes analiz edildi
- [x] Track seçildi: Trust, Identity & AI Infrastructure
- [x] Doküman seti oluşturuldu (bu dosyalar)

---

## Hafta 1 — Temel + Karar
- [ ] Yeni git repo açıldı (temiz geçmiş, bugünden itibaren commit)
- [ ] pnpm workspace iskeleti (`apps/`, `packages/`, `contracts/`, `workflows/`, `indexer/`)
- [ ] Monad testnet RPC (Alchemy) + sponsor perk'leri claim edildi (Tenderly, QuickNode, Zerion) — bkz. `RESOURCES.md` §1
- [ ] `contracts/PaymentGuard.sol` yazıldı, test edildi, Monad testnet'e deploy edildi — `CONTRACTS.md` §2.6 dolduruldu
- [ ] **Milestone demo:** tek bir riskli transaction'ı uçtan uca yakala ve blokla (CLI seviyesinde olsa yeterli)

**Notlar:** _(doldurulacak)_

---

## Hafta 2 — Çekirdek Analiz Motoru
- [ ] `apps/server`: decode → simulate (`debug_traceCall`) → temel dedektörler (approvals, programs, evm-danger, simulation)
- [ ] Policy engine (ilk 8-10 kural) + `STRICT/BALANCED/PERMISSIVE` şablonları
- [ ] `packages/guard` SDK'sı (TransactionGuard.evaluate)
- [ ] `apps/showcase`: en az 2 tehdit senaryosu (safe/danger varyantlı, Monad-temalı yeni isimler)
- [ ] **Milestone demo:** showcase üzerinden canlı, tarayıcıda gösterilebilir analiz

**Notlar:** _(doldurulacak)_

---

## Hafta 3 — Tier S Entegrasyonları (1/2)
- [ ] Nansen: `reputation.ts` gerçek API'ye bağlandı, segment bazlı bulgu üretiyor
- [ ] Envio: `indexer/` kuruldu, PaymentGuard event'leri indexleniyor, `/v1/audit/*` buradan besleniyor
- [ ] Alchemy: `debug_traceCall` + webhook izleme + Smart Wallets SDK ile gas sponsorship POC
- [ ] Cleanverse: `compliance.ts` dedektörü + en az bir gated demo senaryosu

**Notlar:** _(doldurulacak)_

---

## Hafta 4 — Tier S Entegrasyonları (2/2)
- [ ] Mera: `apps/wallet` passkey account layer'a geçti (seed phrase yok)
- [ ] Mera PRF sub-key → PaymentGuard agent signer akışı çalışıyor
- [ ] Dynamic: `packages/agent-kit` autonomous/server wallet + delegasyon
- [ ] `apps/extension`: x402 interceptor bitti, `X402_FACILITATOR.md` §5'teki 4 senaryo test edildi
- [ ] Best Community Team Project eligibility doğrulandı

**Notlar:** _(doldurulacak)_

---

## Hafta 5 — Tier A Stretch + Sertleştirme
- [ ] Kapasiteye göre: Chainlink CRE reputation-oracle workflow (en az simülasyon kaydı)
- [ ] Kapasiteye göre: Qwen adversarial reviewer
- [ ] Kapasiteye göre: MetaMask Agent Wallet plugin paketi
- [ ] Kapasiteye göre: KIMI açıklama katmanı (`baret_explain`)
- [ ] Güvenlik: kendi risk modelimizi kendi sözleşmemize uygula, `CONTRACTS.md` §6 checklist'i geçildi
- [ ] Gerçek kullanıcı testi: en az 1 kişiye showcase gösterilip nerede takıldığı gözlemlendi

**Notlar:** _(doldurulacak)_

---

## Hafta 6 — Cilalama + Teslim
- [ ] README/ARCHITECTURE finalize edildi (kod ile senkron)
- [ ] Demo videosu çekildi (magic moment ilk 30 saniyede — `PROJECT_OVERVIEW.md` §7)
- [ ] Pitch videosu çekildi
- [ ] Canlı link yayında (server + showcase)
- [ ] Her hedeflenen bounty için sponsor'a özel submission alanları dolduruldu — `BOUNTIES_AND_TRACKS.md` §5
- [ ] `BOUNTIES_AND_TRACKS.md`'deki tüm satırların Durum sütunu güncel
- [ ] Son mentor update'i atıldı

**Notlar:** _(doldurulacak)_

---

## Kesinti Kuralı (zaman daralırsa)

Öncelik sırası (bkz. `BOUNTIES_AND_TRACKS.md`): Ana track + Nansen + Mera + Envio + Cleanverse + Alchemy **asla düşürülmez**. Önce Tier A'nın tamamı, sonra gerekirse Dynamic'in kapsamı (sadece agent-kit'te minimum "beyond login" entegrasyonuna indir) kısılır.
