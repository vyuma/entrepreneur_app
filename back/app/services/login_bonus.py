"""連続ログインボーナスの計算。

連続日数に応じて 10pt から最大 50pt まで増える。
1日でも空くと連続日数はリセットされる（前日に受け取っていれば継続）。
"""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.login_bonus import LoginBonus
from app.models.point_log import PointLog
from app.models.user import User

# 連続日数 → 付与ポイント。最終行以降は上限として据え置き。
STREAK_REWARDS: list[tuple[int, int]] = [
    (1, 10),
    (2, 15),
    (3, 20),
    (4, 25),
    (5, 30),
    (6, 40),
    (7, 50),
]

MAX_POINTS = STREAK_REWARDS[-1][1]

# 連続日数で変わる称号。閾値は降順に評価する。
# tier は フロントの TIER_STYLES と対応させて色を出す。
STREAK_TITLES: list[tuple[int, str, str]] = [
    (100, "レジェンド", "prismatic"),
    (60, "不屈", "rainbow"),
    (30, "鉄人", "diamond"),
    (14, "皆勤", "sapphire"),
    (7, "常連", "gold"),
    (3, "習慣化", "nuestar"),
    (1, "ルーキー", "entry"),
]


def points_for_streak(streak: int) -> int:
    """連続日数に対する付与ポイント。"""
    reward = STREAK_REWARDS[0][1]
    for days, points in STREAK_REWARDS:
        if streak >= days:
            reward = points
    return min(reward, MAX_POINTS)


def title_for_streak(streak: int) -> tuple[str, str]:
    """連続日数に対する称号 (ラベル, ティア名) を返す。"""
    for days, label, tier in STREAK_TITLES:
        if streak >= days:
            return label, tier
    return STREAK_TITLES[-1][1], STREAK_TITLES[-1][2]


def _latest(db: Session, user_id: str) -> Optional[LoginBonus]:
    return (
        db.query(LoginBonus)
        .filter(LoginBonus.user_id == user_id)
        .order_by(LoginBonus.bonus_date.desc())
        .first()
    )


def current_streak(db: Session, user_id: str, today: Optional[date] = None) -> int:
    """今日時点で継続している連続日数。途切れていれば 0。"""
    today = today or date.today()
    last = _latest(db, user_id)
    if last is None:
        return 0
    if last.bonus_date == today:
        return last.streak
    if last.bonus_date == today - timedelta(days=1):
        return last.streak
    return 0


def longest_streak(db: Session, user_id: str) -> int:
    rows = db.query(LoginBonus.streak).filter(LoginBonus.user_id == user_id).all()
    return max((r[0] for r in rows), default=0)


def claimed_today(db: Session, user_id: str, today: Optional[date] = None) -> bool:
    today = today or date.today()
    return (
        db.query(LoginBonus)
        .filter(LoginBonus.user_id == user_id, LoginBonus.bonus_date == today)
        .first()
        is not None
    )


def claim(db: Session, user: User, today: Optional[date] = None) -> tuple[LoginBonus, bool]:
    """今日のボーナスを受け取る。

    戻り値は (記録, 新規に受け取ったか)。既に受け取り済みなら既存の記録を返す。
    """
    today = today or date.today()

    existing = (
        db.query(LoginBonus)
        .filter(LoginBonus.user_id == user.id, LoginBonus.bonus_date == today)
        .first()
    )
    if existing:
        return existing, False

    last = _latest(db, user.id)
    if last is not None and last.bonus_date == today - timedelta(days=1):
        streak = last.streak + 1
    else:
        streak = 1

    points = points_for_streak(streak)
    now = datetime.now(timezone.utc)

    bonus = LoginBonus(
        user_id=user.id, bonus_date=today, points=points, streak=streak
    )
    db.add(bonus)
    db.add(
        PointLog(
            user_id=user.id,
            points=points,
            reason=f"login_bonus:{streak}日連続",
            period_year=today.year,
            period_month=today.month,
        )
    )
    db.commit()
    db.refresh(bonus)
    return bonus, True


def next_reward(streak: int) -> int:
    """明日受け取った場合のポイント（連続が続く前提）。"""
    return points_for_streak(streak + 1)
