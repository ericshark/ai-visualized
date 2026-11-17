from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Server-side configuration. Nothing here is ever sent to the browser
    except the model name and whether live mode is available."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-6-luna"
    # Encoding used to show input tokens. Leave empty to let tiktoken pick
    # from the model name; the UI says when the choice is not confirmed.
    tokenizer_encoding: str = ""

    max_input_chars: int = Field(default=500, ge=1, le=4000)
    max_output_tokens: int = Field(default=220, ge=16, le=2000)
    rate_limit_per_minute: int = Field(default=6, ge=1)
    daily_request_cap: int = Field(default=200, ge=1)
    max_concurrent_streams: int = Field(default=4, ge=1)
    request_timeout_seconds: float = Field(default=45, gt=0)
    # Window for merging provider text deltas into one network chunk.
    chunk_window_ms: int = Field(default=40, ge=0, le=1000)

    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def live_available(self) -> bool:
        return bool(self.openai_api_key.strip())

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
