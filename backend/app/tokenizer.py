from dataclasses import dataclass
from functools import lru_cache

import tiktoken

FALLBACK_ENCODING = "o200k_base"


@dataclass(frozen=True)
class Tokenizer:
    encoding: tiktoken.Encoding
    # True when tiktoken itself maps the model to this encoding.
    exact: bool

    @property
    def name(self) -> str:
        return self.encoding.name

    def tokens(self, text: str) -> list[dict]:
        ids = self.encoding.encode(text)
        return [{"text": self._piece(i), "id": i} for i in ids]

    def id_of(self, piece: str) -> int | None:
        ids = self.encoding.encode(piece)
        return ids[0] if len(ids) == 1 else None

    def _piece(self, token_id: int) -> str:
        # A token can be part of a multi-byte character; show it as best we can.
        return self.encoding.decode_single_token_bytes(token_id).decode("utf-8", errors="replace")


@lru_cache
def tokenizer_for(model: str, encoding: str = "") -> Tokenizer:
    if encoding:
        return Tokenizer(tiktoken.get_encoding(encoding), exact=False)
    try:
        return Tokenizer(tiktoken.encoding_for_model(model), exact=True)
    except KeyError:
        return Tokenizer(tiktoken.get_encoding(FALLBACK_ENCODING), exact=False)
