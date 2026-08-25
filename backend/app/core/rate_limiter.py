import time
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from app.core.logging import logger


class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter per client IP address.
    Prevents denial-of-service, API abuse, and excessive LLM token costs.
    """

    def __init__(self, requests_per_window: int = 40, window_seconds: int = 60):
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self._access_records: Dict[str, List[float]] = defaultdict(list)

    def _cleanup_old_records(self, ip: str, current_time: float) -> None:
        """Remove timestamps older than the active rate limit window."""
        cutoff = current_time - self.window_seconds
        self._access_records[ip] = [t for t in self._access_records[ip] if t > cutoff]

    def check_rate_limit(self, request: Request) -> Tuple[bool, int]:
        """
        Evaluate client IP request rate against the sliding window threshold.

        Returns:
            Tuple of (is_allowed: bool, retry_after_seconds: int)
        """
        # Determine client IP from headers or direct connection
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "127.0.0.1"

        current_time = time.time()
        self._cleanup_old_records(client_ip, current_time)

        records = self._access_records[client_ip]

        if len(records) >= self.requests_per_window:
            oldest_active = records[0]
            retry_after = int(self.window_seconds - (current_time - oldest_active)) + 1
            logger.warning("Rate limit exceeded for client IP '%s'. Retry after %ds.", client_ip, retry_after)
            return False, max(1, retry_after)

        self._access_records[client_ip].append(current_time)
        return True, 0


# Pre-configured rate limiters for upload and chat endpoints
upload_rate_limiter = InMemoryRateLimiter(requests_per_window=15, window_seconds=60)
chat_rate_limiter = InMemoryRateLimiter(requests_per_window=45, window_seconds=60)


async def rate_limit_upload_dependency(request: Request) -> None:
    """FastAPI route dependency enforcing document upload rate limits."""
    allowed, retry_after = upload_rate_limiter.check_rate_limit(request)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for document uploads. Please wait {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )


async def rate_limit_chat_dependency(request: Request) -> None:
    """FastAPI route dependency enforcing chat generation rate limits."""
    allowed, retry_after = chat_rate_limiter.check_rate_limit(request)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for conversational queries. Please wait {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
