# Contributing to AniBot

AniBot welcomes focused changes that improve the open agent stack without
coupling it to one hosted product or one character runtime.

## Development loop

1. Create a small branch with one coherent change.
2. Keep secrets in `.env.local`; never add provider keys to fixtures.
3. Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`.
4. Document new tool inputs, outputs, provider requirements, and failure modes.
5. Include accessible names and disabled/loading/error states for UI changes.

## Tool contributions

Every tool must validate input, bound response size and latency, distinguish an
unconfigured provider from a failed provider, and return source URLs when they
exist. A tool must never replace missing current data with a sample and present
it as live.

## Character integrations

Keep proprietary models, motion files, voices, and runtime code out of pull
requests unless their redistribution terms are explicit and compatible. New
character runtimes should implement the public stage boundary documented in
`docs/ARCHITECTURE.md`.
