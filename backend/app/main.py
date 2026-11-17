"""FastAPI app: a health check and one streaming chat endpoint.

The stream is a sequence of Server-Sent Events, each a lifecycle fact the
lesson can show: the request arrived, was checked, was tokenized, was sent to
the provider, and the answer came back in chunks.
"""

import asyncio
import json
import time
from collections.abc import AsyncIterator, Callable
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .config import Settings, get_settings
from .limits import Limiter
from .provider import INSTRUCTIONS, Delta, Done, OpenAIProvider, Provider
from .tokenizer import tokenizer_for

STREAM_PATH = "/api/chat/stream"


class ChatRequest(BaseModel):
    # A generous hard cap; the friendly limit is checked below.
    prompt: str = Field(max_length=10_000)


def sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps({'payload': payload}, ensure_ascii=False)}\n\n"


def create_app(
    settings: Settings | None = None,
    provider_factory: Callable[[Settings], Provider] | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    limiter = Limiter(
        per_minute=settings.rate_limit_per_minute,
        daily_cap=settings.daily_request_cap,
        max_concurrent=settings.max_concurrent_streams,
    )
    tokenizer = tokenizer_for(settings.openai_model, settings.tokenizer_encoding)

    def default_factory(s: Settings) -> Provider:
        return OpenAIProvider(
            api_key=s.openai_api_key,
            model=s.openai_model,
            max_output_tokens=s.max_output_tokens,
            timeout=s.request_timeout_seconds,
        )

    provider: Provider | None = None
    if settings.live_available or provider_factory:
        provider = (provider_factory or default_factory)(settings)

    app = FastAPI(title="AI Under the Hood", docs_url=None, redoc_url=None)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Accept"],
    )

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "liveAvailable": provider is not None,
            "provider": provider.name if provider else None,
            "model": settings.openai_model if provider else None,
            "maxInputChars": settings.max_input_chars,
        }

    @app.post(STREAM_PATH)
    async def chat_stream(body: ChatRequest, request: Request) -> StreamingResponse:
        received_at = time.perf_counter()
        if provider is None:
            raise HTTPException(503, "Live mode is not configured on this server. Add an OpenAI API key to backend/.env.")

        prompt = body.prompt.strip()
        if not prompt:
            raise HTTPException(422, "Type a question first.")
        if len(prompt) > settings.max_input_chars:
            raise HTTPException(422, f"Keep your question under {settings.max_input_chars} characters.")

        client = request.client.host if request.client else "unknown"
        refusal = limiter.acquire(client)
        if refusal:
            raise HTTPException(429, refusal)

        async def events() -> AsyncIterator[str]:
            def ms() -> int:
                return round((time.perf_counter() - received_at) * 1000)

            try:
                yield sse("backend.received", {"endpoint": STREAM_PATH, "method": "POST"})
                yield sse(
                    "backend.validated",
                    {
                        "promptChars": len(prompt),
                        "checks": [
                            {"id": "present", "label": "The message is not empty", "ok": True},
                            {"id": "length", "label": f"It is under {settings.max_input_chars} characters", "ok": True},
                            {"id": "rate", "label": "Your connection is within the request limit", "ok": True},
                            {"id": "config", "label": "Instructions and settings added", "ok": True},
                            {"id": "key", "label": "Secret API key attached on the server", "ok": True},
                        ],
                    },
                )
                yield sse(
                    "input.tokens",
                    {"tokens": tokenizer.tokens(prompt), "encoding": tokenizer.name, "exact": tokenizer.exact},
                )

                provider_settings = provider.settings()
                yield sse(
                    "provider.request",
                    {
                        "provider": provider.name,
                        "model": settings.openai_model,
                        "settings": provider_settings,
                        "instructions": INSTRUCTIONS,
                        "preview": {
                            "model": settings.openai_model,
                            "instructions": INSTRUCTIONS,
                            "input": prompt,
                            **provider_settings,
                            "Authorization": "Bearer sk-…redacted",
                        },
                    },
                )

                text = ""
                buffer = ""
                buffer_tokens: list[dict] = []
                buffer_started: float | None = None
                first_token_ms: int | None = None
                measured = False
                window = settings.chunk_window_ms / 1000

                def flush() -> str:
                    nonlocal buffer, buffer_tokens, buffer_started
                    tokens = buffer_tokens if buffer_tokens else tokenizer.tokens(buffer)
                    for t in tokens:
                        t.setdefault("id", tokenizer.id_of(t["text"]))
                    frame = sse("output.delta", {"text": buffer, "tokens": tokens})
                    buffer, buffer_tokens, buffer_started = "", [], None
                    return frame

                done: Done | None = None
                async with asyncio.timeout(settings.request_timeout_seconds):
                    async for item in provider.stream(prompt):
                        if await request.is_disconnected():
                            return
                        if isinstance(item, Delta):
                            if not item.text:
                                continue
                            if first_token_ms is None:
                                first_token_ms = ms()
                            text += item.text
                            buffer += item.text
                            if item.tokens:
                                measured = True
                                buffer_tokens.extend(item.tokens)
                            now = time.perf_counter()
                            buffer_started = buffer_started or now
                            # Merge deltas that arrive close together into one chunk.
                            if now - buffer_started >= window:
                                yield flush()
                        elif isinstance(item, Done):
                            done = item

                if buffer:
                    yield flush()

                yield sse(
                    "output.done",
                    {
                        "text": text,
                        "usage": (
                            {"inputTokens": done.input_tokens, "outputTokens": done.output_tokens}
                            if done and done.input_tokens is not None and done.output_tokens is not None
                            else None
                        ),
                        "finishReason": done.finish_reason if done else None,
                        "probabilitiesMeasured": measured,
                        "tokenSource": "model" if measured else "tokenizer",
                        "serverMs": {"firstToken": first_token_ms, "total": ms()},
                    },
                )
            except TimeoutError:
                yield sse("error", {"message": "The AI provider took too long to answer.", "code": "timeout", "retryable": True})
            except Exception as error:  # noqa: BLE001 - every failure must end the stream cleanly
                yield sse("error", {"message": _describe(error), "code": "provider", "retryable": True})
            finally:
                limiter.release()

        return StreamingResponse(
            events(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app


def _describe(error: Exception) -> str:
    """A safe, readable message. Never includes keys or raw provider payloads."""
    import openai

    if isinstance(error, openai.AuthenticationError):
        return "The AI provider rejected the server's API key. Check OPENAI_API_KEY in backend/.env."
    if isinstance(error, openai.RateLimitError):
        return "The AI provider is rate limiting this key. Try again shortly."
    if isinstance(error, openai.NotFoundError):
        return "The configured model was not found. Check OPENAI_MODEL in backend/.env."
    if isinstance(error, openai.APIConnectionError):
        return "The server could not reach the AI provider."
    if isinstance(error, openai.BadRequestError):
        return "The AI provider rejected the request settings."
    return "Something went wrong while the answer was being generated."


app = create_app()
