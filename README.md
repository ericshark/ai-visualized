# AI Under the Hood

An interactive lesson that follows one question from the moment you press Send to the moment the answer appears: your browser, the app's server, the AI provider, the model, and back.

It is built to be watched, not read. Each of the eight stages animates what happens, explains it in a sentence or two, and keeps the technical detail behind a **Go deeper** panel.

## Run it

Demo mode needs only the frontend and no API key.

```bash
cd web
pnpm install
pnpm dev
```

Open http://localhost:3000, pick a question and press **Send**.

### Live mode (optional)

Live mode sends your own question through the FastAPI backend to OpenAI and shows the real response and timings.

```bash
cd backend
cp .env.example .env        # then set OPENAI_API_KEY
uv run uvicorn app.main:app --reload --port 8000
```

When the backend is running and has a key, the **Live** switch in the page becomes available. If the backend is on another address, set `NEXT_PUBLIC_API_URL` in `web/.env.local` (see `web/.env.example`).

The API key stays on the server. The browser only ever learns the model name and whether live mode is available.

## What is real and what is not

Every visual carries a label:

| Label | Meaning |
| --- | --- |
| **Sample data** | Written for the lesson. Token boundaries and IDs come from a real tokenizer, but the answer text, timings and next-token probabilities are examples. |
| **Measured** | Captured from your live request: server events, browser-side timings, and next-token probabilities when the model returns them. |
| **Simulation** | A picture of something the API does not expose, such as what happens inside the model. Drawn with dashed outlines and never presented as a measurement. |

Other accuracy notes the lesson makes explicit: tokenization depends on the model, network chunks are not tokens, the model's inference is not training, and hidden reasoning is not observable.

## Layout

```
web/                          Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Motion
  src/execution/              run events, reducer, demo and live adapters, SSE parser
  src/player/                 stage controller (pure reducer), clock hook, rail, controls
  src/lessons/                lesson definitions; one folder per lesson
    ai-request/content.ts       all lesson copy and technical detail
    ai-request/stages/          one visualization per stage, no prose inside
    ai-request/fixtures.json    sample runs for demo mode (generated)
backend/                      FastAPI
  app/main.py                 GET /api/health, POST /api/chat/stream (SSE)
  app/provider.py             OpenAI Responses API stream, normalized
  app/limits.py               rate limit, daily cap, concurrency cap
  scripts/make_fixtures.py    regenerates the demo sample runs
```

### How it fits together

- **Two timelines.** The lesson's playback clock (what you watch) and the run's event log (what the request produced) are separate. Stages read whatever the run has produced; nothing in the model-internals stages is timed against network events.
- **One event model.** Every fact arrives as a typed event with a source of `demo`, `observed` or `conceptual`. The demo adapter replays a recorded event log; the live adapter turns the backend's server-sent events into the same events.
- **Deterministic playback.** Each stage is a plain function of time, so it can pause, resume, step back and replay exactly. With reduced motion, stages show their finished state and nothing autoplays.

### Adding a lesson

Create `web/src/lessons/<id>/` with content, stage visualizations and a `Lesson` object (see `lessons/types.ts`), then add it to `lessons/registry.ts`. The player, rail, controls and event model are lesson-agnostic.

## Cost protection

The backend is not a general proxy to a paid model. The model, instructions and answer length are fixed server-side, input is capped (500 characters by default), and there is a per-address rate limit, a daily request cap, a concurrency cap and a request timeout. All are set in `backend/.env`. These limits live in memory in one process: fine for local use, but revisit them (shared storage, authentication) before any public deployment.

## Checks

```bash
cd web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
cd backend && uv run pytest
```

## Keyboard

`←` / `→` previous and next stage, `Space` play or pause, `R` replay from the start.
