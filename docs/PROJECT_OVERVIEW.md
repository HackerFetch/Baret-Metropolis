# Baret — Proje Genel Bakış (PRD)

> **Bu dosya "ne inşa ediyoruz ve neden" sorusunun tek otoritesidir.** Mimari detay için `ARCHITECTURE.md`, kapsam/bounty önceliği için `BOUNTIES_AND_TRACKS.md`'ye bakın.

Son güncelleme: 2026-09-13 · Durum: **Planlama tamamlandı, implementasyon başlamadı**

---

## 1. Problem

Monad üzerinde bir kullanıcı (insan ya da AI agent) bir dApp'e girip "Onayla"ya bastığında:

- Arka planda gerçekte ne olacağını göremez (hangi kontrat çağrılıyor, hangi fonksiyon, hangi parametrelerle).
- Bir ERC-20 `approve` çağrısının sınırsız mı yoksa sınırlı mı olduğunu ayırt edemez.
- `setApprovalForAll`, `permit` (EIP-2612), `delegatecall`, `selfdestruct`, sahiplik devri gibi drenaj primitiflerini tanımaz.
- x402 ile otomatik ödeme yapan bir AI agent, sunucunun 402 yanıtında istediği tutarı/adresi kontrol etmeden **kör imzalar**.
- Bir agent'a private key verildiğinde, o key'in yapabileceklerini sınırlayan hiçbir mekanizma yoktur — key ele geçirilirse ya da agent hata yaparsa kayıp sınırsızdır.

Sonuç: wallet drainer'lar, rug pull'lar, phishing ve "agent'a fazla yetki verme" hataları kullanıcıyı mağdur ediyor. Bu, Monad'ın hızının (400ms blok, 800ms finality) çözemediği bir güven problemi — aksine, hız arttıkça hatalı/kötü niyetli bir işlemin geri dönüşü de o kadar az mümkün oluyor.

## 2. Çözüm

Baret, imza anından **önce** devreye giren bir güvenlik/politika katmanıdır:

```
Kullanıcı/Agent imzalamak üzere  →  Baret devreye girer
                                     ↓
                  İşlemi Monad RPC ile simüle eder (gerçekten göndermeden)
                                     ↓
                     Bağımsız risk dedektörlerini çalıştırır
                       (approval, itibar/Nansen, compliance/Cleanverse,
                        derin çağrı ağacı, x402 ödeme şekli...)
                                     ↓
                        Kullanıcının kendi policy'sini uygular
                                     ↓
                "safe: true/false" + gerekçe + tahmini bakiye değişimi
```

Agent'lar için ayrıca: ham private key yerine **PaymentGuard** adlı on-chain harcama-limitli vault + Mera passkey'inden türetilmiş, kapsamı daraltılmış bir imza yetkisi (sub-key). Agent bu vault'tan sadece tanımlı limitler içinde, tanımlı merchant'lara ödeme yapabilir — sahibin her ödemeyi tek tek onaylamasına gerek kalmaz, ama sahip her an yetkiyi iptal edebilir.

## 3. Kim Kullanır

| Kullanıcı tipi | İhtiyaç | Baret'in cevabı |
|---|---|---|
| Son kullanıcı (cüzdan sahibi) | "Bu işlemi imzalarsam ne olur, kaybım ne kadar?" | Bağımsız cüzdan demosu (`apps/wallet`, Mera ile) veya tarayıcı eklentisi (`apps/extension`) — imzadan önce görsel rapor |
| dApp geliştiricisi | Kullanıcısını riskli işlemlerden korumak, güven inşa etmek | `@baret/guard` SDK'sı — birkaç satırla pre-sign kontrol |
| AI agent / otonom bot geliştiricisi | Agent'a sınırsız yetki vermeden otomatik işlem yaptırmak | `@baret/agent-kit` — guarded signer + CLI + PaymentGuard vault |
| Wallet/altyapı sağlayıcısı (MetaMask Agent Wallet gibi) | Kullanıcılarına hazır bir güvenlik katmanı sunmak | Baret'in plugin paketi (`packages/metamask-plugin`) |

## 4. Temel Kullanıcı Yolculukları

