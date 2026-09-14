# Ezgin için görevler

> Meriç (frontend + QA) tarafından Ezgin'e (backend + contracts + system) bırakılan işler. Format ve kurallar: `CLAUDE.md` → "Görev aktarımı". Yeni görev en üste eklenir. Bug'lar 🐛 ile başlar.

## Bekleyen

- [ ] **Referans repo incelemesini oku** — `docs/REFERENCE_REPOS.md` (5 eski repo karşılaştırması). Özellikle §3 "tekrarlayan hatalar" ve §4.1 backend/kontrat kısmı. Baret-EVM'deki `PaymentGuard.sol` en yakın başlangıç ama agent allowlist, gerçek kayan pencere, SafeERC20 ve withdraw rezervi eklenmeli. Bırakan: Meriç · Tarih: 2026-09-15
- [ ] **Ölü kod yasağı** — Yeni server'da tanımlanan her finding kodu bir dedektör tarafından emit edilmeli, her `GuardPolicy` alanı motor tarafından okunmalı (eski repolarda 11–18 ölü kod/alan vardı). Meriç bunu test edecek; tanımlarken listeyi `docs/ARCHITECTURE.md` §6–§7 ile senkron tut. Bırakan: Meriç · Tarih: 2026-09-15

- [ ] **Hafta 1 iskeleti** — pnpm workspace (`apps/`, `packages/`, `contracts/`, `workflows/`, `indexer/`) + `apps/server` boş Fastify uygulaması + `/health` endpoint'i. Meriç'in showcase/extension'ı bağlayabilmesi için önce bu lazım. Bkz. `docs/ROADMAP.md` Hafta 1. Bırakan: Meriç · Tarih: 2026-09-15
- [ ] **PaymentGuard.sol** — `docs/CONTRACTS.md` §2'deki spec'e göre yaz, Foundry testleri (cap aşımı, revoke sonrası pay revert, withdraw rezerv) + Monad testnet deploy, adresi `docs/CONTRACTS.md` §2.6'ya yaz. Meriç deploy sonrası `cast call` ve UI üzerinden test edecek. Bırakan: Meriç · Tarih: 2026-09-15
- [ ] **`/v1/analyze` sözleşmesi** — Request/response şemasını (Zod) ve `GuardPolicy` tipini `packages/guard` içinde erken yayınla ki extension/showcase mock'suz bağlanabilsin. Şema `docs/ARCHITECTURE.md` §5 ve §7 ile aynı olmalı. Bırakan: Meriç · Tarih: 2026-09-15
- [ ] **AK-3 kararı** — ethers mi viem mi? `docs/DECISIONS.md`'ye D-011 olarak yaz; frontend paketleri aynı kütüphaneyi kullanacak. Bırakan: Meriç · Tarih: 2026-09-15

## Tamamlananlar

_(henüz yok)_
