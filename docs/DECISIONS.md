# Baret — Karar Günlüğü (ADR Log)

> Format: her karar için Tarih, Karar, Gerekçe, Değerlendirilen alternatifler, Durum. **Yeni bir mimari/kapsam kararı almadan önce bu dosyayı tara** — aynı tartışma tekrar yapılmasın. Karar değişirse eski satır silinmez, "Güncellendi →" ile yeni karara referans verilir.

---

### D-001 — Sıfırdan repo, taze git geçmişi
**Tarih:** 2026-09-13
**Karar:** Yeni bir git repo açılacak, commit geçmişi bugünden başlayacak. `Baret-Stellar` ve `Baret-EVM` repolarının git geçmişi taşınmayacak.
**Gerekçe:** Hackathon kuralı/kullanıcı talimatı — proje Monad Metropolis için "sıfırdan" yapılmış olarak sunulmalı.
**Alternatif:** Baret-EVM'i fork edip temizlemek — reddedildi, git geçmişi eski commit'leri taşır.
**Durum:** ✅ Kesin

### D-002 — İsim: Baret
**Tarih:** 2026-09-13
**Karar:** Proje adı her yerde "Baret". Eski kod adları (`Premon`, `stellar-thorn`, `Blackthorn`, `DELTAG_*`) kullanılmayacak.
**Gerekçe:** Kullanıcı talebi; marka tutarlılığı.
**Durum:** ✅ Kesin

### D-003 — Sadece Monad, "any EVM chain" genellemesi yok
**Tarih:** 2026-09-13
**Karar:** `chain.ts` sadece `testnet` (10143) ve `mainnet` (143) içerir. Env değişkenleri `MONAD_TESTNET_*` / `MONAD_MAINNET_*` olarak adlandırılır (genel `RPC_URL`/`CHAIN_ID` değil).
**Gerekçe:** Kullanıcı talimatı — hiçbir dosyada başka ağ adı geçmeyecek; Baret-EVM'in son commit'i tam tersini yapmıştı ("generalize from Monad to any EVM chain"), burada bilerek tersine çevriliyor.
**Durum:** ✅ Kesin

### D-004 — Ana track: Trust, Identity & AI Infrastructure
**Tarih:** 2026-09-13
**Karar:** Consumer Products & Payments veya Onchain Finance & Trading yerine Trust/Identity/AI Infra track'i seçildi.
**Gerekçe:** Bkz. `BOUNTIES_AND_TRACKS.md` §1.
**Durum:** ✅ Kesin

### D-005 — Dynamic seçildi, Privy atlandı
**Tarih:** 2026-09-13
**Karar:** Agent/server wallet + delegasyon için Dynamic SDK kullanılacak; Privy bounty'si hedeflenmeyecek.
**Gerekçe:** İkisi de aynı "wallet/onboarding SDK" slotunu dolduruyor; ikisini derinlemesine entegre etmek efor israfı ve ürün anlatısını bulanıklaştırır. Dynamic'in headless/agent-wallet/CLI odağı `agent-kit`'in ihtiyacına daha iyi oturuyor.
**Alternatif:** Privy → `apps/wallet`'ta insan onboarding'i için kullanmak — reddedildi, Mera zaten o slotu (insan hesap katmanı) dolduruyor; 3 wallet SDK'sı birden fazla.
**Durum:** ✅ Kesin (kapasite büyürse yeniden açılabilir)

### D-006 — Mera, apps/wallet'ın hesap katmanı; Dynamic, agent-kit'in hesap katmanı
**Tarih:** 2026-09-13
**Karar:** İki farklı yüzey (insan cüzdanı vs. agent/server wallet), iki farklı sponsor SDK'sı — çakışma yok.
**Gerekçe:** Her bounty'nin "beyond login" / "core to product" şartını gerçek, ayrı bir kullanım alanında karşılamak.
**Durum:** ✅ Kesin

### D-007 — Kuru/Perpl trading bounty'leri, Agora bounty'leri, Aurora Intents, Hunyuan atlandı
**Tarih:** 2026-09-13
**Karar:** Bkz. `BOUNTIES_AND_TRACKS.md` §4.
**Gerekçe:** Ürün şekli uyuşmuyor (trading arayüzü / mobil ödeme app / multimodal deneyim istiyorlar, Baret güvenlik katmanı).
**Durum:** ✅ Kesin (Aurora Intents için hafif bir stretch olasılığı açık bırakıldı)

