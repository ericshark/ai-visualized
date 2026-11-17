import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.limits import Limiter
from app.main import create_app
from app.provider import Delta, Done


class FakeProvider:
    name = "FakeAI"

    def __init__(self, deltas=None, fail=False, delay=0.0, with_logprobs=False):
        self.deltas = deltas or ["Planes ", "fly ", "because ", "wings ", "push ", "air ", "down."]
        self.fail = fail
        self.delay = delay
        self.with_logprobs = with_logprobs
        self.closed = False

    def settings(self):
        return {"max_output_tokens": 50, "stream": True}

    async def stream(self, prompt):
        try:
            for text in self.deltas:
                if self.delay:
                    await asyncio.sleep(self.delay)
                tokens = [{"text": text, "p": 0.9, "top": [{"token": text, "p": 0.9}]}] if self.with_logprobs else None
                yield Delta(text=text, tokens=tokens)
            if self.fail:
                raise RuntimeError("boom sk-secret")
            yield Done(input_tokens=40, output_tokens=7, finish_reason="completed")
        finally:
            self.closed = True


def make_client(provider=None, **overrides):
    settings = Settings(_env_file=None, openai_api_key="", **overrides)
    factory = (lambda s: provider) if provider else None
    return TestClient(create_app(settings, factory))


def read_events(response):
    events = []
    for block in response.text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.split("\n"))
        events.append((lines["event"], json.loads(lines["data"])["payload"]))
    return events


def test_health_without_key_reports_live_unavailable():
    body = make_client().get("/api/health").json()
    assert body == {"status": "ok", "liveAvailable": False, "provider": None, "model": None, "maxInputChars": 500}


def test_health_with_provider_reports_model():
    body = make_client(FakeProvider()).get("/api/health").json()
    assert body["liveAvailable"] is True
    assert body["model"] == "gpt-6-luna"


def test_stream_refuses_without_key():
    response = make_client().post("/api/chat/stream", json={"prompt": "Hi"})
    assert response.status_code == 503


@pytest.mark.parametrize(
    ("prompt", "message"),
    [("   ", "Type a question first."), ("x" * 501, "Keep your question under 500 characters.")],
)
def test_stream_validates_prompt(prompt, message):
    response = make_client(FakeProvider()).post("/api/chat/stream", json={"prompt": prompt})
    assert response.status_code == 422
    assert response.json()["detail"] == message


