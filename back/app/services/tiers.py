"""ランク（ティア）の定義。

フロントの lib/tiers.ts の POINTS_LADDER と必ず一致させること。
「到達済みの色しか選べない」検証をサーバー側で行うために持っている。
"""

from typing import Optional

# (必要ポイント, ティア名) 昇順
POINTS_LADDER: list[tuple[int, str]] = [
    (0, "entry"),
    (100, "nuestar"),
    (200, "bronze"),
    (300, "silver"),
    (400, "gold"),
    (500, "ruby"),
    (600, "sapphire"),
    (700, "diamond"),
    (800, "rainbow"),
    (900, "rainbowPrismatic"),
    (1000, "prismatic"),
    # PRISMATIC の先。到達間隔を広げた長期のやり込み枠
    (1200, "supernova"),
    (1600, "nebula"),
    (2100, "aurora"),
    (2700, "eclipse"),
    (3500, "quasar"),
    (5000, "singularity"),
]

TIER_NAMES = {name for _, name in POINTS_LADDER}


def current_tier(total_points: int) -> str:
    """累計ポイントから到達しているティアを返す。"""
    tier = POINTS_LADDER[0][1]
    for threshold, name in POINTS_LADDER:
        if total_points >= threshold:
            tier = name
    return tier


def unlocked_tiers(total_points: int) -> list[str]:
    """選択可能（到達済み）なティア一覧。"""
    return [name for threshold, name in POINTS_LADDER if total_points >= threshold]


def is_unlocked(tier: str, total_points: int) -> bool:
    return tier in unlocked_tiers(total_points)


def resolve_display_tier(preference: Optional[str], total_points: int) -> str:
    """実際に表示するティア。

    未設定、または未到達の色が保存されている場合は現在ランクにフォールバックする
    （ポイントが減ったり定義が変わったりしても破綻しないように）。
    """
    if preference and is_unlocked(preference, total_points):
        return preference
    return current_tier(total_points)
