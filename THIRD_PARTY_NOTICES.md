# Third-party notices

## Adapted source

### Beautiful UI patterns

AniBot's prompt bar, thinking trace, and tool-chip components are adapted from
the open-source [Beautiful UI reference implementation](https://github.com/ithmz/beautiful-ui).

MIT License

Copyright (c) 2026 ithmz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Techniques referenced, not copied

### Domain-warped fBm — `src/components/atmosphere/aurora-field.tsx`

The aurora shader is an original implementation of the domain-warping technique
described in Inigo Quilez's public article
[*Domain warping*](https://iquilezles.org/articles/warp/). No code was taken
from that article or from any shader library.

## Brand marks — `public/brand/`

Each mark below is the service's own published icon, downloaded from that
service's own domain, and is used **only to attribute the source of a result**
— nominative use, not endorsement. AniBot is not affiliated with any of them.
No mark has been redrawn, recoloured, or reconstructed; where a service
publishes no usable mark, the interface falls back to a plain monogram rather
than inventing one. Each remains the trademark of its owner.

| File | Mark | Retrieved from | Used for |
| --- | --- | --- | --- |
| `dexscreener.png` | DEX Screener | `https://dexscreener.com/favicon.png` | Attribution on pair, price, liquidity and 24h-flow results |
| `pumpfun.png` | Pump.fun | `https://pump.fun/icon.png` (resized to 128px) | Attribution on launch-provenance results, and a badge on mints whose address ends in `pump` |
| `polymarket.png` | Polymarket | `https://polymarket.com/icons/apple-touch-icon.png` (resized to 128px) | Attribution on prediction-market results |
| `helius.svg` | Helius | `https://www.helius.dev/favicon.svg` | Attribution on wallet and holder-concentration results |
| `solana.svg` | Solana | [Simple Icons](https://simpleicons.org) — CC0 1.0 Universal | Chain label in the footer source list |

Retrieved 2026-08-27.

## Public APIs called at runtime

| Service | Endpoint | Key required |
| --- | --- | --- |
| DEX Screener | `api.dexscreener.com` — token boosts, token lookup, pair search | no |
| Pump.fun | `frontend-api-v3.pump.fun/coins/{mint}` — launch provenance | no |
| Polymarket | `gamma-api.polymarket.com/public-search` | no |
| Helius | `mainnet.helius-rpc.com` — DAS, wallet history, network status, balances, and holder concentration | yes |
| Hume | `api.hume.ai/v0/tts/stream/file` — Octave 2 instant streamed speech | yes |
| ElevenLabs | `api.elevenlabs.io` — streamed speech | yes, browser speech otherwise |

The Pump.fun and Polymarket endpoints are public but undocumented; their
response shapes can change without notice. `src/lib/agent/market-tools.ts`
treats every field as optional for that reason.

## Fonts

`src/app/_og/onest-500.ttf` and `onest-600.ttf` are [Onest](https://fonts.google.com/specimen/Onest),
SIL Open Font License 1.1, vendored so the share card renders without a network
fetch at build time. The app itself loads Onest through `next/font/google`.

## Token artwork

Token images are loaded at render time from DEX Screener's own CDN
(`cdn.dexscreener.com`) using the `icon` / `info.imageUrl` values returned by
its public API for that mint. Artwork belongs to each token's issuer. When a
mint has no published image the interface draws a monogram from the symbol
instead of substituting a placeholder graphic.

## Considered and not installed

These were evaluated against the brief and rejected on bundle or GPU cost, not
on quality. Recording them here so the decision is not re-litigated blind.

| Package | License | Verdict |
| --- | --- | --- |
| [`@paper-design/shaders-react`](https://www.npmjs.com/package/@paper-design/shaders-react) | Apache-2.0 | Actively maintained and React 19 compatible, but ships a second WebGL runtime alongside the three.js the VRM already needs. The one hero effect is ~90 lines of GLSL written directly instead. |
| [`@react-three/fiber`](https://www.npmjs.com/package/@react-three/fiber) | MIT | Not needed: `vrm-stage.tsx` already drives three.js imperatively, and adding a reconciler for one background plane is pure overhead. |
| Magic UI / Motion Primitives / Aceternity background blocks | MIT | Copy-paste registries rather than dependencies. Their aurora and spotlight patterns informed the CSS in `globals.css`, which is written against this project's own tokens; importing whole blocks would have pulled in a second visual language. |
| [`motion`](https://www.npmjs.com/package/motion) | MIT | Scroll reveals use `IntersectionObserver` plus CSS transitions, so no animation runtime is needed for the landing page. |
