# Technical reference

The Next.js App Router serves the lesson. Picking a question starts a local fixture replay. There are no model requests or API routes.

## What the lesson shows

| Label | Meaning |
| --- | --- |
| Sample data | Prepared answers and timings. Token boundaries and IDs in the fixtures came from the sample tokenizer. |
| Example probabilities | Illustrative next-token scores prepared for the lesson. |
| Simulation | A simplified diagram of what happens inside a model. |

The walkthrough clock and the sample event timeline are independent. The player can pause, step, and replay a run. With reduced motion, each stage opens in its final state and visitors step through manually.

## Working on the lesson

The `web/src/execution/` modules replay sample events. The player is in `web/src/player/`. The lesson’s copy, visuals, and fixtures are in `web/src/lessons/ai-request/`. Each fixture contains a question and the timed events for its answer.

```sh
cd web
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use Left and Right Arrow to step through a run, Space to play or pause, and R to replay. The question picker has its own keyboard controls.
