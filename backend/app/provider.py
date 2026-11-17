"""Talks to the AI provider and turns its stream into plain dictionaries.

The rest of the backend never sees SDK types, which keeps it testable with a
fake provider.
"""

import math
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Protocol

import openai

INSTRUCTIONS = (
    "You are a friendly teacher in an interactive lesson about how AI works. "
    "Answer the visitor's question in plain language, in two to four short sentences "
    "(under 90 words). Do not use Markdown, lists or headings."
)

TOP_LOGPROBS = 5


@dataclass
class Delta:
    text: str
    # Tokens with probabilities, when the provider returned them.
    tokens: list[dict] | None = None


@dataclass
class Done:
    input_tokens: int | None
    output_tokens: int | None
    finish_reason: str | None


ProviderEvent = Delta | Done


class Provider(Protocol):
    name: str

    def settings(self) -> dict[str, Any]: ...

    def stream(self, prompt: str) -> AsyncIterator[ProviderEvent]: ...


def _prob(logprob: float | None) -> float | None:
    if logprob is None:
        return None
    return round(math.exp(logprob), 4)


class OpenAIProvider:
    name = "OpenAI"

    def __init__(self, api_key: str, model: str, max_output_tokens: int, timeout: float):
        self.model = model
        self.max_output_tokens = max_output_tokens
        self.client = openai.AsyncOpenAI(api_key=api_key, timeout=timeout, max_retries=1)
        # Learned at runtime: some models reject logprobs or reasoning settings.
        self.logprobs_supported = True
        self.reasoning_supported = True

    def settings(self) -> dict[str, Any]:
        settings: dict[str, Any] = {"max_output_tokens": self.max_output_tokens, "stream": True}
        if self.reasoning_supported:
            settings["reasoning_effort"] = "none"
        if self.logprobs_supported:
            settings["top_logprobs"] = TOP_LOGPROBS
        return settings

    def _request(self, prompt: str) -> dict[str, Any]:
        request: dict[str, Any] = {
            "model": self.model,
            "instructions": INSTRUCTIONS,
            "input": prompt,
            "max_output_tokens": self.max_output_tokens,
            "stream": True,
            "store": False,
        }
        if self.reasoning_supported:
            request["reasoning"] = {"effort": "none"}
        if self.logprobs_supported:
            request["include"] = ["message.output_text.logprobs"]
            request["top_logprobs"] = TOP_LOGPROBS
        return request

    async def _open(self, prompt: str):
        # Retry without optional features the model does not accept.
        for _ in range(3):
            try:
                return await self.client.responses.create(**self._request(prompt))
            except openai.BadRequestError as error:
                message = str(error).lower()
                if self.logprobs_supported and "logprob" in message:
                    self.logprobs_supported = False
                elif self.reasoning_supported and "reasoning" in message:
                    self.reasoning_supported = False
                else:
                    raise
        return await self.client.responses.create(**self._request(prompt))

    async def stream(self, prompt: str) -> AsyncIterator[ProviderEvent]:
        stream = await self._open(prompt)
        try:
            async for event in stream:
                kind = getattr(event, "type", "")
                if kind == "response.output_text.delta":
                    yield Delta(text=event.delta, tokens=self._tokens(event))
                elif kind == "response.completed":
                    usage = event.response.usage
                    yield Done(
                        input_tokens=getattr(usage, "input_tokens", None),
                        output_tokens=getattr(usage, "output_tokens", None),
                        finish_reason="completed",
                    )
                elif kind == "response.incomplete":
                    usage = event.response.usage
                    details = getattr(event.response, "incomplete_details", None)
                    yield Done(
                        input_tokens=getattr(usage, "input_tokens", None),
                        output_tokens=getattr(usage, "output_tokens", None),
                        finish_reason=getattr(details, "reason", None) or "incomplete",
                    )
                elif kind in ("response.failed", "error"):
                    raise RuntimeError("The AI provider could not finish this answer.")
        finally:
            await stream.close()

    @staticmethod
    def _tokens(event: Any) -> list[dict] | None:
        logprobs = getattr(event, "logprobs", None)
        if not logprobs:
            return None
        tokens = []
        for lp in logprobs:
            top = [
                {"token": alt.token, "p": _prob(alt.logprob)}
                for alt in (lp.top_logprobs or [])
                if alt.token is not None and alt.logprob is not None
            ]
            tokens.append({"text": lp.token, "p": _prob(lp.logprob), "top": top})
        return tokens
