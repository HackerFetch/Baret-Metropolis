# Baret — Cüzdan Spesifikasyonu

> Cüzdanın her yüzeyi, her ekranı, her akışı. Bu doküman **bağlayıcıdır**: yeni bir ekran eklemek önce bu dosyanın güncellenmesini, sonra implementasyonu gerektirir. Renk/tipografi `BRAND.md`'den gelecek (henüz yazılmadı). Genel mimari için `ARCHITECTURE.md`, sözleşme detayları için `CONTRACTS.md`, x402 mekaniği için `X402_FACILITATOR.md`'ye bakın.

Son güncelleme: 2026-09-14 · Durum: **Spesifikasyon aşaması, implementasyon yok** · Kaynak: Baret-Stellar'ın `docs/wallet-spec.md` dosyası — Monad/EVM'e uyarlanmıştır (Soroban→EVM, trustline→ERC-20 approval, XLM→MON, Horizon→Monad RPC, Friendbot→Monad faucet).

---

## 0. İki Cüzdan Yüzeyi Var — Neden

Baret iki ayrı cüzdan ürünü sunar; ikisi de aynı `@baret/guard` analiz motorunu kullanır ama farklı hesap katmanları ve farklı bounty hedefleri var:

| | `apps/extension` (amiral gemisi) | `apps/wallet` (bağımsız demo) |
|---|---|---|
| Hesap katmanı | Klasik self-custody: yerel keypair, passphrase ile şifrelenmiş keystore (seed phrase yedeği var) | **Mera passkey** — seed phrase yok, PRF-türetilmiş anahtar materyali |
| Kullanım amacı | Günlük kullanım, dApp'lere bağlanma, showcase demoları | Mera bounty'lerinin (`BOUNTIES_AND_TRACKS.md` #4, #5) canlı kanıtı + PaymentGuard agent sub-key demosu |
| Platform | Chrome MV3 (+ mümkünse Firefox) | Bağımsız web uygulaması (React, kendi portu) |
| Bu dosyada | §2 | §3 |

**Karar (D-009, bkz. `DECISIONS.md`):** Extension'ın hesap katmanı Mera'ya taşınmıyor — MV3 popup içinde WebAuthn/passkey akışının güvenilirliği ve izin modeli daha karmaşık; extension klasik passphrase+seed modelini korur. Mera'nın "seed phrase yok" vaadi, tam kontrolü olan bir web sayfası olan `apps/wallet`'ta çok daha temiz gösterilebilir. Bu, iki bounty'nin de gerçek, zorlanmamış bir yüzeyde kazanılmasını sağlıyor.

---

## 1. Ortak Kavramlar

### 1.1 Durum Makinesi (her iki yüzey için)

```
WalletState =
  | { phase: "uninitialized" }       // ilk kurulum, cüzdan yok
  | { phase: "locked"; meta }        // cüzdan var, oturum kilitli
  | { phase: "ready"; session }      // açık, boşta
  | { phase: "signing"; req, … }     // bir imza talebi inceleniyor
  | { phase: "alert"; alert, … }     // drift / iptal edilmiş merchant — banner
```

Geçişler tek yönlü ve açık. `uninitialized` → onboarding'e yönlendirir; `locked` → minimal kilit açma ekranı gösterir.

### 1.2 Terimler

| Terim | Anlamı |
|---|---|
| **Authority address** | Cüzdanın ana 0x adresi (extension: yerel keypair; apps/wallet: Mera'dan türetilmiş adres) |
| **Sub-key / Agent signer** | Bir merchant/agent için türetilmiş, kapsamı dar imza yetkisi. Extension'da yerel bir oturum anahtarı; apps/wallet'ta Mera PRF sub-key, `PaymentGuard.setAgentSigner()` ile on-chain bağlanır |
| **Allowance** | Bir ERC-20 `approve` grant'i (spender + limit) VEYA bir PaymentGuard merchant cap'i — ikisi de aynı "Allowances" sekmesinde gösterilir |
| **Drift** | Cüzdanın imzalamadığı ama bakiyeyi/yetkiyi değiştiren bir on-chain olay |
| **Verdict** | Bir analiz sonucunun kullanıcıya gösterilen hâli: Safe / Caution / Blocked |

---

## 2. Extension — Dört Yüzey

Cüzdan dört birbirini dışlayan bağlamda render edilir:

| Yüzey | Tetikleyici | Boyut | Kalıcılık | Navigasyon |
|---|---|---|---|---|
| **Popup** | Kullanıcı toolbar ikonuna tıklar | 360 × 600 | Yok — blur'da kapanır | Alt tab bar |
| **Options page** | Toolbar menüsü / tarayıcı ayarları / deep-link | 1280×800+ (responsive) | Tab kalıcı | Sidebar |
| **Sign request** | dApp `eth_sendTransaction`/`eth_signTransaction` çağırır; veya content interceptor HTTP 402 yakalar | 360×600 (popup yeniden render) | resolve/reject'te kapanır | Yok — canvası kendisi kullanır |
| **Onboarding** | İlk kurulum veya Reset sonrası | Tam ekran (options page rotası) | Tamamlanana kadar kalıcı | Sadece adım göstergesi |

**Kural:** Bir imza talebi işlemdeyken popup asla nav göstermez. Sign-request yüzeyi popup'ın tam ekran yeniden render'ıdır; bakiye, geçmiş, chrome — hepsi gizli. İmza çözüldüğünde popup son görüntülenen taba geri döner.

### 2.1 Popup (kompakt)

```
┌──────────────────────────────────────┐  360 × 600
│  ÜST ŞERİT                         ⋯│  Hesap seçici · alert sayısı · ⚙
├──────────────────────────────────────┤
│  ANA BAKİYE                          │  Büyük rakam · USD alt satır
│  [ Gönder ] [ Al ] [ Swap ]         │
├──────────────────────────────────────┤
│  ALERT BANNER (koşullu)              │
├──────────────────────────────────────┤
│  TAB İÇERİĞİ — kaydırılabilir        │  Varsayılan: Home → son aktivite
├──────────────────────────────────────┤
│  TAB BAR: Home · Activity · Allowances · Settings │
└──────────────────────────────────────┘
```

**Üst şerit:** Hesap seçici (adres + alt bakiye satırı) → *Accounts* sheet açar. Alert sayacı → `alertsUnread > 0` olduğunda pill gösterir, *Activity → Alerts*'e gider. Settings ikonu → *Settings* tabını açar.

**Ana bakiye:** Tek büyük rakam, native MON bakiyesi (Monad RPC'den, wei'den çevrilmiş). USD alt satırı fiyat API'sinden (60sn cache). İlk yüklemede count-up animasyonu, sonrasında yok. Üç hızlı aksiyon: **Gönder**, **Al**, **Swap**. "Swap" v1'de placeholder: *"Swap yakında. Şimdilik bir Monad DEX'i doğrudan kullanın → [link]"* — yarım-pişmiş bir swap özelliği göndermiyoruz.

**Alert banner** şu durumlardan biri varsa görünür:
- Son 1 saatte %80 cap'i aşan bir allowance
- Son 7 günde okunmamış bir drift alert
- Bir merchant'ın sub-key'i zorla iptal edilmiş
- Bekleyen bir x402 verify-orphan (imzalandı ama settlement onayı gelmedi)

**Tab içeriği (Home varsayılan):** "Son aktivite" (son 4 kayıt), "Aktif allowance'lar" (saatlik hit sayısına göre ilk 2, mini progress bar). Boş durum: "Henüz aktivite yok. Bir transfer deneyin veya bir dApp'e bağlanın."

**Alt tab bar:** Home · Activity (rozet: `alertsUnread > 0`) · Allowances · Settings. Send/Receive tab bar'da **değil** — Home'daki hızlı aksiyonlarda yaşarlar; tab bar sadece geri dönülen şeyler için.

### 2.2 Popup — Activity Tab

Ters-kronolojik log: giden transferler, gelen transferler (post-sign monitor tarafından tespit edilen), dApp imzaları (merchant origin chip'i ile), x402 ödemeleri (merchant + tutar + kümülatif harcama chip'i), drift alert'leri, verify-orphan'lar, revoke event'leri.

**Filtre chip'leri:** All · Sends · Receives · dApps · x402 · Alerts

**Satır anatomisi:** `● Origin/Counterparty` (durum noktası + kalın satır) / `Action — amount · time ago` (soluk satır). Tıklama → satır içi genişler (popup) veya tam detay sheet açar (options): simülasyon bulguları, bakiye değişimleri, imza, explorer linki (`testnet.monadexplorer.com`).

**Boş durum:** "Henüz hiçbir şey imzalamadınız. Bir dApp'e bağlanın veya biraz MON gönderin."

### 2.3 Popup — Allowances Tab

Ürünün görsel kalbi — her aktif yetkinin canlı cap'i ve tek-tıkla iptali.

**Başlık şeridi:** Toplam aktif grant sayısı + son 24 saatte harcanan toplam. "Tümünü iptal et" butonu (yıkıcı, onay ister; her smart-wallet sub-key'ini/agent signer'ı düşürür).

**Merchant kartı:**
```
▲ merchant.example
  USDC · Saatlik cap
  ━━━━━━━━━━━━━━━━━━━░░░░░  %62
  $1.86 / $3.00 (bu saat)
  ─────
  18 çağrı bugün · son 4 dk önce
  [ Duraklat ]  [ İptal et ]
```

**Duraklat** = sub-key'i yerelde dondur (on-chain değişiklik yok, tersine çevrilebilir). **İptal et** = `PaymentGuard.revokeAgentSigner()` (veya klasik ERC-20 `approve(spender, 0)`) çağrısı gönderir; merchant bu sub-key ile bir daha asla imzalayamaz. İptal, sonucu düz dille açıklayan bir onay sheet'i açar.

**Boş durum:** "Henüz hiçbir merchant'a yetki vermediniz. Bir x402 servisi veya token approval isteyen bir dApp'e bağlandığınızda burada görünecek."

**Manuel allowance ekleme (gelişmiş):** Başlıktaki `+` ikonunun arkasında. İleri düzey bir kullanıcının hiçbir merchant istemeden önce cap'li bir sub-key önceden oluşturmasını sağlar — test ve önceden provizyonlanmış kapsam gerektiren agent'lar için.

### 2.4 Popup — Settings Tab

Kompakt; her satır options page'deki tam versiyona linklenir.

| Satır | Alt satır |
|---|---|
| Network | "Testnet" / "Mainnet" |
| Security | "15 dk hareketsizlik sonrası kilitlenir" |
| Policy | "Balanced şablon" |
| About | "v0.1.0 · açık kaynak" |
| Cüzdanı kilitle | (anlık aksiyon) |
| Cüzdanı sıfırla | (yıkıcı — onay akışı açar) |

### 2.5 Options Page (tam)

İki kolon: 240px sol sidebar + ana kolon (max-width 1024). Popup ile aynı tab'lar, genişletilmiş.

**Sidebar:** Hesap seçici · Home · Activity · Allowances · **Policies** (sadece options) · **x402** (sadece options) · Settings · Cüzdanı kilitle · Yardım/Docs

**Home (options):** Popup hero'suna ek olarak: Holdings tablosu (MON + ERC-20 token listesi, değerlerle), İzlenen allowance'lar listesi (bir tık olduğunda pulse animasyonu), Son dApp bağlantıları, Haber/changelog şeridi (statik JSON feed'den).

**Activity (options):** Popup'ın aynısı + tarih aralığı filtresi, origin arama, tutar aralığı filtresi, CSV export, toplu yeniden-analiz (geçmiş tx'leri güncel policy'ye karşı yeniden çalıştırıp retroaktif drift işaretler).

**Allowances (options):** Her merchant kartı tam satıra büyür: 7 günlük harcama grafiği (sparkline), detaylı cap kırılımı (per-tx · saat · gün), sub-key/agent signer 0x adresi + explorer linki, bu allowance altındaki tüm tx'ler (genişletilebilir). Toplu işlemler: "30 gündür kullanılmayanları iptal et", "Tümünü export et", "Varsayılana sıfırla".

**Policies (sadece options):** Tam editör. Form tab + ham JSON tab. Üstte üç şablon butonu (Strict/Balanced/Permissive). Canlı policy önizlemesi uygulanırsa ne değişeceğini gösterir. Kaydetme açık; asla otomatik uygulanmaz.

**x402 (sadece options):** Özel x402 panosu — bkz. `X402_FACILITATOR.md` §4.4 ile senkron:
- Genel bakış başlığı: bugün/hafta/ay harcanan toplam, aktif merchant sayısı, alert sayısı
- Canlı ticker: 7 günlük, her x402 ödemesinin simulate→verify→settle durumlarını 3 nokta olarak dolduran zaman çizelgesi
- Merchant bazlı: aynı allowance kartları, facilitator'a göre gruplanmış
- Facilitator bazlı: itibar kartı — bilinen-iyi vs bilinmeyen
- Drift-orphan gelen kutusu: verify-ama-settle-yok ve imzalandı-ama-teyit-gelmedi vakaları

**Settings (options):** Identity (hesap adı), Security (passphrase değiştirme, idle timeout, kurtarma), Network (testnet/mainnet seçici, özel RPC URL override), Policy (Policies tabına link), Notifications, Privacy (telemetri kapalı varsayılan, yerel veri export), Advanced (dev-only), Danger zone (Reset wallet).

### 2.6 Sign Request

dApp `eth_sendTransaction`/`eth_signTransaction`/`personal_sign`/`eth_signTypedData_v4` çağırdığında veya content interceptor HTTP 402 yakaladığında tetiklenir.

```
┌──────────────────────────────────────┐  360 × 600
│  ◐  merchant.example                 │  origin chip + favicon
│  Sign request                        │
│  Send 0.50 MON to 0xBF…Q9Y           │  fiil + nesne
├──────────────────────────────────────┤
│  ✓ Safe to sign                      │  hero finding (Safe/Caution/Blocked)
│  Matches your policy.                │
├──────────────────────────────────────┤
│  WHAT CHANGES                        │
│   − 0.50 MON  →  Counterparty        │
│   − 0.0002 MON (network fee)         │
├──────────────────────────────────────┤
│  [▾ Findings (2)]                    │  collapsible
│  [▾ Policy hits (0)]                 │
│  [▾ Raw transaction]                 │  her zaman en son; ileri düzey
├──────────────────────────────────────┤
│  ⏱ 04:23 içinde otomatik iptal       │
│  [ Decline ]    [ Sign and send ]    │  blokta primary devre dışı
└──────────────────────────────────────┘
```

**Hero finding durumları:**

| Durum | Hero metni | Primary buton |
|---|---|---|
| `ok` (safe) | "Safe to sign" + 1 satır özet | Aktif, primary |
| `advisory` (safe + uyarı) | "Sign with caution" + neden | Aktif, primary; "Sign anyway" |
| `block` | "Blocked by your policy" + kural | Devre dışı (veya kullanıcı policy'si izin veriyorsa "Sign anyway" + çift onay) |
| `error` (analyze ulaşılamıyor) | "Can't reach Baret" + offline-mod ipucu | Aktif ama stilize primary değil — açıkça "Sign without protection" |

**What changes:** Analyzer'ın `estimatedChanges`'inden gelir: native MON delta, ERC-20 token delta, allowance/approval değişimleri.
- Native MON ve token bakiye delta'ları `±` satırlar olarak; önce kullanıcının cüzdanı, sonra karşı taraflar
- Approval satırı: sarı "**ERC-20 approve** — merchant.example spends up to 10 USDC"
- x402 için: "Pays $0.001 USDC to merchant.example" + kümülatif harcama chip'i

**Findings/Policy hits/Raw transaction:** Findings her biri şiddet noktası + kod + düz dil özeti; genişleyince tam mesaj + "Neden önemli" linki. Policy hits ateşlenen kuralları listeler (kural adı + mevcut/limit + "policy'yi düzenle" linki). Raw transaction: hex calldata dump + decode edilmiş fonksiyon çağrısı + imzacılar — sadece ileri düzey kullanıcı için, asla varsayılan.

**Otomatik iptal:** x402 istekleri için `maxTimeoutSeconds`'a geri sayım; süresi dolunca otomatik red. Normal dApp istekleri için 5 dakikalık sabit tavan (advanced settings'te ayarlanabilir).

### 2.7 Onboarding (Extension — klasik seed)

8 adım, dikkatli bir kullanıcı için ~3-4 dakika. Options page rotasında render edilir, popup'ta değil.

```
[●○○○○○○○] Welcome
[●●○○○○○○] Passphrase belirle
[●●●○○○○○] Keypair üret (otomatik)
[●●●●○○○○] Secret'ı yedekle
[●●●●●○○○] Hesabı fonla (testnet faucet)
[●●●●●●○○] Smart wallet provizyonu
[●●●●●●●○] Policy şablonu seç
[●●●●●●●●] Bitti
```

1. **Welcome:** Tek cümlelik hero ("İmzaladıktan sonra ne olduğunu izleyen bir cüzdan."), üç özellik chip'i (Pre-flight sim · Live monitor · Real revoke). CTA: **Get started**. Alt: "Testnet only · Demo network · Open source · Self-custody".
2. **Passphrase belirle:** İki şifre girişi + güç ölçer + "Neden PIN değil de passphrase?" açıklaması. Min 12 karakter.
3. **Keypair üret (otomatik ilerler):** ~3 saniyelik "generating" animasyonu. Bitince yeni `0x…` adresi + "Created" zaman damgası gösterilir. Arka planda: secp256k1 keypair üretimi; şifreli keystore IndexedDB'ye yazılır.
4. **Secret'ı yedekle:** "Bunu **bir kez** kaydedin. Kaybederseniz kurtarma yok." 12/24 kelimelik mnemonic veya raw private key (karar `DECISIONS.md`'ye eklenecek — hangisi kullanılacak). "Reveal" butonu → "Kaydettim" checkbox'ı → **Continue** açılır. "Yedeklemeyi atla" linki iki-tıkla onay ister.
5. **Hesabı fonla:** Mevcut bakiye (`0 MON`), adres, testnet faucet CTA'sı (`faucet.monad.xyz`). Zaten fonlanmış hesaplar başarı sayılır. Kullanıcı ilerlemek için minimum bir eşiğe (ör. ≥0.1 MON) ulaşmalı.
6. **Smart wallet provizyonu:** Otomatik tetiklenir. İlerleme metni durum akışını gösterir ("Checking authority…", "Resolving…", "Resolved"). **Şu an için** provizyon, authority'nin fonlandığını doğrular ve fonlanmış adresi placeholder smart wallet olarak döner — gerçek bir akıllı hesap kontratı entegrasyonu TODO (bkz. `ARCHITECTURE.md` §10 "açıkça yapılmayacaklar" — bu placeholder kalıcı olmamalı, Hafta 4'te gerçek entegrasyona dönüşmeli).
7. **Policy şablonu seç:** Üç kart (Strict/Balanced/Permissive), her biri en belirgin 3 kuralı gösterir. Altında "Sonra özelleştir" linki. CTA: **Apply policy**.
8. **Bitti:** ✓ + "Korunuyorsunuz." + üç "Dene" önerisi: showcase'i dene, gerçek bir Monad dApp'ine bağlan, ilk allowance'ını kur. CTA: **Open wallet**.

---

## 3. Standalone Mera Wallet (`apps/wallet`)

Extension'ın basitleştirilmiş, Mera passkey ile çalışan demo muadili. Amaç: Mera bounty'lerini (`BOUNTIES_AND_TRACKS.md` #4, #5) net ve zorlanmamış şekilde göstermek.

### 3.1 Onboarding (Mera — seed phrase yok)

```
[●○○○○] Welcome
[●●○○○] Passkey oluştur (WebAuthn)
[●●●○○] Hesabı fonla (testnet faucet)
[●●●●○] Policy şablonu seç
[●●●●●] Bitti
```

1. **Welcome:** "Seed phrase yok. Passkey yeter." teması. CTA: **Passkey ile başla**.
2. **Passkey oluştur:** Tarayıcının native WebAuthn diyaloğu (Face ID/Touch ID/Windows Hello/güvenlik anahtarı). Başarılı olduğunda Mera, PRF uzantısından deterministik anahtar materyali türetir; bundan hesabın `0x…` adresi çıkarılır. Kullanıcıya gösterilen tek şey: "Hesabınız oluşturuldu — cihazınız anahtarınızdır."
3. **Hesabı fonla:** Extension ile aynı (testnet faucet).
4. **Policy şablonu seç:** Extension ile aynı üç şablon.
5. **Bitti:** "Korunuyorsunuz — ve hiçbir yerde bir kurtarma cümlesi yok."

### 3.2 Agent Sub-Key Demo (Mera "One Passkey, Many Keys")

Standalone wallet'a özel bir "Agent Delegation" sayfası: kullanıcı burada bir PaymentGuard vault'a MON/USDC yatırır, bir merchant için cap tanımlar, ve **Mera'nın PRF materyalinden ikinci, kapsamı dar bir sub-key türetilmesini** tetikler. Bu sub-key, ana passkey'e hiç dokunmadan `PaymentGuard.setAgentSigner()` ile on-chain bağlanır. Sayfa şunu gösterir:

```
Owner passkey (Mera)  ──derives──▶  Agent sub-key (Mera PRF, farklı salt)
        │                                   │
        │ tam kontrol                       │ sadece pay(), cap içinde
        ▼                                   ▼
   Vault deposit/withdraw          PaymentGuard.pay(merchant, amount)
```

Kullanıcı "İptal et" derse, sub-key on-chain `revokeAgentSigner()` ile anında geçersiz olur — ana passkey hiçbir zaman riske girmedi. Bu akış, Mera bounty'sinin "most creative non-wallet use of Mera's PRF-derived key material" kriterinin doğrudan karşılığıdır.

### 3.3 Sayfalar (özet)

Extension'daki tab yapısının basitleştirilmiş hâli: Home, Send, Receive, History, Policies, Settings, Connect, Sign, **Agent Delegation** (yeni, §3.2). Sign akışı extension ile aynı `@baret/guard` çağrısını kullanır.

---

## 4. Kritik Akışlar

### 4.1 dApp'e bağlanma (EIP-1193 / EIP-6963)

```
dApp                 Content script        Background          Popup UI
 │ window.ethereum   │                     │                   │
 │ (EIP-6963 announce)│<────────────────────│                   │
 │ eth_requestAccounts│────────────────────>│ openConnectPopup()│
 │                    │                     │──────────────────>│ Connect ekranı
 │                    │                     │                   │ kullanıcı onaylar
 │                    │                     │<──────────────────│ approve(account)
 │ {accounts}         │<────────────────────│                   │
```

### 4.2 İşlem imzalama

1. dApp `eth_sendTransaction` çağırır.
2. Content script raw tx-request'i background'a `runtime.connect` ile iletir.
3. Background: calldata decode eder → `TransactionGuard.evaluate({ transaction, userWallet, policy })` çağırır (Baret analyzer `/v1/analyze`'a gider) → `allow`/`block` kararını + `estimatedChanges`'i okur → popup'ı Sign-Request modunda açar.
4. Popup Sign Request'i render eder (§2.6).
5. Kullanıcı Decline veya Sign seçer.
6. Background: Sign'da yerel keypair (veya Mera sub-key) ile imzalar, `signAndSend` modundaysa Monad RPC'ye gönderir, imzalı tx'i dApp'e geri postalar. Decline'da red nedeniyle sign-rejected postalar. Her koşulda history'ye loglar.
7. Popup son görüntülenen taba geri döner.

### 4.3 x402 ödeme yakalama

Content script `fetch`/`XMLHttpRequest`'i izler. 402 + `PaymentRequirements` yanıtı geldiğinde: bkz. `X402_FACILITATOR.md` §3 (tam sequence diagram orada). Özet: extract → policy kontrolü → onaylanırsa ödeme header'ı inşa edilir ve imzalanır (envelope değil, sadece ödeme yetkisi) → içerik script'i isteği otomatik yeniden dener → background settlement'ı izler → ledger güncellenir.

### 4.4 Drift alert

Background monitor, authority + smart-wallet adresleri için Monad RPC'yi (WebSocket subscribe, polling değil — `notes-2.txt`'deki Alchemy tavsiyesine göre) izler ve bizim başlatmadığımız giden bir tx görürse: push notification → ALERT state'e girer → popup badge +1 → kullanıcı banner'a tıklar → tam olay görünümü: İncele (explorer'da aç), Sub-key'i duraklat, Sub-key'i iptal et, Bilinen olarak işaretle (allowlist).

### 4.5 Sub-key / agent signer iptali

1. Kullanıcı bir allowance kartında "İptal et"e basar.
2. Onay sheet'i: "merchant.example bir daha cüzdanınızdan ödeme imzalayamayacak. Bu on-chain sub-key'i düşürür. Devam?"
3. Onaylanırsa background `PaymentGuard.revokeAgentSigner()` (veya klasik `approve(spender, 0)`) çağrısı inşa eder, Sign Request açar.
4. Kullanıcı imzalar (bu ayrıcalıklı bir işlem, sub-key değil ana yetki gerekir).
5. Onaylanınca: ledger merchant'ı `revoked` işaretler, sub-key gider, o merchant'tan gelecek her ödeme denemesi cüzdan seviyesinde başarısız olur.

---

## 5. Hata ve Boş Durumlar

| Yer | Durum | Metin |
|---|---|---|
| Popup home | Bakiye yok + aktivite yok | "Bir dApp'e bağlanın veya biraz MON gönderin." |
| Activity tab | Boş | "Aktiviteniz burada görünecek. Reddettiklerimiz dahil her imzayı loglarız." |
| Allowances | Boş | "Henüz hiçbir merchant'a yetki vermediniz." |
| Sign request | Analyzer offline | "Baret'e ulaşılamıyor. Korumasız imzala?" |
| Sign request | RPC ulaşılamıyor | "Monad RPC şu an yanıt vermiyor. Birazdan tekrar deneyeceğiz." |
| Network uyuşmazlığı | dApp mainnet istiyor, cüzdan testnet'te | "Bu dApp mainnet istiyor ama siz testnet'tesiniz. Geçilsin mi?" |
| Cüzdan kilitli | Toolbar tıklaması | Tek input passphrase ekranı + Reset linki |

Her hata: ne oldu, kullanıcı ne yapabilir, biz ne yaptık — asla sadece "Error" veya stack trace.

---

## 6. Erişilebilirlik & Performans Bütçesi

- Her aksiyon Tab+Enter ile erişilebilir; sign-request modal focus'u hapseder.
- Minimum 32px hit target (popup'ta 36px).
- `prefers-reduced-motion` count-up'ları, live pulse'ları, onboarding animasyonunu devre dışı bırakır.
- Screen reader: her durum ikonu `aria-label` ile eşleşir.
- Popup ilk boyama: ≤200ms soğuk, ≤60ms sıcak. Sign-request render: ≤400ms. Background bellek: ≤120MB boşta, ≤200MB aktif izlemede.

---

## 7. V1 Kapsamı Dışı (scope-guard)

- Tek smart-wallet kimliğinin ötesinde çoklu hesap UI'ı
- Mainnet (v1 sadece testnet; mainnet flag'i v1.5)
- Donanım cüzdanı entegrasyonu (Ledger/WebUSB)
- Allowance ledger için cihazlar arası senkron
- Popup içi swap (sadece placeholder)
- NFT görünümü / portföy (Faz 2)
- Özel RPC URL (Faz 2; v1 sabit Monad testnet endpoint'i, advanced settings'te opsiyonel override)

---

*Bu doküman implementasyon sözleşmesidir. Her cüzdan PR'ı uyguladığı bölümü referans vermelidir.*
