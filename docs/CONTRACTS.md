# Baret — Akıllı Sözleşme Spesifikasyonu

> Foundry ile Monad testnet/mainnet'e deploy edilecek sözleşmelerin tasarımı. Kod yazılmadan önce bu dosya spec olarak kullanılır; deploy sonrası adres tablosu doldurulur ve bu dosya güncel tutulur.

Son güncelleme: 2026-09-13 · Durum: **Spec aşaması, deploy yok**

---

## 1. Genel İlkeler

- Solidity + Foundry (`forge build`, `forge test`, `forge fmt`).
- Her sözleşme için en az bir **fuzz invariant testi** (ör. "vault bakiyesi asla toplam aktif merchant rezervinin altına düşemez").
- Monad gas pricing local testte aktif (`ARCHITECTURE.md` §9, `RESOURCES.md` §2).
- Storage layout: per-user alanlar tek struct'ta gruplanır (MIP-8 locality avantajı — bkz. `notes (4).txt`), gereksiz bit-packing yapılmaz.
- Sözleşme isimlerinde/yorumlarında başka bir zincirin adı geçmez; sadece Monad'a referans.

---

## 2. `PaymentGuard.sol` — Harcama-Limitli Vault

**Amaç:** Agent'ların, sahibin her ödemeyi tek tek imzalamasına gerek kalmadan, tanımlı limitler içinde otonom ödeme yapabildiği on-chain vault. Caps'in kendisi firewall'dır — insan onayı yerine kontrat seviyesinde enforcement.

### 2.1 Roller
| Rol | Yetki |
|---|---|
| **Owner** | Deposit, merchant cap tanımlama/güncelleme/iptal, withdraw, agent yetkisini iptal etme |
| **Agent (delegated signer)** | Sadece `pay()` çağırabilir; deposit/withdraw/cap değiştirme yapamaz |
| **Merchant** | Ödemenin alıcısı; owner tarafından allowlist'e eklenmiş olmalı |

### 2.2 Fonksiyonlar (taslak)

```solidity
function deposit(address token, uint256 amount) external;                     // owner, transferFrom
function setMerchantCap(address merchant, uint256 perTxCap, uint256 dailyCap) external; // owner
function revokeMerchant(address merchant) external;                            // owner
function setAgentSigner(address agent) external;                               // owner — Mera PRF sub-key adresi
function revokeAgentSigner() external;                                         // owner — anında iptal
function pay(address merchant, uint256 amount) external;                       // sadece agent, cap kontrolü
function withdraw(address token, uint256 amount) external;                     // owner
```

### 2.3 Invariant'lar (test edilecek)
- `pay()` çağrısı, merchant'ın per-tx veya rolling-24h cap'ini aşarsa revert eder.
- Aktif (revoke edilmemiş) merchant'ların toplam rezervi düşülmeden `withdraw()` vault'u boşaltamaz.
- `revokeAgentSigner()` sonrası eski agent adresinden gelen `pay()` çağrısı her koşulda revert eder.
- Sadece owner: `deposit` başka birinin adına yapılamaz (msg.sender = owner zorunlu ya da açıkça yetkilendirilmiş depositor).

### 2.4 Olaylar (Envio indexer bunları dinleyecek)
```solidity
event Deposited(address indexed token, uint256 amount);
event MerchantCapSet(address indexed merchant, uint256 perTxCap, uint256 dailyCap);
event MerchantRevoked(address indexed merchant);
event AgentSignerSet(address indexed agent);
event AgentSignerRevoked(address indexed agent);
event Paid(address indexed merchant, address indexed agent, uint256 amount, uint256 timestamp);
event Withdrawn(address indexed token, uint256 amount);
```

### 2.5 Mera Entegrasyonu Notu
`setAgentSigner`'a verilen adres, Mera'nın PRF-türetilmiş anahtar materyalinden türetilmiş bir **sub-key**'in adresidir — sahibin ana passkey'i hiçbir zaman bu akışa girmez. Bu, Mera "One Passkey, Many Keys" bounty'sinin ("most creative non-wallet use of Mera's PRF-derived key material") tam karşılığıdır. Detay tasarım `docs/RESOURCES.md`'deki Mera guide okunduktan sonra netleşecek — `DECISIONS.md`'ye eklenecek.