### D-009 — Extension klasik seed-phrase kalıyor; Mera sadece `apps/wallet`'ta
**Tarih:** 2026-09-14
**Karar:** `apps/extension`'ın hesap katmanı Mera'ya taşınmıyor, klasik passphrase+seed self-custody modelini koruyor. Mera passkey entegrasyonu sadece `apps/wallet` (bağımsız standalone) içinde yapılıyor.
**Gerekçe:** MV3 popup içinde WebAuthn/passkey akışının izin modeli ve güvenilirliği daha karmaşık; `apps/wallet` tam kontrolümüzde bir web sayfası olduğu için Mera'nın "seed phrase yok" vaadini çok daha temiz gösterir. Detay: `WALLET.md` §0, §3.
**Durum:** ✅ Kesin

### D-010 — Showcase site isimleri aynen korunuyor
**Tarih:** 2026-09-14
**Karar:** Baret-Stellar'daki 6 showcase sitesinin isimleri (SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD) değiştirilmeden kullanılacak.
**Gerekçe:** Kullanıcı talimatı — bu isimler zaten jenerik/marka-tarafsız (bir ağın adını taşımıyorlar), tehdit senaryoları Monad/EVM'e uyarlandı (bkz. `FRONTEND.md` §2.3), sadece Stellar-özel mekanikler (trustline, AccountMerge) EVM eşdeğerleriyle (approval, setApprovalForAll) değiştirildi.
**Durum:** ✅ Kesin

### D-008 — Persistans katmanı: Envio, in-memory audit trail'in yerini alacak
**Tarih:** 2026-09-13
**Karar:** Eski repolardaki "son 10.000 kayıt bellekte, restart'ta sıfırlanıyor" tasarımı terk edilecek; PaymentGuard/ReputationRegistry event'leri Envio HyperIndex ile indexlenip audit dashboard'unun birincil kaynağı olacak.
**Gerekçe:** Hem Envio bounty'sini organik hale getiriyor hem de gerçek bir ürün eksikliğini (kalıcı audit yok) çözüyor.
**Durum:** ✅ Kesin

---

## Açık Kararlar (henüz verilmedi — ilerledikçe doldurulacak)

| # | Konu | Nerede etkiliyor | Karar tarihi |
|---|---|---|---|
| AK-1 | Kendi x402 facilitator'ımızı mı yazacağız yoksa standart birini mi kullanacağız? | `X402_FACILITATOR.md` §4.4 | Hafta 4'te netleşecek |
| AK-2 | x402 demo senaryosunun adı (eski "scrybe" yerine) | `X402_FACILITATOR.md` §6, `apps/showcase` | Hafta 2 |
| AK-3 | RPC istemcisi: ethers.js mi viem mi? | `ARCHITECTURE.md` §3 | Hafta 1 |
| AK-4 | Cleanverse için Baret tarafında ek bir "gated asset" demo kontratı gerekiyor mu? | `CONTRACTS.md` §4 | Hafta 3 |
| AK-6 | Track-etiketli bounty'lerin (Kuru/Agora/MetaMask plugin) kazanılması için ayrı track submission'ı gerekip gerekmediği | `BOUNTIES_AND_TRACKS.md` §1 | Platform netleştiğinde |
| AK-7 | Best Community Team Project eligibility — "community supporter" statüsü teyidi | `BOUNTIES_AND_TRACKS.md` §2 satır 9 | Hafta 4 |
| AK-8 | `BRAND.md` içeriği — isim/wordmark, ton, renk-nötr görsel dil ilkeleri (Güvenlik + Build teması) | `BRAND.md` (henüz yok) | Kullanıcı yön verince yazılacak |

**Not (AK-5, çözüldü):** Showcase site isimleri Monad-temalı yeniden adlandırılmıyor, orijinal isimler korunuyor — bkz. D-010.

**Kural:** Bir açık karar netleştiğinde bu tablodan silinir, yukarıya numaralı bir D-XXX satırı olarak eklenir ve etkilediği diğer dosyalar (`ARCHITECTURE.md`, `CONTRACTS.md`, vb.) aynı anda güncellenir.
