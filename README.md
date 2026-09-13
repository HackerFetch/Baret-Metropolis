# Baret — Monad Metropolis Hackathon

> Bir işlem imzalanmadan önce onu simüle edip "bu güvenli mi yoksa tehlikeli mi?" sorusuna gerekçeli cevap veren, Monad'a özel bir işlem güvenliği / politika katmanı.

Bu depo ve bu doküman seti **canlı** takip amaçlıdır. Kod yazılmaya başlanmadan önce hazırlanmıştır; proje ilerledikçe **bu dosyalar da güncellenmelidir**. Yeni bir konuşmaya/yeni bir AI oturumuna başlayan biri önce bu README'yi, sonra ihtiyacına göre `docs/` altındaki ilgili dosyayı okumalı.

---

## Durum Özeti (son güncelleme: 2026-09-13)

| Alan | Durum |
|---|---|
| Faz | Planlama tamamlandı, kod yazımı başlamadı |
| Track kararı | **Trust, Identity & AI Infrastructure** ($30k) — bkz. `docs/BOUNTIES_AND_TRACKS.md` |
| Repo | Henüz git repo açılmadı (bu klasör `Is a git repository: false`) |
| Sözleşme deploy | Yok |
| Hafta | 0 / 6 |

Bu tabloyu her önemli aşama geçişinde (repo açıldığında, ilk deploy olduğunda, hafta değiştiğinde) güncelle. Detaylı haftalık ilerleyiş için: `docs/ROADMAP.md`.

---

## Doküman Haritası

| Dosya | Ne işe yarar | Ne zaman oku |
|---|---|---|
| [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) | Ürün ne, kimin için, uçtan uca ne yapıyor, MVP kapsamı | Projeye ilk kez bakan herkes / AI önce burayı okumalı |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Teknik mimari: monorepo yapısı, veri akışı, zincir sabitleri, ortam değişkenleri | Kod yazmaya başlamadan / bir modülü değiştirmeden önce |
| [`docs/BOUNTIES_AND_TRACKS.md`](docs/BOUNTIES_AND_TRACKS.md) | Track seçimi, hedeflenen bounty'ler, tier listesi, her biri için durum takibi | Kapsam kararı verirken / "bunu yapmalı mıyız" sorusunda |
| [`docs/RESOURCES.md`](docs/RESOURCES.md) | Hangi sponsor aracı nerede nasıl kullanılacak, claim takibi, env var listesi | Bir entegrasyona başlarken |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Akıllı sözleşme spesifikasyonları, deploy tablosu, güvenlik kontrol listesi | Sözleşme yazarken/deploy ederken |
| [`docs/X402_FACILITATOR.md`](docs/X402_FACILITATOR.md) | x402 ödeme akışı ve facilitator tasarımı | x402/agent ödeme katmanına dokunurken |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | 6 haftalık takvim, haftalık checklist, ilerleyiş | Her hafta başı/sonu güncelle |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Alınan mimari/kapsam kararları ve gerekçeleri (ADR log) | Yeni bir karar alırken önce burayı kontrol et, sonra ekle |

---

## Tek Cümlede Ne Bu?

Monad üzerinde bir cüzdan, dApp veya AI agent bir transaction imzalamadan önce Baret onu simüle eder, bağımsız risk dedektörlerinden (approval drenajı, bilinmeyen kontrat, Nansen tabanlı itibar, compliance, x402 ödeme şekli) geçirir, kullanıcının kendi policy'sine göre karar verir ve gerekçesiyle birlikte `safe: true/false` döner. Agent'lar için ham private key yerine on-chain harcama-limitli, iptal edilebilir bir yetki (PaymentGuard vault + Mera PRF sub-key) sağlar.

Detay için: `docs/PROJECT_OVERVIEW.md`.

---

## Kritik Kısıtlar (her dosyada geçerli, unutulmamalı)

1. **Sadece Monad.** Kodda, dokümanda, marka isminde başka hiçbir ağın adı geçmeyecek (Stellar, Solana, generic "any EVM chain" yok). Zincir sabitleri hardcoded: testnet `10143`, mainnet `143`.
2. **Taze git geçmişi.** Bu proje için açılacak repo bugünden (2026-09-13) itibaren commit alacak; eski `Baret-Stellar` / `Baret-EVM` repolarının git geçmişi taşınmayacak. Kod/konsept ilhamı eski repolardan gelebilir ama dosyalar sıfırdan yazılır.
3. **İsim: Baret.** Eski kod adları (`Premon`, `stellar-thorn`, `Blackthorn`, `DELTAG_*` env prefix'i) hiçbir yeni dosyada kullanılmayacak.
4. **Sponsor entegrasyonu = ürünün çekirdeği, rozet değil.** Her entegrasyon silindiğinde üründe gerçek bir kırılma yaratmalı (bkz. Cleanverse testi, `docs/BOUNTIES_AND_TRACKS.md`).

---

## Nasıl Katkı Sağlanır (AI oturumları için)

1. Önce bu README + `docs/PROJECT_OVERVIEW.md` + `docs/ARCHITECTURE.md` okunur.
2. Yapılacak iş `docs/ROADMAP.md`'deki haftalık plana bakılarak konumlandırılır.
3. Kapsam dışı bir fikir çıkarsa önce `docs/BOUNTIES_AND_TRACKS.md`'ye bakılır — zaten değerlendirilip elenmiş olabilir.
4. Yeni bir mimari/kapsam kararı alınırsa `docs/DECISIONS.md`'ye eklenir.
5. İş bittiğinde ilgili `docs/*.md` dosyasındaki durum tablosu güncellenir. **Kod ile doküman birlikte güncellenmeden iş "bitti" sayılmaz.**
