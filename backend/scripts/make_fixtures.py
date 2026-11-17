"""Generate the demo-mode sample runs used by the frontend.

The answers are written for the lesson, not recorded from a model. Token
boundaries and IDs are real (o200k_base). Timings follow a typical request,
from a seeded random generator so the output never changes between runs.
Next-token alternatives are illustrative and labelled as such in the UI.

Run from backend/:  uv run python scripts/make_fixtures.py
"""

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.provider import INSTRUCTIONS  # noqa: E402
from app.tokenizer import tokenizer_for  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "web" / "src" / "lessons" / "ai-request" / "fixtures.json"
MODEL = "gpt-6-luna"
CHUNK_WINDOW_MS = 40
MAX_INPUT = 500

EXAMPLES = [
    {
        "id": "sky",
        "label": "Why is the sky blue?",
        "prompt": "Why is the sky blue?",
        "answer": (
            "Sunlight looks white, but it is a mix of every color. When it passes through the air, "
            "tiny gas molecules scatter short blue wavelengths much more than long red ones. That "
            "scattered blue light reaches your eyes from every direction, so the whole sky looks blue. "
            "At sunset, light crosses much more air, so most of the blue is scattered away and reds remain."
        ),
        # Illustrative alternatives for the first steps: (token, probability).
        "alternatives": [
            [("Sun", 0.46), ("The", 0.31), ("Because", 0.12), ("Light", 0.06), ("It", 0.03)],
            [("light", 0.97), ("beams", 0.01), ("rays", 0.01)],
            [(" is", 0.41), (" looks", 0.33), (" appears", 0.15), (" seems", 0.06), (" contains", 0.03)],
            [(" white", 0.92), (" yellow", 0.04), (" clear", 0.02)],
            [(",", 0.88), (" to", 0.07), (" because", 0.03)],
        ],
    },
    {
        "id": "plane",
        "label": "How does a plane stay in the air?",
        "prompt": "How does a plane stay in the air?",
        "answer": (
            "A plane's wings are shaped and tilted so that the air flowing past them is pushed downward. "
            "Pushing air down creates an upward force called lift. As long as the engines keep the plane "
            "moving fast enough, the lift from the wings balances the plane's weight, so it stays up. "
            "If it slows down too much, the wings can no longer make enough lift."
        ),
        "alternatives": [
            [("A", 0.38), ("Planes", 0.34), ("An", 0.11), ("Airplanes", 0.09), ("The", 0.05)],
            [(" plane", 0.93), (" wing", 0.03), (" jet", 0.02)],
            [("'s", 0.58), (" stays", 0.24), (" flies", 0.11), (" uses", 0.04)],
            [(" wings", 0.95), (" engines", 0.02), (" shape", 0.01)],
            [(" are", 0.83), (" push", 0.08), (" have", 0.05)],
        ],
    },
    {
        "id": "names",
        "label": "Give me a tip for remembering names.",
        "prompt": "Give me a tip for remembering names.",
        "answer": (
            "Repeat the name back right away, as in \"Nice to meet you, Maya.\" Then link it to something "
            "vivid, like a feature, a place, or a famous person with the same name. Use it once more "
            "before the conversation ends. Saying, picturing and reusing a name gives your memory three "
            "chances to store it."
        ),
        "alternatives": [
            [("Try", 0.29), ("Repeat", 0.27), ("Say", 0.21), ("When", 0.13), ("One", 0.07)],
            [(" the", 0.62), (" their", 0.28), (" it", 0.06)],
            [(" name", 0.96), (" person's", 0.02), (" word", 0.01)],
            [(" back", 0.44), (" out", 0.31), (" aloud", 0.14), (" right", 0.06)],
            [(" right", 0.52), (" as", 0.21), (" when", 0.14), (" immediately", 0.08)],
        ],
    },
]