### 2.6 Deploy Tablosu (deploy sonrası doldurulacak)

| Ağ | Adres | Token (USDC) | Owner | Deploy tarihi | Deployer |
|---|---|---|---|---|---|
| Monad testnet (10143) | _(boş)_ | _(boş)_ | _(boş)_ | — | — |
| Monad mainnet (143) | _(boş)_ | _(boş)_ | _(boş)_ | — | — |

---

## 3. `ReputationRegistry.sol` — On-chain İtibar Kaydı (yeni)

**Amaç:** Chainlink CRE workflow'unun dış tehdit-istihbaratı kaynaklarından (scam-address feed vb.) çektiği veriyi doğrulanmış şekilde on-chain'e yazması; `apps/server`'ın `reputation.ts` dedektörünün bunu okuyabilmesi.

### 3.1 Fonksiyonlar (taslak)

```solidity
function reportFlagged(address target, uint8 severity, string calldata reasonCode) external; // sadece yetkili CRE forwarder
function clearFlag(address target) external;                                                  // sadece owner/forwarder
function isFlagged(address target) external view returns (bool, uint8 severity, string memory reasonCode);
```

### 3.2 Erişim Kontrolü
Sadece CRE workflow'unun forward ettiği doğrulanmış callback adresi (`onlyForwarder` modifier) yazabilir — bkz. `notes (4).txt`: "forward-contract pattern separates a safe local simulation from production authority." Development'ta local forward adresi kullanılır, deploy'da gerçek adres set edilir ve state-setting callback bu adrese kısıtlanır.

### 3.3 Olaylar
```solidity
event ReputationFlagged(address indexed target, uint8 severity, string reasonCode, uint256 timestamp);
event ReputationCleared(address indexed target);
```

### 3.4 Deploy Tablosu

| Ağ | Adres | Forwarder (CRE) | Deploy tarihi |
|---|---|---|---|
| Monad testnet (10143) | _(boş)_ | _(boş)_ | — |

---

## 4. Cleanverse Entegrasyonu — Sözleşme mi, API mi?

Cleanverse'ün kendi CVI (kimlik) / CVA (varlık) kontratları var (sponsor tarafından sağlanıyor). Baret bunları **yeniden yazmaz**, `complianceVerify` çağrısını kendi `compliance.ts` dedektöründen ve/veya (varsa) kendi sözleşmelerimizin transfer hook'undan çağırır. Baret tarafında yeni bir sözleşme gerekip gerekmediği (ör. Cleanverse kurallarını sarmalayan bir örnek "gated asset" demo kontratı) `DECISIONS.md`'de karara bağlanacak — muhtemelen showcase için minimal bir örnek kontrat gerekecek.

---

## 5. Test Planı

- [ ] `forge test -vv` — tüm unit + fuzz testler yeşil.
- [ ] `PaymentGuard`: cap aşımı, revoke sonrası eski agent, iki merchant'ın rezervlerinin karışmaması senaryoları.
- [ ] `ReputationRegistry`: sadece forwarder yazabiliyor, owner olmayan biri yazamıyor.
- [ ] Tenderly ile: gerçek bir "sınırsız approve" ve "flagged address'e ödeme" senaryosunun trace'i kayıt altına alınır (demo videosu için).
- [ ] Testnet'e deploy sonrası: `cast call` ile canlı doğrulama, adres tablosu (§2.6, §3.4) doldurulur.

---

## 6. Güvenlik Kontrol Listesi (deploy öncesi)

- [ ] Reentrancy koruması (`pay`/`withdraw` — checks-effects-interactions veya `ReentrancyGuard`).
- [ ] Integer overflow/underflow — Solidity ≥0.8 native koruması, yine de cap matematiği fuzz test edilir.
- [ ] `onlyOwner` / `onlyAgent` / `onlyForwarder` modifier'ları her hassas fonksiyonda.
- [ ] Owner private key'i asla repoya/loglara yazılmaz; deploy script'i env'den okur.
- [ ] Kendi risk modelimizi kendi sözleşmemize uygula: PaymentGuard'ın kendisi "unlimited approval" pattern'i taşımıyor mu, kontrol et.
