# Technical reference

The Next.js App Router serves the player and the live API from the same origin. Sample runs use checked-in fixtures. Claude Live sends one question at a time and streams the response into the same lesson player.

## Interfaces

| Endpoint | Contract |
| --- | --- |
| `GET /api/health` | Reports live availability, provider, model ID, and maximum input length. Availability means a key is configured. |
| `POST /api/chat/stream` | Accepts JSON with a single `prompt` string. Returns server-sent events for request receipt, validation, provider request preview, text updates, and completion or an error. |

Only the Claude request includes the key. The provider preview contains the request body and public generation settings. The app sends no tools or conversation history. Deployment cost controls are in the [deployment guide](DEPLOYMENT.md).

## What the lesson shows

| Label | Meaning |
| --- | --- |
| Sample data | Prepared answers, timings, and next-token probabilities. Token boundaries and IDs in the fixtures came from the sample tokenizer. |
| Measured | Live server events, streamed answer, timings, and usage totals reported by Claude. |
| Simulation | Illustrative token boundaries and model internals. Claude does not expose token IDs, exact token boundaries, or next-token probabilities in this stream. |

The playback clock and the request event log are independent. The player can pause, step, and replay a run without making a new request. With reduced motion, each stage opens in its final state and users step through manually.

## Working on the lesson

The `web/src/execution/` modules define and consume normalized run events. The player is in `web/src/player/`. The lesson’s copy, visuals, and sample fixtures are in `web/src/lessons/ai-request/`. To add a lesson, create its stage definitions and visualizations, then add the lesson to `lessons/registry.ts`.

```sh
cd web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use Left and Right Arrow to step through a run, Space to play or pause, and R to replay. The keyboard shortcuts leave the prompt field available for normal text editing.