def build(example: dict, rng: random.Random) -> dict:
    tok = tokenizer_for(MODEL)
    prompt = example["prompt"]
    answer = example["answer"]
    body = json.dumps({"prompt": prompt})
    out_tokens = tok.tokens(answer)
    assert "".join(t["text"] for t in out_tokens) == answer

    for step, alts in enumerate(example["alternatives"]):
        chosen = out_tokens[step]["text"]
        top = [{"token": t, "p": p} for t, p in alts if p > 0]
        assert any(c["token"] == chosen for c in top), (example["id"], step, chosen)
        out_tokens[step]["top"] = top
        out_tokens[step]["p"] = next(c["p"] for c in top if c["token"] == chosen)

    settings = {"max_output_tokens": 220, "stream": True, "reasoning_effort": "none", "top_logprobs": 5}
    events = [
        {
            "type": "request.created",
            "t": 0,
            "stage": "send",
            "payload": {
                "method": "POST",
                "url": "/api/chat/stream",
                "headers": {"Content-Type": "application/json", "Accept": "text/event-stream"},
                "body": {"prompt": prompt},
                "bytes": len(body.encode()),
            },
        },
        {"type": "backend.received", "t": 34, "stage": "backend", "payload": {"endpoint": "/api/chat/stream", "method": "POST"}},
        {
            "type": "backend.validated",
            "t": 36,
            "stage": "backend",
            "payload": {
                "promptChars": len(prompt),
                "checks": [
                    {"id": "present", "label": "The message is not empty", "ok": True},
                    {"id": "length", "label": f"It is under {MAX_INPUT} characters", "ok": True},
                    {"id": "rate", "label": "Your connection is within the request limit", "ok": True},
                    {"id": "config", "label": "Instructions and settings added", "ok": True},
                    {"id": "key", "label": "Secret API key attached on the server", "ok": True},
                ],
            },
        },
        {
            "type": "input.tokens",
            "t": 38,
            "stage": "tokens",
            "payload": {"tokens": tok.tokens(prompt), "encoding": tok.name, "exact": tok.exact},
        },
        {
            "type": "provider.request",
            "t": 41,
            "stage": "provider",
            "payload": {
                "provider": "OpenAI",
                "model": MODEL,
                "settings": settings,
                "instructions": INSTRUCTIONS,
                "preview": {
                    "model": MODEL,
                    "instructions": INSTRUCTIONS,
                    "input": prompt,
                    **settings,
                    "Authorization": "Bearer sk-…redacted",
                },
            },
        },
    ]

    # Token arrival times at the browser: a first-token wait, then a steady
    # but uneven stream.
    t = 410 + rng.randint(0, 160)
    first = t
    arrivals = []
    for _ in out_tokens:
        arrivals.append(t)
        t += rng.randint(9, 34)

    # Merge tokens that arrive within the backend's chunk window.
    chunk: list[dict] = []
    chunk_start = None
    for token, at in zip(out_tokens, arrivals):
        if chunk_start is not None and at - chunk_start >= CHUNK_WINDOW_MS:
            events.append(delta(chunk, prev_at))
            chunk, chunk_start = [], None
        chunk.append(token)
        chunk_start = chunk_start if chunk_start is not None else at
        prev_at = at
    events.append(delta(chunk, prev_at))

    total = arrivals[-1] + 22
    events.append(
        {
            "type": "output.done",
            "t": total,
            "stage": "return",
            "payload": {
                "text": answer,
                "usage": {"inputTokens": len(tok.tokens(INSTRUCTIONS)) + len(tok.tokens(prompt)) + 7, "outputTokens": len(out_tokens)},
                "finishReason": "completed",
                "probabilitiesMeasured": False,
                "tokenSource": "tokenizer",
                "serverMs": {"firstToken": first - 30, "total": total - 30},
            },
        }
    )
    return {"id": example["id"], "label": example["label"], "prompt": prompt, "events": events}


def delta(tokens: list[dict], at: int) -> dict:
    return {
        "type": "output.delta",
        "t": at + 4,
        "stage": "return",
        "payload": {"text": "".join(t["text"] for t in tokens), "tokens": tokens},
    }


def main() -> None:
    rng = random.Random(20261116)
    fixtures = [build(e, rng) for e in EXAMPLES]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(fixtures, indent=1, ensure_ascii=False) + "\n")
    for f in fixtures:
        deltas = [e for e in f["events"] if e["type"] == "output.delta"]
        print(f"{f['id']}: {sum(len(d['payload']['tokens']) for d in deltas)} tokens in {len(deltas)} chunks")


if __name__ == "__main__":
    main()
