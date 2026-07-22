"""発表順とタイムテーブルの計算。

- 発表順は order_index（ランダム抽選 or 管理者の手動並べ替え）で決まる
- 開始時刻はイベントの start_time から、各発表の所要時間を積み上げて算出する
- 個別に scheduled_at が入っている発表はそこで時刻をリセットする
  （途中に休憩が入る場合などに管理者が上書きできる）
"""

import random
from datetime import datetime, timedelta
from typing import Optional

from app.models.nuestar_event import EventEntry, NueStarEvent

# 申込フォームで選べる発表時間（秒）
TALK_PRESETS = [30, 60, 120, 180, 300, 420, 600, 720]
# 質疑時間（秒）。0 は「必要ない」
QA_PRESETS = [0, 60, 180, 300, 420, 600]

MAX_SECONDS = 60 * 60  # 1発表あたりの上限（1時間）


def parse_hhmm(value: Optional[str]) -> Optional[datetime]:
    """"HH:MM" を当日の datetime として解釈する（日付は計算用のダミー）。"""
    if not value:
        return None
    try:
        hour, minute = value.split(":")
        return datetime(2000, 1, 1, int(hour), int(minute))
    except (ValueError, AttributeError):
        return None


def format_hhmm(value: datetime) -> str:
    return f"{value.hour:02d}:{value.minute:02d}"


def format_duration(seconds: int) -> str:
    """秒を「3分」「1分30秒」「30秒」のように表示する。"""
    minutes, secs = divmod(seconds, 60)
    if minutes and secs:
        return f"{minutes}分{secs}秒"
    if minutes:
        return f"{minutes}分"
    return f"{secs}秒"


def sort_entries(entries: list[EventEntry]) -> list[EventEntry]:
    """発表順に並べる。未設定は末尾に回し、申込順で安定させる。"""
    return sorted(
        entries,
        key=lambda e: (
            e.order_index if e.order_index is not None else 10**6,
            e.created_at or datetime.min,
        ),
    )


def shuffle_order(entries: list[EventEntry]) -> None:
    """発表順をランダムに割り振る（承認済みのみを渡すこと）。"""
    shuffled = list(entries)
    random.shuffle(shuffled)
    for i, entry in enumerate(shuffled, start=1):
        entry.order_index = i


def renumber(entries: list[EventEntry]) -> None:
    """現在の並び順に沿って order_index を 1 から振り直す。"""
    for i, entry in enumerate(entries, start=1):
        entry.order_index = i


def build_timetable(event: NueStarEvent, entries: list[EventEntry]) -> list[dict]:
    """各発表の開始・終了時刻を計算する。

    start_time が未設定なら時刻は None のまま（順番と所要時間だけ返す）。
    """
    ordered = sort_entries(entries)
    cursor = parse_hhmm(event.start_time)
    buffer_seconds = max(0, event.buffer_seconds or 0)

    rows: list[dict] = []
    for i, entry in enumerate(ordered):
        duration = min(MAX_SECONDS, max(0, entry.talk_seconds)) + min(
            MAX_SECONDS, max(0, entry.qa_seconds)
        )

        # 個別指定があればそこへ飛ばす
        override = parse_hhmm(entry.scheduled_at)
        if override is not None:
            cursor = override

        start = cursor
        end = cursor + timedelta(seconds=duration) if cursor else None

        rows.append(
            {
                "entry_id": entry.id,
                "order": i + 1,
                "start_time": format_hhmm(start) if start else None,
                "end_time": format_hhmm(end) if end else None,
                "talk_seconds": entry.talk_seconds,
                "qa_seconds": entry.qa_seconds,
                "duration_seconds": duration,
                "duration_label": format_duration(duration),
                "is_fixed": override is not None,
            }
        )

        if cursor is not None:
            cursor = cursor + timedelta(seconds=duration + buffer_seconds)

    return rows
