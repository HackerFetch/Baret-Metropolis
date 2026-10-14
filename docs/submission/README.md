# Submission files

Everything the submission forms ask for, in one place. Paths are relative to this folder
unless they start with `docs/`.

## Logos

| File | What it is | Where it goes |
|---|---|---|
| `baret-logo-1024.png` | The Baret lockup (mark and wordmark, orange and ink on concrete), 1024 x 1024 PNG | The track's "Project Logo/Graphic" field (JPG, JPEG, PNG or WEBP, at most 2 MB) |
| `baret-mark-1024.png` | The mark alone, ink on orange, 1024 x 1024 PNG | The same field if it crops to a small square, or an avatar |

Both are rendered from the mark's own paths in `packages/ui/src/brand/Mark.tsx` and the
wordmark font `packages/web-ui/fonts/big-shoulders-stencil-display-900.woff2`, following
`docs/BRAND.md` section 02. The product itself never uses a raster of the mark; these exist
only because the forms ask for one.

## Texts and scripts

| File | What it is |
|---|---|
| [`TEXTS.md`](TEXTS.md) | One text per prize, ready to paste into the forms, with what each form asks |
| [`SCRIPTS.md`](SCRIPTS.md) | The scripts the videos were recorded from (demo, pitch, sponsor clips) |
| [`docs/evidence/README.md`](../evidence/README.md) | The evidence index: every claim per prize with its transaction, contract, code file, live URL or screenshot |

## Links for the forms

| Field | Link |
|---|---|
| Repository | <https://github.com/HackerFetch/Baret-Metropolis> |
| Live product | <https://usebaret.com> (start at <https://usebaret.com/novaswap>), web wallet <https://wallet.usebaret.com>, API <https://baret-monad-api.onrender.com/health/ready>; Monad testnet, chain id 10143 |
| Technical demo video (max 3 min) | <https://youtu.be/JdwdpctajxM> (2:29) |
| Pitch video (max 2 min) | <https://youtu.be/fjZsmcU3QpQ> (1:53) |
| Teaser | <https://youtu.be/zU7qnfGqp9Y> |
| Cleanverse video (required, max 5 min) | <https://youtu.be/UGJStgCq9SM> |
| Chainlink CRE video (required, max 2 min) | <https://youtu.be/uZMceqK3GEQ> |
| Dynamic video | <https://youtu.be/KLRH9O5LeJE> |
| Envio video | <https://youtu.be/iri7VLhC_no> |
| Mera UX video | <https://youtu.be/pgcgWSwDV98> |
| Mera: One Passkey, Many Keys video | <https://youtu.be/ZOlcxt3v2rE> |
| Nansen video | <https://youtu.be/YUZ3QInMWCw> |
| Alchemy | No video (not uploaded: YouTube's daily upload limit); text only |
| KIMI article (required) | <https://medium.com/@halesezin/the-model-that-is-not-allowed-to-decide-kimi-inside-a-transaction-firewall-on-monad-49e5c89db960> |
| Qwen article (required) | <https://medium.com/@halesezin/an-agent-that-has-to-show-its-reading-before-it-can-approve-qwen-3-8-ce3a237bbfe7> |
| Evidence index | <https://github.com/HackerFetch/Baret-Metropolis/blob/main/docs/evidence/README.md> |

All videos are on YouTube (unlisted, English subtitles).

## Decks, cards and screenshots

| File | What it is |
|---|---|
| [`baret-pitch-deck.pdf`](baret-pitch-deck.pdf) | The pitch deck |
| [`baret-one-pager.pdf`](baret-one-pager.pdf) | One page: the problem, the product, the proof |
| [`video-card-intro.png`](video-card-intro.png), [`video-card-outro.png`](video-card-outro.png) | The title and end cards of the videos |
| [`docs/assets/screenshots/`](../assets/screenshots/) | Screenshots in `desktop/` and `mobile/`, the same names in both: `01-novaswap-blocked`, `02-wallet-sign-blocked`, `03-extension-blocked`, `04-agents-playground`, `05-agents-live-payments`, `06-review-veto`, `07-wallet-home`, `08-cleanverse-no-credential`, `09-registry-lookup` |
| [`docs/assets/hero.png`](../assets/hero.png), [`docs/assets/architecture.png`](../assets/architecture.png) | The hero image and the architecture diagram (also as [SVG](../assets/architecture.svg)) |

Per-prize state, with each row's video or article: `docs/BOUNTIES_AND_TRACKS.md`.
