# Baret — Frontend İçerik Spesifikasyonu (Showcase / Marketing Sitesi)

> **Bu dosya sadece İÇERİK içindir: her sayfada ne anlatılıyor, hangi bölümler var, hangi metin/mesaj/veri gösteriliyor, kullanıcı ne yapabiliyor.** Renk, tipografi, spacing, animasyon, palet — hiçbiri bu dosyada yok ve olmayacak; bunlar `BRAND.md` (henüz yazılmadı) ve frontend ekibinin kendi tasarım kararlarına ait. Bu dosyayı okuyan bir tasarımcı/geliştirici "bu sayfada ne olmalı"yı öğrenmeli, "nasıl görünmeli"yi değil.

Son güncelleme: 2026-09-14 · Durum: **İçerik spesifikasyonu, tasarım/implementasyon yok** · Kaynak: Baret-Stellar'ın `apps/showcase` kod tabanı — Monad/EVM'e uyarlanmış içerik. Site isimleri kullanıcı talimatıyla **aynen korunmuştur**: SCRYBE, NOVASWAP, PIXELDROP, ORBITYIELD, CLAIMHUB, LAUNCHPAD (bkz. `DECISIONS.md` D-010).

Bu, `apps/showcase`'in sahip olduğu tüm sayfaları kapsar: **Home**, **Showcase hub + 6 site**, **Agents**, **Docs**, **Install**.

---

## 1. Home / Landing Page

**Amaç:** Ürünü hiç bilmeyen birine 60 saniyede "bu ne yapıyor ve neden önemli" sorusunu cevaplamak. Profesyonel, iddiasız, sayılarla konuşan bir ton.

### 1.1 Sinematik açılış (opsiyonel, scroll-tetiklemeli)
Sayfa scroll edildikçe ilerleyen kısa bir video/animasyon dizisi, sırayla şu cümleleri gösterir (her biri bir scroll adımı):
1. "Her cüzdan dApp'in gösterdiği her şeyi imzalar."
2. "Bir Confirm butonu. Sonra zincir karar verir."
3. "Baret önce okur."
4. "Simüle edildi. Decode edildi. 25+ dedektör."
5. "Rolling cap'ler. Site bazlı policy. On-chain guard."
6. "Safe / Caution / Blocked. Anahtarlarınız hareket etmeden önce."
7. Marka anı: "Baret. İmzanız için bir firewall."

Bu bölüm opsiyonel/stretch — asset yoksa hiç render edilmez, sayfa doğrudan Hero'dan başlar.

