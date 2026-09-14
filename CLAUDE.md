# Baret — Monad Metropolis Hackathon · Ajan Talimatları

Bu dosya her Claude Code oturumunun başında otomatik yüklenir. Önce bunu, sonra `README.md`'yi, sonra ihtiyaca göre `docs/` altındaki ilgili dosyayı oku.

## Proje tek cümlede

Baret, Monad üzerinde bir cüzdanın, dApp'in veya AI agent'ın bir işlemi imzalamasından **önce** devreye giren güvenlik/politika katmanıdır: işlemi simüle eder, risk dedektörlerinden geçirir, kullanıcının policy'sine göre `Safe / Caution / Blocked` kararı ve gerekçe döner. Agent'lar için harcama-limitli on-chain vault (PaymentGuard) sağlar. Detay: `docs/PROJECT_OVERVIEW.md`, mimari: `docs/ARCHITECTURE.md`.

## Ekip ve roller (2 kişi)

| Kişi | Git kimliği | Rol | Sahip olduğu alanlar |
|---|---|---|---|
| **Meriç** | `Meric` / mericcintosunn@gmail.com / GitHub `mericcintosun` | **Frontend Developer + QA/Tester** | Tüm UI/UX: `apps/extension`, `apps/wallet`, `apps/showcase`, `packages/ui`, `packages/showcase-ui`, marka/`docs/BRAND.md`, `docs/FRONTEND.md`, `docs/WALLET.md`. **Ayrıca her şeyin testi:** kontratlar, backend, SDK, uçtan uca akışlar — test yazma, test çalıştırma, bug raporlama Meriç'te. |
| **Ezgin** | GitHub `Aeztrest` / ezgincapkan64@gmail.com (eski Baret repolarının yazarı) | **Backend + Contracts + System Developer** | `apps/server` (analiz motoru, dedektörler, policy engine, API), `contracts/` (PaymentGuard, ReputationRegistry, Foundry), `packages/guard`, `packages/agent-kit`, `indexer/` (Envio), `workflows/` (Chainlink CRE), x402/facilitator, sponsor API entegrasyonları (Nansen, Cleanverse, Dynamic, Alchemy), deploy/infra. |

## Oturum başlangıcında yapılacaklar (her ajan, her seferinde)

1. `git config user.name` / `user.email` ile kiminle çalıştığını belirle. Emin değilsen sor.
2. İlk mesajında kişiye rolünü hatırlat, tek paragrafla "şu an projede neredeyiz"i söyle (`README.md` durum tablosu + `docs/ROADMAP.md` hangi hafta).
3. Kişiye ait görev dosyasını oku ve bekleyen görevleri özetle:
   - Meriç ile çalışıyorsan → `tasks/FOR_MERIC.md` (Ezgin'in Meriç'e bıraktığı işler)
   - Ezgin ile çalışıyorsan → `tasks/FOR_EZGIN.md` (Meriç'in Ezgin'e bıraktığı işler)
4. Sonra kullanıcının o günkü isteğine geç.

## Görev aktarımı (karşı tarafa iş çıkarma)

- Bir iş bitince ya da bir bağımlılık ortaya çıkınca, **karşı tarafın** dosyasına görev ekle:
  - Meriç'in ajanı → `tasks/FOR_EZGIN.md`'ye yazar (ör. "şu endpoint'in şu alanı dönmesi lazım", "kontratta şu event eksik", "şu test kırıldı, sebebi backend'de").
  - Ezgin'in ajanı → `tasks/FOR_MERIC.md`'ye yazar (ör. "endpoint hazır, UI bağlanabilir", "kontrat deploy oldu, adres şu, test edilsin").
- Görev formatı (her görev bir madde, en üste eklenir):
  ```
  - [ ] **Kısa başlık** — ne yapılacak, neden, hangi dosya/endpoint/kontrat. Bağımlılık: (varsa). Bırakan: Meriç/Ezgin · Tarih: YYYY-MM-DD
  ```
- Tamamlanan görevi silme; `[x]` yap ve altına tek satır sonuç yaz. Dosya şişince ajan "Tamamlananlar" bölümüne taşır.
- Kendi görev dosyandaki bir işi bitirdiğinde de `[x]` yap.
- Test bulguları (bug'lar) Meriç tarafından `tasks/FOR_EZGIN.md`'ye "🐛" öneki ile yazılır: tekrar adımları, beklenen/gerçek, ilgili dosya.

## Git / PR kuralları

- `main` korunur; doğrudan `main`'e commit yok.
- Meriç'in çalışma dalı: **`frontend`** (açık PR: "frontend"). Meriç'in ajanı bu dala commit'ler, PR'ı **sadece Meriç açıkça "mergele" dediğinde** merge eder. Asla kendiliğinden merge etme.
- Ezgin kendi dalını/PR'ını açar (öneri: `backend`, `contracts`). Aynı kural: merge sadece açık talimatla.
- Commit mesajları İngilizce, kısa, ne değiştiğini söyler. Sonuna `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` eklenir.
- Push sadece kullanıcı isteyince ya da PR açma/güncelleme akışının parçasıysa.

## Kritik kısıtlar (README ile aynı, tekrar)

1. **Sadece Monad.** Kodda başka ağ adı geçmez. Chain ID testnet `10143`, mainnet `143`. Env prefix'i `MONAD_TESTNET_*` / `MONAD_MAINNET_*`, uygulama prefix'i `BARET_*`.
2. **Eski isimler yok:** `Premon`, `stellar-thorn`, `Blackthorn`, `DELTAG_*` yeni dosyalarda kullanılmaz.
3. **Fail-closed:** veri eksikse karar "blok"tur.
4. **Sponsor entegrasyonu ürünün çekirdeğidir**, rozet değil.
5. **Kod + doküman birlikte güncellenmeden iş bitmiş sayılmaz.** İlgili `docs/*.md` durum tablosunu güncelle.
6. **Secret'lar asla repoya yazılmaz.** `.env` + `.gitignore`.

## Referans repolar (`baret-repos/`, gitignore'da)

Baret'in önceki 5 versiyonu (EVM, Stellar, Casper, Midnight, OKX) `baret-repos/` altında yerel olarak durur ve **asla commit edilmez**. Git geçmişleri taşınmaz, dosyalar kopyalanmaz; sadece fikir/kod ilhamı alınır ve sıfırdan yazılır. Karşılaştırmalı inceleme: `docs/REFERENCE_REPOS.md`.

## Dil

Kullanıcıyla Türkçe konuş. Kod, commit mesajları, kod içi yorumlar ve README dışındaki teknik dokümanlar İngilizce olabilir; mevcut `docs/` seti Türkçe olduğu için orada Türkçe devam et.
