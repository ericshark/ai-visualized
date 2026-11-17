"""In-memory request limits.

These protect a locally run app from accidental cost (a stuck retry loop, a
shared link). They live in one process, so they are not sufficient for a
public deployment with several workers.
"""

import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import dataclass, field


@dataclass
class Limiter:
    per_minute: int
    daily_cap: int
    max_concurrent: int
    clock: Callable[[], float] = time.monotonic
    _recent: dict[str, deque[float]] = field(default_factory=lambda: defaultdict(deque))
    _day: list[float] = field(default_factory=list)
    _active: int = 0

    def acquire(self, client: str) -> str | None:
        """Reserve a slot for one request. Returns a reason when refused."""
        now = self.clock()

        recent = self._recent[client]
        while recent and now - recent[0] >= 60:
            recent.popleft()
        self._day = [t for t in self._day if now - t < 86_400]

        if self._active >= self.max_concurrent:
            return "The server is busy with other answers. Try again in a few seconds."
        if len(self._day) >= self.daily_cap:
            return "This server has reached its daily limit for live requests. Demo mode still works."
        if len(recent) >= self.per_minute:
            return "Too many live requests in the last minute. Wait a moment and try again."

        recent.append(now)
        self._day.append(now)
        self._active += 1
        return None

    def release(self) -> None:
        self._active = max(0, self._active - 1)