### 4.1 Son kullanıcı — riskli bir onaya basıyor
1. Kullanıcı showcase'deki sahte bir dApp'te (ör. "claimhub" airdrop sitesi) "Claim"e basar.
2. Baret extension/wallet, işlemi imza istemeden önce yakalar, `/v1/analyze`'a gönderir.
3. Sunucu: decode → simülasyon → risk dedektörleri → policy → karar.
4. Kullanıcı arayüzde "Bu işlem sınırsız token yetkisi istiyor ve alıcı bilinen bir phishing adresi — engellendi" gibi gerekçeli bir kart görür.
5. Kullanıcı isterse yine de "yine de imzala" diyebilir (varsayılan policy'ye göre) ama bunu bilerek yapar.

### 4.2 Agent geliştiricisi — otomatik x402 ödemesi
1. Agent bir API'ye istek atar, 402 + `PaymentRequirements` alır.
2. Extension'ın x402 interceptor'ı bu yanıtı yakalar, gerçek ödeme parametrelerini (kime, ne kadar, hangi asset) decode eder.
3. Policy kontrolü: merchant allowlist'te mi, asset allowlist'te mi, saatlik/günlük harcama tavanı aşılıyor mu?
4. Geçerse ödeme header'ı gönderilir; geçmezse agent'a hata döner, hiçbir şey imzalanmaz.

### 4.3 Agent geliştiricisi — PaymentGuard ile delege yetki
1. Sahip, Mera passkey'i ile bir smart wallet oluşturur, PaymentGuard vault'a USDC yatırır.
2. Vault'a merchant başına per-tx cap + 24 saatlik rolling cap tanımlar.
3. Mera'nın PRF-türetilmiş anahtar materyalinden agent için ayrı, kapsamı dar bir sub-key türetilir.
4. Agent bu sub-key ile `pay()` çağırır — sahibin ana anahtarı hiç devrede değildir, sahip istediği an vault'u durdurabilir/limiti sıfırlayabilir.

## 5. MVP Kapsamı (Hafta 1-2'de çalışır olmalı)

- [ ] `/v1/analyze` endpoint'i: tek bir Monad testnet transaction'ını decode + simüle + risk dedektörleri + policy → karar.
- [ ] En az şu dedektörler: unlimited approval, setApprovalForAll, bilinmeyen/riskli kontrat, revert eden tx.
- [ ] Basit policy engine (aç/kapa kurallar, en az 8-10 tanesi).
- [ ] Showcase'de en az 2 tehdit senaryosu (safe/danger varyantlı).
- [ ] PaymentGuard.sol Monad testnet'e deploy edilmiş, temel `deposit/pay/withdraw` çalışıyor.

MVP'nin ötesindeki her şey (Nansen, Mera, Dynamic, Cleanverse, Envio, CRE, Qwen, MetaMask plugin) `BOUNTIES_AND_TRACKS.md`'deki tier sırasına göre eklenir.

## 6. Kapsam Dışı (Non-goals)

- Baret kendisi bir DEX/trading arayüzü **değildir** — Kuru/Perpl gibi trading bounty'lerini hedeflemiyoruz (bkz. `BOUNTIES_AND_TRACKS.md` → "Skip" listesi).
- Mobil ödeme/cross-border transfer uygulaması **değildir** — Agora bounty'leri kapsam dışı.
- Kalıcı, çok-kiracılı (multi-tenant) bir SaaS altyapısı kurmuyoruz; hackathon süresince tek-instance, demo ölçeğinde çalışır durumda olması yeterli.
- Genel amaçlı "her zincirde çalışsın" tasarımı **kesinlikle yok** — sadece Monad.

## 7. Başarı Kriteri ("magic moment")

Kullanıcı ilk kez showcase'deki riskli bir senaryoyu deniyor ve **hiçbir teknik bilgisi olmadan** "az kalsın param gidiyormuş, Baret durdurdu" hissini 30 saniye içinde yaşıyor. Bu an demo videosunun merkezinde olmalı. Onboarding'in her adımı bu ana ulaşmayı hızlandırmalı, geciktiren her adım (gereksiz form, açıklanmamış güvenlik promptu) elenmeli.

## 8. Sözlük

| Terim | Anlamı |
|---|---|
| **Guard / TransactionGuard** | İmzadan önce transaction'ı analiz API'sine gönderip karar alan istemci SDK'sı |
| **Policy** | Kullanıcının tanımladığı, aç/kapa + eşik değerli kural seti (`GuardPolicy`) |
| **Risk finding** | Bir dedektörün ürettiği tek bir bulgu (`code`, `severity`, `message`) |
| **PaymentGuard** | Agent'ların insan onayı olmadan, limitli şekilde ödeme yapabildiği on-chain vault sözleşmesi |
| **Sub-key** | Mera PRF materyalinden türetilmiş, ana anahtardan ayrı, kapsamı dar imza yetkisi |
| **x402** | HTTP 402 "Payment Required" üzerine kurulu, agent'ların otomatik ödeme yapmasını sağlayan protokol |
| **Compliance detector** | Cleanverse CVI kimlik doğrulaması geçmemiş bir transferi bloklayan risk dedektörü |
