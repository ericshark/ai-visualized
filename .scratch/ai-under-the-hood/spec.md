# Spec: AI Under the Hood

Status: MVP complete

One interactive lesson, "What happens when you ask AI a question?", that follows a single request from the browser through an application backend and an AI provider to the model, then back as a streamed answer. It is visualization-first, aimed at curious beginners, and accurate enough for developers.

## Requirements (from the original brief)

- 8 stages: send, travel to backend, provider receives, tokenization, inside the model (conceptual), generation, response returns, complete picture.
- Each stage answers: what is happening, why, what changes. One or two simple sentences by default; an optional "Go deeper" panel holds technical detail.
- Playback: Play/Pause, Back, Next, Replay, jump to any stage, keyboard shortcuts, reduced-motion support.
- Two data modes:
  - **Demo**: no API key, curated example prompts with recorded runs, deterministic timing, labelled as recorded.
  - **Live**: a real request through FastAPI to OpenAI, streamed over SSE, with measured timings. Model internals stay conceptual and labelled.
- Every visual is tagged by source: recorded (demo), measured (observed), or simulation (conceptual).
- Tokenization uses a real tokenizer where possible; anything else is labelled illustrative.
- Next-token probabilities are real log probabilities when the model returns them, otherwise labelled example data.
- Network chunks are shown as distinct from tokens.
- Backend: health check and one streaming endpoint; fixed model and instructions server-side; input and output caps, per-IP rate limit, daily cap; key never reaches the browser.
- Light theme, Geist, restrained violet-blue accent, responsive down to phone width.
- Tests for the stage controller and execution-event handling; lint, type check and build pass.

## Decisions

- Demo offers 3 curated prompts; free text requires Live, because a recorded answer to a visitor's own question would be misleading.
- Demo runs entirely in the frontend; Live is detected through `GET /api/health`.
- The browser calls FastAPI directly (CORS allowlist) so the stream is not buffered by a proxy.
- A persistent journey rail (browser, app server, AI provider, model) frames focused per-stage visualizations.
- The backend coalesces provider deltas into network chunks every ~40 ms, so chunks and tokens are genuinely different and the lesson can say so truthfully.

## Out of scope

RAG, agents, memory, auth, accounts, payments, database, dark theme, deployment.