def test_stream_emits_lifecycle_in_order():
    response = make_client(FakeProvider()).post("/api/chat/stream", json={"prompt": "How do planes fly?"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = read_events(response)
    types = [e[0] for e in events]
    assert types[:4] == ["backend.received", "backend.validated", "input.tokens", "provider.request"]
    assert types[-1] == "output.done"
    assert "output.delta" in types

    tokens = events[2][1]
    assert tokens["encoding"] == "o200k_base"
    assert tokens["exact"] is False  # gpt-6-luna is not in tiktoken's table
    assert "".join(t["text"] for t in tokens["tokens"]) == "How do planes fly?"
    assert all(isinstance(t["id"], int) for t in tokens["tokens"])

    deltas = [p for t, p in events if t == "output.delta"]
    done = events[-1][1]
    assert "".join(d["text"] for d in deltas) == done["text"] == "Planes fly because wings push air down."
    assert done["usage"] == {"inputTokens": 40, "outputTokens": 7}
    assert done["probabilitiesMeasured"] is False
    assert done["tokenSource"] == "tokenizer"


def test_inspector_preview_never_contains_the_key():
    provider = FakeProvider()
    settings = Settings(_env_file=None, openai_api_key="sk-live-very-secret")
    client = TestClient(create_app(settings, lambda s: provider))
    response = client.post("/api/chat/stream", json={"prompt": "Hi"})
    assert "sk-live-very-secret" not in response.text
    assert "redacted" in response.text


def test_close_deltas_are_merged_into_chunks():
    # A long window merges everything that arrives together into one chunk.
    response = make_client(FakeProvider(), chunk_window_ms=1000).post("/api/chat/stream", json={"prompt": "Hi"})
    deltas = [p for t, p in read_events(response) if t == "output.delta"]
    assert len(deltas) == 1
    assert len(deltas[0]["tokens"]) > 1


def test_chunks_separate_when_deltas_are_spread_out():
    provider = FakeProvider(deltas=["One ", "two ", "three"], delay=0.03)
    response = make_client(provider, chunk_window_ms=10).post("/api/chat/stream", json={"prompt": "Hi"})
    deltas = [p for t, p in read_events(response) if t == "output.delta"]
    assert len(deltas) >= 2


def test_measured_probabilities_are_forwarded():
    response = make_client(FakeProvider(with_logprobs=True)).post("/api/chat/stream", json={"prompt": "Hi"})
    events = read_events(response)
    done = events[-1][1]
    assert done["probabilitiesMeasured"] is True
    token = next(p for t, p in events if t == "output.delta")["tokens"][0]
    assert token["p"] == 0.9 and token["top"]


def test_provider_failure_ends_stream_with_safe_error():
    response = make_client(FakeProvider(fail=True)).post("/api/chat/stream", json={"prompt": "Hi"})
    event, payload = read_events(response)[-1]
    assert event == "error"
    assert "sk-secret" not in payload["message"]


def test_rate_limit_refuses_extra_requests():
    client = make_client(FakeProvider(), rate_limit_per_minute=2)
    assert client.post("/api/chat/stream", json={"prompt": "Hi"}).status_code == 200
    assert client.post("/api/chat/stream", json={"prompt": "Hi"}).status_code == 200
    response = client.post("/api/chat/stream", json={"prompt": "Hi"})
    assert response.status_code == 429
    assert "Too many" in response.json()["detail"]


def test_limiter_daily_cap_and_window():
    now = [0.0]
    limiter = Limiter(per_minute=1, daily_cap=2, max_concurrent=5, clock=lambda: now[0])
    assert limiter.acquire("a") is None
    assert limiter.acquire("a") is not None  # per-minute
    now[0] = 61
    assert limiter.acquire("a") is None
    now[0] = 130
    assert "daily" in limiter.acquire("b")
    now[0] = 86_500
    assert limiter.acquire("b") is None


def test_limiter_caps_concurrent_streams():
    limiter = Limiter(per_minute=10, daily_cap=10, max_concurrent=1)
    assert limiter.acquire("a") is None
    assert "busy" in limiter.acquire("b")
    limiter.release()
    assert limiter.acquire("b") is None


async def test_disconnect_stops_the_provider_stream():
    """When the browser goes away, the backend stops reading the provider."""
    provider = FakeProvider(deltas=["a"] * 50, delay=0.01)
    app = create_app(Settings(_env_file=None), lambda s: provider)

    body = json.dumps({"prompt": "Hi"}).encode()
    sent: list[dict] = []
    disconnect = asyncio.Event()

    async def receive():
        if not sent:
            sent.append({})
            return {"type": "http.request", "body": body, "more_body": False}
        await disconnect.wait()
        return {"type": "http.disconnect"}

    deltas = 0

    async def send(message):
        nonlocal deltas
        if message["type"] == "http.response.body" and b"output.delta" in message.get("body", b""):
            deltas += 1
            if deltas == 3:
                disconnect.set()

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "path": "/api/chat/stream",
        "raw_path": b"/api/chat/stream",
        "query_string": b"",
        "headers": [(b"content-type", b"application/json"), (b"host", b"test")],
        "client": ("127.0.0.1", 1),
        "server": ("test", 80),
        "scheme": "http",
        "root_path": "",
    }
    await asyncio.wait_for(app(scope, receive, send), timeout=5)
    assert provider.closed
    assert deltas < 50
