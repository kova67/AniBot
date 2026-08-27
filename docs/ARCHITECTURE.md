# AniBot architecture

## Runtime topology

AniBot is a Next.js App Router application with three cooperating planes.

### Experience plane

`src/components/agent/` owns conversation state, tool reconciliation, source
cards, authentication gates, progressive speech, and the character viewport.
The public VRM component is an adapter, not a dependency of the agent protocol.

### Agent plane

`src/app/api/agent/route.ts` authenticates the caller, checks Neon-backed rate
limits, and invokes the AI SDK loop through OpenRouter. `src/lib/agent/` owns
the prompt, typed tools, deterministic fallback router, NDJSON codec, and data
contracts.

The stream is a discriminated union:

- `tool-start` announces real work before provider latency begins;
- `tool` settles that call by stable ID;
- `text` carries model deltas;
- `sources` carries inspectable URLs;
- `done` records the execution mode;
- `error` closes the turn without corrupting settled history.

### Data plane

Neon stores users, conversations, usage events, and atomic fixed-window rate
limits. Privy proves email or Solana-wallet identity. Provider credentials stay
inside server routes.

### Speech plane

`src/app/api/speech` proxies authenticated audio without exposing provider
credentials. `src/lib/speech/providers.ts` selects Hume Octave 2 instant
streaming first, ElevenLabs second, and lets the client fall back to browser
speech when neither provider is configured. The client queue feeds completed
sentences in order so playback can begin before the agent finishes writing.

## Trust boundaries

| Boundary | Untrusted input | Enforcement |
| --- | --- | --- |
| Browser → API | prompt, attachment text, bearer token | size limits, Zod schemas, Privy verification |
| API → provider | user-controlled query or address | bounded schemas, encoded URLs, request timeouts |
| Provider → UI | market metadata, source URLs, model output | typed normalization, React escaping, bounded rendering |
| API → database | conversation and usage state | authenticated user ID, parameterized SQL, size limits |

## Character extension point

The public `VrmStage` loads one VRM through `@pixiv/three-vrm`. A richer runtime
can replace that component and consume local speech or agent events through a
client context. Keep character assets and motion commands out of the server
tool protocol unless the browser has an explicit handler for them.

## Directory map

| Path | Responsibility |
| --- | --- |
| `src/app/api/agent` | authenticated agent orchestration |
| `src/lib/agent` | tools, prompt, streams, shared types |
| `src/lib/server` | auth, Neon access, rate limiting |
| `src/components/agent` | workspace and stream reconciliation |
| `src/components/avatar` | replaceable public character adapter |
| `src/lib/speech` | provider selection, progressive playback, and dictation |
| `src/components/landing` | landing experience and live market feed |
| `database/migrations` | portable Neon/Postgres schema |
