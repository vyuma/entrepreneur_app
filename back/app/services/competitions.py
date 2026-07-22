"""nuestar コンペAPI のプロキシ層。

フロントから直接叩かず必ずここを経由する。
- TTL 30分のメモリキャッシュ
- 外部API障害時は最後に成功したレスポンスを返す（stale-if-error）
"""

import threading
import time
from typing import Any, Optional

import httpx

from app.core.config import settings

BASE_URL = "https://nuestar.yuma-dev.uk"
TTL_SECONDS = 30 * 60
TIMEOUT_SECONDS = 10.0

_lock = threading.Lock()
# key -> {"data": Any, "at": float}
_cache: dict[str, dict[str, Any]] = {}


class CompetitionAPIError(Exception):
    """外部APIが応答せず、キャッシュも無い場合。"""


def _cache_key(path: str, params: dict[str, Any]) -> str:
    items = sorted((k, str(v)) for k, v in params.items() if v is not None)
    return path + "?" + "&".join(f"{k}={v}" for k, v in items)


def _get_cached(key: str, *, allow_stale: bool) -> Optional[dict[str, Any]]:
    with _lock:
        entry = _cache.get(key)
    if entry is None:
        return None
    if allow_stale or time.time() - entry["at"] < TTL_SECONDS:
        return entry
    return None


def _fetch(path: str, params: dict[str, Any]) -> tuple[Any, float]:
    """外部APIを叩く。失敗時は stale キャッシュにフォールバックする。"""
    key = _cache_key(path, params)

    fresh = _get_cached(key, allow_stale=False)
    if fresh is not None:
        return fresh["data"], fresh["at"]

    clean = {k: v for k, v in params.items() if v is not None}
    headers = {}
    if settings.ADMIN_API_TOKEN:
        headers["x-admin-token"] = settings.ADMIN_API_TOKEN

    try:
        with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
            res = client.get(f"{BASE_URL}{path}", params=clean, headers=headers)
            res.raise_for_status()
            data = res.json()
    except Exception as exc:  # 通信エラー・タイムアウト・5xx
        stale = _get_cached(key, allow_stale=True)
        if stale is not None:
            print(f"[competitions] 外部API失敗のためキャッシュを使用: {exc}")
            return stale["data"], stale["at"]
        raise CompetitionAPIError(str(exc)) from exc

    now = time.time()
    with _lock:
        _cache[key] = {"data": data, "at": now}
    return data, now


def list_competitions(
    *,
    status: Optional[str] = None,
    type: Optional[str] = None,
    upcoming: bool = False,
    sort: str = "deadline",
) -> tuple[list[dict], float]:
    data, at = _fetch(
        "/api/competitions",
        {"status": status, "type": type, "upcoming": upcoming, "sort": sort},
    )
    return data, at


def get_competition(competition_id: int) -> tuple[dict, float]:
    return _fetch(f"/api/competitions/{competition_id}", {})


def search_competitions(q: str, limit: int = 50) -> tuple[dict, float]:
    return _fetch("/api/search", {"q": q, "limit": limit})


def clear_cache() -> None:
    with _lock:
        _cache.clear()