### 1.2 Hero
- Canlı-durum rozeti: "Monad testnet'te canlı"
- Başlık: **"Önce oku. Sonra imzala."**
- Alt başlık: "Baret her Monad transaction'ını imzalamadan önce okur. Transaction'ı decode eder, ne yapacağını simüle eder, ve anahtarlarınız hareket etmeden önce düz dille bir karar verir: Safe / Caution / Blocked."
- İki CTA: **"Showcase'i aç"** (birincil), **"Docs'u oku"** (ikincil)
- Güven rozetleri (dört kısa etiket): "İmzalamadan önce simüle edilir" · "Düz dilde karar" · "Rolling harcama cap'leri" · "Sapmada uyarı"
- Sağ tarafta: gerçek Sign Request popup'ının bire bir küçük bir kopyası (pazarlama mockup'ı ile gerçek cüzdan ekranı aynı bileşeni paylaşır) — bloklanmış bir işlem örneği gösterir (ör. "evil-drainer.xyz" origin'inden gelen sınırsız approval isteği + "Blocked by your policy" kararı).

### 1.3 Dedektör marquee'si
Kayan/statik bir şerit, dedektörlerin isimlerini listeler (örnek etiketler — gerçek liste `ARCHITECTURE.md` §6 ile senkron tutulmalı):
"Wallet drainer" · "Unlimited approval" · "Hidden contract call" · "Admin key handoff" · "Fee abuse vs simulated baseline" · "Look-alike asset" · "Memo omission" · "Rug-pull pattern" · "Agent drift" · "Allowance overflow" · "Facilitator impostor" · "Unknown contract" · "LP unlock" · "Compliance gate" · "Phishing payload" · "Silent re-sign"

### 1.4 Üç Sütun (The Product)
Başlık: "Üç katman, tek imza." Açıklama: "Baret anahtarlarınız hareket etmeden önce üç kontrol çalıştırır. Her biri kendi başına ayakta durur. Birlikte, drainer'ların, bayat approval'ların ve sessiz agent'ların bugün geçtiği boşluğu kapatırlar."

1. **Pre-sign Guard** — "Baret her transaction'ı sunucuda decode edip simüle eder, sonra 25+ risk dedektörü çalıştırır. Popup her bulguyu tek cümlede açıklar." Alt noktalar: Sunucu simülasyonu · 25+ risk dedektörü · Policy motoru kapısı.
2. **Authorization Ledger** — "Her approval bir cap'i, bir saati ve canlı bir progress bar'ı olan bir satır olur. Unuttuğunuz sınırsız approval artık yok." Alt noktalar: Rolling cap'ler · Tek-tık iptal · Duraklat/devam ettir. (Canlı demo değeri: "acme-dapp.xyz günlük cap: 62/100 USDC")
3. **Post-sign Monitor** — "Baret hesabınızı ve smart wallet'ınızı bir WebSocket üzerinden izler. İmzalamadığınız bir şey hareket ederse anında tarayıcı bildirimi alırsınız." Alt noktalar: WebSocket subscribe · Sapma tespiti · Soğuk-başlangıç backfill.

### 1.5 "x402 Boşluğu" Bölümü (The Wedge)
Başlık: "x402 durumsuzdur. Baret değil." Açıklama: "x402, Monad'da şimdi canlı olan agentic-ödeme protokolü. Tasarım gereği **durumsuz** bir challenge-pay-settle el sıkışması. Her ödeme taze imzalanmış bir transferdir. Protokolün kendisinde allowance nesnesi yok, revoke endpoint'i yok, harcama cap'i yok. Baret protokol değil — üstüne oturan **durumlu bir kontrol katmanı** ve x402'nin bilerek dışarıda bıraktığı cap'leri ekliyor."

Karşılaştırma (x402 tek başına vs x402 + Baret), dört adımlı bir track üzerinden (402 Challenge → Sign → Pay → Settle): sade x402'de her adım bir öncekini unutur; Baret ile altındaki ledger her çağrı boyunca hatırlayan tek şeydir.

Üç somut boşluk/yanıt çifti:
1. **Sessiz agent sapması** — Bir agent her dakika mikro-ödeme yeniden imzalar; protokolde allowance nesnesi olmadığı için hiçbir şey çalışan toplamı göstermez. → Baret'in yanıtı: saatlik/günlük rolling per-merchant cap'ler; her imza gerçek bir sayıyı düşer, cap'e ulaşınca bir sonraki bloklanır.
2. **Sahte-benzeri asset swap'i** — Bir merchant yanlış issuer'dan "USDC" etiketli bir token sunar; spec sadece asset alanının eşleştiğini kontrol eder, hangi issuer'ın gerçek olduğunu değil. → Baret'in yanıtı: ağın kanonik USDC'siyle tohumlanmış cüzdan-taraflı bir asset allowlist'i; bilinmeyen kontratlar imzalamadan önce açık bir override ister.
3. **Yetki anahtarı ele geçirilmesi** — İmza anahtarı sızarsa, x402'de hasarı sınırlayacak merchant-bazlı bir kapsam yoktur. → Baret'in yanıtı: tek tıkla on-chain iptal edilen, merchant-bazlı kapsamlı bir sub-key; harcama cap'leri bugün extension tarafından uygulanıyor, sınırlı bir on-chain allowance yol haritada.

### 1.6 İstatistik Şeridi
Dört rakam: "25+" Risk dedektörü · "6" Tehdit senaryosu · "3" Savunma katmanı · "1" Monad testnet'te sözleşme.

### 1.7 Showcase Şeridi
Başlık: "Altı sahte-ama-gerçek dApp." Açıklama: "Bir cüzdan bağlayın ve bir butona tıklayın. Baret tehdidi canlı yakalar. Slayt yok, mockup yok." Altı site kartı (isim, kategori etiketi, "Catches: X" satırı) + "Showcase'i aç" linki. Kartlar Showcase hub'ındaki §2'nin özet hâlidir.

### 1.8 Karşılaştırma Bölümü
Başlık: "Aynı imza, iki cüzdan." Açıklama: "Burada hiçbir cüzdan kötülenmiyor. Bu, bir pre-sign kontrolün uygulama ile anahtarlarınız arasına girdiğinde ne değiştiğidir." Dört satırlık yan yana karşılaştırma:

| | Standart bir Monad cüzdanı | Baret |
|---|---|---|
| İmzalamadan önce | Bir kontrat adresi ve bir Confirm butonu. Gerisine zincir karar verir. | Decode edilmiş bir transaction, bir simülasyon, ve bir karar: Safe/Caution/Blocked. |
| Sınırsız approval'lar | Bir kere verilir, siz hatırlayıp iptal edene kadar yaşar. | Her approval bir cap'i ve saati olan bir satırdır. Duraklatmak/iptal etmek tek tık. |
| Agent ödemeleri | Bir agent gün boyu tavan olmadan mikro-ödemeleri yeniden imzalayabilir. | Saatlik ve günlük site-bazlı cap'ler, imza anında ve tekrar on-chain kontrol edilir. |
| İmzaladıktan sonra | Ne olduğunu bir block explorer'dan öğrenirsiniz. | Baret hesabınızı izler, imzalamadığınız bir şey hareket ederse uyarır. |

### 1.9 Güvenlik ve Gizlilik Bölümü
Başlık: "Ne nerede çalışıyor." Açıklama: "Anahtarlarınızın hareket etmeden önceki o ana Baret'i güveniyorsunuz, o yüzden onunla tam olarak ne yaptığımız burada."

Dört kart:
1. **Analiz bir sunucuda çalışır** — "Cüzdan imzasız transaction'ı decode ve simülasyon için analiz sunucusuna gönderir. Sunucu o imzasız transaction'ı görür. Anahtarlarınızı asla görmez."
2. **Sizsiz hiçbir şey imzalanmaz** — "Karar, popup size herhangi bir şey sormadan önce geri gelir. Siz onaylamadan hiçbir şey imzalanmaz. Baret Blocked dediğinde imzalamayı reddeder."
3. **Anahtarlar cihazınızda kalır** — "Anahtarlarınız cihazınızda şifreli olarak durur. Asla analiz sunucusuna veya başka bir yere gönderilmez."
4. **Simülasyon bir preflight'tır** — "Kararlar simüle edilmiş durumu yansıtır, garanti değil. Gaz, süre dolması ve ağ koşulları gerçek yürütmenin simülasyondan sapmasına neden olabilir."

Alt not: "Henüz denetim yok. Kod açık. Okuyun." + "Kaynağı görüntüle" linki (GitHub).

### 1.10 SSS
Bir cüzdana sign butonunu emanet etmeden önce insanların sorduğu adil sorular:
- "Analiz sunucusu çökerse ne olur?" → "Baret transaction'ın kontrol edilmediğini söyler ve kararı size bırakır. Asla sahte bir karar üretmez, asla sizin adınıza imzalamaz."
- "Diğer cüzdanlarla birlikte çalışır mı?" → "Evet. Baret standart bir EIP-6963 sağlayıcısı olarak kaydolur, zaten kullandıklarınızın yanında aynı cüzdan seçicide görünür. Hiçbir şeyi kaldırmadan kurabilirsiniz."
- "Ücretsiz mi?" → "Evet. Baret ücretsiz ve MIT lisansı altında açık kaynak."
- "Mainnet ne zaman?" → "Bugün testnet. Mainnet, mağaza listelemeleri ve daha fazla gerçek dünya testinden sonra gelecek. Firewall'ı geç ama doğru göndermeyi tercih ederiz."
- "Blocked gerçekte ne yapar?" → "Baret imzalamayı reddeder. Geçersiz kılabilirsiniz ama bu ayrı, bilinçli bir adımdır ve sonra görebilmeniz için loglanır."
- "Anahtarlarım nerede?" → "Cihazınızda şifreli. Hiçbir yere gönderilmez — ne analiz sunucusuna ne bize."

### 1.11 Son CTA
Başlık: "Gözleriniz açıkken imzalayın." Açıklama: "Showcase'i açın, bir cüzdan bağlayın, ve Baret'in gerçek zamanlı bir wallet drainer'ı reddetmesini izleyin." İki CTA: "Showcase'i aç", "Cüzdanı kur". Alt not: "Ücretsiz ve açık kaynak, MIT lisanslı. Bugün Monad testnet'te. Mağaza incelemesi bekleniyor."

---

## 2. Showcase Hub Sayfası

**Amaç:** "Muayene sahası." Altı sahte-ama-gerçek dApp, her biri farklı bir saldırı örüntüsüne bağlanmış.

### 2.1 Hero
Başlık: **"Altı dApp. Altı tehdit. Yapmadığınız bir imza."** Açıklama: "Aşağıdaki her site production-hazır görünüyor ve gerçek şey gibi davranıyor. Bir cüzdan bağlayın, bir butona basın, ve Baret saldırıyı düz dille yakalasın izleyin — anahtarlarınız hiç imzalamadan önce." CTA'lar: "Senaryoları gör", "Cüzdanı kur", "Docs'u oku". Canlı bir "ticker" cümlesi, sırayla farklı tehdit türlerini döndürür: "wallet drainer'lar", "sınırsız approval'lar", "rug-pull örüntüleri", "sessiz agent sapması", "sahte-benzeri asset'ler", "gizli kontrat çağrıları".

### 2.2 İstatistik Şeridi
"6" Demo dApp · "3" Tehdit sınıfı · "25+" Risk dedektörü · "1" Monad testnet'te sözleşme.

### 2.3 Senaryo Kartları (filtrelenebilir: Tümü / Drainer'lar / Güven tuzakları / Sessiz agent'lar)

Her kart: isim, kategori etiketi, tagline, açıklama, "Watch for" listesi (3 madde), tehdit sınıfı etiketi, "neden önemli" tek cümlesi, verdict (Blocked/Caution/Capped).

#### 01 — SCRYBE (x402, flagship)
- **Tagline:** Soru-başına oracle
- **Açıklama:** x402 üzerinden cevap başına $0.001 USDC ücretlendiren bir AI Soru-Cevap servisi. Gerçek bir 402 challenge, gerçek bir on-chain settlement, ve agent'ın harcamasına tavan koyan bir cüzdan.
- **Watch for:** Merchant-bazlı rolling harcama cap'i · Facilitator allowlist enforcement · Ödeme bacağı için asset allowlist'i
- **Tehdit sınıfı:** Sessiz agent · Sapma riski
- **Neden önemli:** Agent ödemeleri tasarım gereği tekrar eder, o yüzden küçük bir sızıntı her istekle birikir.
- **Verdict:** Capped

#### 02 — NOVASWAP (DeFi)
- **Tagline:** On-chain emir defterine yönlenen token swap
- **Açıklama:** Temiz bir DEX aggregator klonu. Danger modunu açın ve gizli bir operasyon çıktı token'ınızı taze bir cüzdana yönlendirir.
- **Watch for:** Bilinmeyen bir cüzdana çıktı transferi · Simüle edilen baseline'a karşı fee/gas suistimali · İtibar indeksi tarafından doğrulanmamış kontrat
- **Tehdit sınıfı:** Fon drenajı · Bilinmeyen kontrat
- **Neden önemli:** Çıktı yönlendirmeleri iyi saklanır çünkü swap'in kendisi yine de başarılı olur.
- **Verdict:** Blocked

#### 03 — PIXELDROP (NFT)
- **Tagline:** Generative NFT mint
- **Açıklama:** Bir "Cyber Phantoms" mint sayfası. Görselin arkasında, cüzdanınızdaki her varlığı boşaltan gizli bir yetki değişikliği oturuyor.
- **Watch for:** İstemediğiniz bir operatör yetkisi (`setApprovalForAll`) değişikliği · Wallet-drainer örüntü imzası · Mint ile ilgisiz varlıkların transferi
- **Tehdit sınıfı:** Wallet drainer · Yetki hırsızlığı
- **Neden önemli:** Mint sayfaları iyi bir drainer kılığı çünkü alıcılar hızlı imzalamayı bekler.
- **Verdict:** Blocked

#### 04 — ORBITYIELD (Staking)
- **Tagline:** Likit staking · %14 APY
- **Açıklama:** Bir likit-staking landing sayfası. Havuz gerçekten var ama on-chain unstake yolu olmayan anonim bir fork. Tek yönlü bir depozito.
- **Watch for:** Doğrulanmamış havuz kontratı · Keşfedilebilir unstake fonksiyonu yok · Kendi-depozitolarla şişirilmiş TVL
- **Tehdit sınıfı:** Güven tuzağı · Çıkış yolu yok
- **Neden önemli:** Tek yönlü bir depozito UI'da gayet iyi görünür. Eksik çıkış sadece on-chain'de ortaya çıkar.
- **Verdict:** Caution

#### 05 — CLAIMHUB (Airdrop)
- **Tagline:** Ekosistem airdrop claim'i
- **Açıklama:** Kullandığınız her airdrop sitesi gibi görünüyor. "Eligibility check" aslında stabil coin'leriniz üzerinde sınırsız bir approval imzalıyor.
- **Watch for:** Bir spender cüzdanına sınırsız approval · Allowlist tarafından doğrulanmamış domain · Bir transferi gizleyen claim operasyonu
- **Tehdit sınıfı:** Phishing · Sınırsız approval
- **Neden önemli:** Approval drainer'ları, imzaların kör olduğu her yerdeki en yaygın cüzdan saldırısıdır.
- **Verdict:** Blocked

#### 06 — LAUNCHPAD (Launch)
- **Tagline:** Onaylı token IDO'su
- **Açıklama:** Geri sayımlı ve tokenomics'li cilalı bir launchpad. Simülasyon, deployer'ın token admin key'ini elinde tuttuğunu ve LP'nin kilitli olmadığını ortaya çıkarır.
- **Watch for:** Deployer token admin key'ini elinde tutuyor · Likidite havuzu kilitli değil · Launch sonrası dondurulabilir token
- **Tehdit sınıfı:** Rug pull · LP kilidi yok
- **Neden önemli:** Elde tutulan bir admin key, deployer'ın launch gününden çok sonra mint veya dondurma yapmasına izin verir.
- **Verdict:** Caution

### 2.4 "Nasıl Çalışır" (dört adımlı, interaktif)
1. **Cüzdan bağla** — Baret'i veya seçiciden herhangi bir EIP-6963 cüzdanını seçin.
2. **Bir aksiyon tetikle** — Swap, Mint, Stake, Claim veya Buy'a basın. Site transaction'ı inşa eder.
3. **Baret inceler** — İmzasız tx üzerinde sunucu-taraflı simülasyon + 25+ dedektör + yerel policy'niz çalışır.
4. **Karar** — Safe / Caution / Blocked, her bulgu düz dilde. Gözleriniz açıkken imzalarsınız, ya da reddedersiniz.

### 2.5 Dedektör Izgarası ("Under the hood")
Başlık: "25+ dedektör her imzada ateşleniyor." Açıklama: "Her senaryo farklı bir alt küme tetikler. Popup size sadece önemli olan bulguları gösterir. Her biri transaction'ın neden şüpheli olduğunu tek cümlede açıklar." Üç öne çıkan kart: Pre-sign Guard (sunucu simülasyonu + dedektörler), Authorization Ledger (her grant cap+expiry+progress bar'lı bir satır), Post-sign Monitor (WebSocket subscribe, imzalamadığınız her şeyde uyarı). Yanında dedektör etiketlerinin bir listesi/ızgarası (bkz. §1.3 marquee listesi).

### 2.6 Son CTA
Başlık: "Bir kart seç. Firewall'ın ateşlenmesini izle." Açıklama: "Slayt yok, mockup yok. Yukarıdaki her senaryo gerçek bir analiz sunucusuna karşı gerçek bir transaction çalıştırır ve imzalamadan önce kararı gösterir."

---

## 3. Agents Sayfası

**Amaç:** Baret'in sadece bir cüzdan olmadığını, agent/bot cüzdanlarının kullanabileceği bir **NPM paketi + CLI** olarak da var olduğunu göstermek. Cüzdanı koruyan aynı firewall, agent geliştiricileri için bir SDK ve CLI olarak sunulur.

### 3.1 Hero
Başlık: **"Agent'ınız imzalar. Baret önce kontrol eder."** Açıklama: "Cüzdanınızı koruyan aynı pre-sign firewall, artık agent'lar ve bot cüzdanları için bir SDK ve CLI. Baret, agent'ınızın inşa ettiği her transaction'ı anahtar ona dokunmadan **önce** simüle eder ve policy kontrolünden geçirir. Drenajlar, sınırsız approval'lar ve haydut kontratlar imzalanmaz, bloklanır."

### 3.2 Nasıl Çalışır (üç adım)
1. **Kur** — Agent'ınıza `@baret/agent-kit` ekleyin, veya herhangi bir dilden `baret` CLI'ı kullanın.
2. **Bir policy yapılandır** — Strict, Balanced veya Permissive seçin. Bunlar agent'ınızın uyması gereken firewall kurallarıdır.
3. **Signer'ınızı sarın** — `guardedSubmit()` çağırın (veya raw tx'i `baret submit -`'a pipe edin). Safe → imzalanır ve gönderilir. Unsafe → bloklanır.

### 3.3 Quickstart (kod örnekleri — içerik olarak, gerçek paket adları `ARCHITECTURE.md` ile senkron)

**Kurulum:** `pnpm add @baret/agent-kit`

**SDK (TypeScript/Node) örneği içeriği:**
```
import { AgentWallet } from "@baret/agent-kit";

// Secret BARET_AGENT_SECRET'tan okunur; asla hard-code edilmez.
const agent = AgentWallet.fromSecret(process.env.BARET_AGENT_SECRET!, {
  serverUrl: "http://localhost:8080",
  network: "testnet",
  policy: "balanced",
});

const { hash, explorerUrl } = await agent.guardedSubmit(txRequest);
//  ↳ policy bloklarsa GuardBlockedError fırlatır. Anahtar asla imzalamaz.
```

**CLI (herhangi bir dilden) örneği içeriği:**
```
baret init --server http://localhost:8080 --network testnet --policy balanced
export BARET_AGENT_SECRET=0x...agent-private-key
echo "$TX_JSON" | baret submit -      # exit 0 gönderildi · 1 bloklandı · 2 hata
```

Yanında bir not: **"Fail-closed by design."** Baret sunucusuna ulaşılamıyorsa `evaluate` fırlatır ve imzalama hiç gerçekleşmez. Agent'ınız kör imzalamak yerine durur.

### 3.4 Policy Seçici
Üç şablon kartı (Strict / Balanced / Permissive), her biri kısa bir açıklama ve seçildiğinde altındaki kod örneklerini/playground'u güncelleyen bir seçim durumu.

### 3.5 Canlı Playground
Başlık: "Live playground." Açıklama: "Seçtiğiniz policy ile gerçek `/v1/analyze` pipeline'ını çalıştırır. Bir imzasız transaction (raw hex veya `{from,to,value,data}` isteği) yapıştırın ve agent'ınızın alacağı kararı görün."

**Girdi alanları:** Agent adresi (0x…, "rastgele üret" butonu ile), Network seçici (testnet/mainnet), Policy (seçiciden gelir, salt-okunur gösterim), Transaction girdisi (raw hex veya JSON tx-request, textarea).

**Buton:** "Analyze as agent" → gerçek analiz sonucu döner.

**Sonuç paneli:** ALLOW/ADVISORY/BLOCK etiketi + nedenler, risk bulguları (kod + şiddet + mesaj), tahmini MON/token bakiye hareketleri.

Not metni: "Bu playground Baret'in rate-limited, sadece-testnet hosted demo sunucusuyla konuşur — kurulum gerekmez. Kendi sunucunuza mı bağlamak istiyorsunuz? `pnpm dev:server` ile bir tane başlatın ve SDK'nın `serverUrl`'ini değiştirin."

Alt not: "Agent-bazlı bir audit monitörü kimlik doğrulamalı sunucu-taraflı erişim gerektirir, bu yüzden bu genel demonun parçası değil."

---

## 4. Docs Sayfası

**Amaç:** Baret'in nasıl çalıştığını anlatan tüm dokümanlara tek bir index'ten erişim. Her kart bu projenin `docs/` ağacındaki gerçek bir dosyaya işaret eder (GitHub linki).

### 4.1 Hero
Başlık: "Baret nasıl çalışır, detaylı." Açıklama: "Ana sayfadaki her iddiayı destekleyen spec'ler, protokoller ve tasarım notları. Aşağıdaki her giriş projenin `docs/` ağacındaki bir dosyaya karşılık gelir."

### 4.2 Doküman Kartları

Bu proje için Docs sayfasının işaret ettiği gerçek dosyalar (bu doküman setiyle senkron tutulmalı — yeni bir `docs/*.md` eklendiğinde burası da güncellenir):

| Kart başlığı | Açıklama | Karşılık gelen dosya |
|---|---|---|
| Vision | Bir transaction firewall'ının neden dApp'te değil cüzdanda olması gerektiği | `PROJECT_OVERVIEW.md` |
| Architecture | Sunucu, risk dedektörleri, policy motoru, veri akışı | `ARCHITECTURE.md` |
| Wallet Spec | Cüzdan primitifleri, hesap katmanları, oturum modeli, tüm ekranlar/akışlar | `WALLET.md` |
| Frontend Content | Bu sitenin her sayfasının içerik spesifikasyonu | `FRONTEND.md` (bu dosya) |
| Contracts | PaymentGuard ve ReputationRegistry sözleşme spec'leri | `CONTRACTS.md` |
| x402 Defense | x402 çağı için saldırı matrisi ve Baret'in yanıtı | `X402_FACILITATOR.md` |
| Resources | Hangi sponsor aracının nerede nasıl kullanıldığı | `RESOURCES.md` |
| Bounties & Track | Hedeflenen ödüller, track seçimi, öncelik sırası | `BOUNTIES_AND_TRACKS.md` |
| Roadmap | Haftalık plan ve ilerleyiş takibi | `ROADMAP.md` |
| Decisions | Alınan mimari/kapsam kararları ve gerekçeleri | `DECISIONS.md` |
| Brand | Marka kimliği, ton, tasarım tokenleri | `BRAND.md` (henüz yazılmadı) |

### 4.3 Alt CTA
Başlık: "Çalışırken görmeyi mi tercih edersiniz?" Açıklama: "Showcase, cüzdanın her katmanını tarayıcınızda test eder." CTA: "Showcase'i aç".

---

## 5. Install Sayfası

**Amaç:** Kullanıcının Baret cüzdan eklentisini indirip birkaç dakikada kurmasını sağlamak.

### 5.1 Hero
Rozet: "Baret'i kur." Başlık: **"Baret'i birkaç dakikada kurun."** Açıklama: "Transaction firewall'lı bir Monad cüzdanı. Her transaction'ı simüle eder, policy'nize karşı kontrol eder, ve her agent'ın x402 üzerinden harcayabileceğine tavan koyar — anahtarlarınız imzalamadan önce. Mağaza listelemeleri gelene kadar bir geliştirici build'i gibi yüklenir." Tarayıcı algılama notu: "Chromium tabanlı bir tarayıcı algıladık (Chrome/Brave/Edge)." / "Firefox algıladık." / "Tarayıcınıza uyan build'i seçin."

### 5.2 İndirme Kartı
Birincil indirme: algılanan tarayıcıya göre "Baret for Chrome/Brave/Edge" veya "Baret for Firefox" (ZIP arşivi, en son build, MV3 manifest notu). Altında ikincil bir link: "Ayrıca mevcut: [diğer tarayıcı build'i]".

### 5.3 Kurulum Adımları (üç adım, tarayıcıya göre değişir)

**Chrome/Brave/Edge:**
1. **ZIP'i çıkar** — `baret-chrome.zip`'i çıkarın, klasörü hatırlayın.
2. **`chrome://extensions/`'ı aç** — Adres çubuğuna yapıştırın, sağ üstten "Developer mode"u açın.
3. **"Load unpacked"** — Çıkardığınız `baret-chrome` klasörünü seçin. Baret toolbar'da belirir. Tıklayıp cüzdanınızı oluşturun. Kurulum tam bir sekmede açılır: passphrase, secret yedekleme, testnet fonlama. Yaklaşık üç dakika.

**Firefox:**
1. **ZIP'i çıkar** — Aynı.
2. **`about:debugging#/runtime/this-firefox`'u aç**
3. **"Load Temporary Add-on…"** — Çıkardığınız klasördeki `manifest.json`'ı seçin. Not: Firefox geçici eklentileri tarayıcı yeniden başlatıldığında temizlenir; her yeniden başlatmadan sonra Baret'i yeniden yükleyin.

### 5.4 Özellik Izgarası ("Why this wallet")
- **Pre-sign simulation** — "Baret popup imzalamanızı istemeden önce her transaction'ı decode edip simüle eder."
- **x402 firewall** — "Baret HTTP 402 ödemelerini saat/gün başına sınırlar ve allowlist'inize karşı kontrol eder."
- **On-chain revoke** — "Her site kendi sub-key'ini alır. Tek dokunuşla on-chain iptal edin."

### 5.5 Kurulum Sonrası CTA
Başlık: "Showcase'de bir tur atın." Açıklama: "Altı sahte-ama-gerçek dApp altı farklı saldırı örüntüsünü tetikler. Baret her birini canlı yakalar. İmzalamadan önce analizi görürsünüz." CTA'lar: "Showcase'i aç", "Docs'u oku".

---

## 6. Sayfa-Doküman Senkronizasyon Kuralı

Bu dosyadaki içerik gerçek kodla senkron tutulmalı: bir sayfaya yeni bir bölüm eklenirse, kaldırılırsa veya kopyası değişirse önce bu dosya güncellenir. Docs sayfasının kart listesi (§4.2) özellikle bu doküman setinin (`docs/*.md`) mevcut dosyalarıyla bire bir eşleşmeli — yeni bir doküman eklendiğinde iki yerde de (kart listesi + gerçek Docs sayfası implementasyonu) güncelleme yapılmalı.
