"""朝活プログラムの計算。

設定した時間帯（既定 6:00-8:00 JST）にチェックインすると朝活ポイントがもらえる。
連続日数に応じてボーナスが上乗せされ、その日の「朝にすべきことリスト」を
消化するとさらにポイントが付く。

サーバーのタイムゾーンに依存しないよう、日付・時刻の判定はすべて JST で行う。
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.morning import (
    MorningCheckin,
    MorningSetting,
    MorningTask,
    MorningTaskDone,
    MorningTip,
)
from app.models.point_log import PointLog
from app.models.user import User

JST = ZoneInfo("Asia/Tokyo")


def now_jst() -> datetime:
    return datetime.now(JST)


def today_jst() -> date:
    return now_jst().date()


def minute_of_day(moment: datetime | None = None) -> int:
    """0時からの経過分。"""
    moment = moment or now_jst()
    return moment.hour * 60 + moment.minute


def format_minute(minute: int) -> str:
    return f"{minute // 60:02d}:{minute % 60:02d}"


# --- 設定 ---


def get_settings(db: Session) -> MorningSetting:
    """朝活設定を取得する。まだ無ければ既定値で作る。"""
    setting = db.query(MorningSetting).first()
    if setting is None:
        setting = MorningSetting()
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


def is_open(setting: MorningSetting, minute: int | None = None) -> bool:
    """いま朝活の受付時間内か。"""
    if not setting.enabled:
        return False
    minute = minute_of_day() if minute is None else minute
    if setting.start_minute <= setting.end_minute:
        return setting.start_minute <= minute < setting.end_minute
    # 終了が開始より前なら日をまたぐ時間帯とみなす（例 23:00-01:00）
    return minute >= setting.start_minute or minute < setting.end_minute


def streak_bonus(setting: MorningSetting, streak: int) -> int:
    """連続日数に対する上乗せポイント。初日は0。"""
    bonus = max(streak - 1, 0) * setting.streak_bonus_per_day
    return min(bonus, setting.streak_bonus_max)


def points_for(setting: MorningSetting, streak: int) -> int:
    return setting.base_points + streak_bonus(setting, streak)


# --- コンテンツ ---


def active_tasks(db: Session) -> list[MorningTask]:
    return (
        db.query(MorningTask)
        .filter(MorningTask.is_active.is_(True))
        .order_by(MorningTask.sort_order, MorningTask.created_at)
        .all()
    )


def active_tips(db: Session) -> list[MorningTip]:
    return (
        db.query(MorningTip)
        .filter(MorningTip.is_active.is_(True))
        .order_by(MorningTip.sort_order, MorningTip.created_at)
        .all()
    )


# --- チェックイン ---


def _latest(db: Session, user_id: str) -> MorningCheckin | None:
    return (
        db.query(MorningCheckin)
        .filter(MorningCheckin.user_id == user_id)
        .order_by(MorningCheckin.checkin_date.desc())
        .first()
    )


def checkin_of(db: Session, user_id: str, day: date) -> MorningCheckin | None:
    return (
        db.query(MorningCheckin)
        .filter(MorningCheckin.user_id == user_id, MorningCheckin.checkin_date == day)
        .first()
    )


def current_streak(db: Session, user_id: str, today: date) -> int:
    """今日時点で継続している連続日数。途切れていれば 0。"""
    last = _latest(db, user_id)
    if last is None:
        return 0
    if last.checkin_date in (today, today - timedelta(days=1)):
        return last.streak
    return 0


def longest_streak(db: Session, user_id: str) -> int:
    rows = db.query(MorningCheckin.streak).filter(MorningCheckin.user_id == user_id).all()
    return max((r[0] for r in rows), default=0)


def total_days(db: Session, user_id: str) -> int:
    return db.query(MorningCheckin).filter(MorningCheckin.user_id == user_id).count()


def recent_dates(db: Session, user_id: str, limit: int = 30) -> list[date]:
    rows = (
        db.query(MorningCheckin.checkin_date)
        .filter(MorningCheckin.user_id == user_id)
        .order_by(MorningCheckin.checkin_date.desc())
        .limit(limit)
        .all()
    )
    return [r[0] for r in rows]


class MorningError(Exception):
    """朝活の操作が受け付けられないときのエラー。"""


def checkin(db: Session, user: User) -> tuple[MorningCheckin, bool]:
    """今日の朝活チェックインを行う。

    戻り値は (記録, 新規に受け取ったか)。
    """
    setting = get_settings(db)
    now = now_jst()
    today = now.date()
    minute = minute_of_day(now)

    existing = checkin_of(db, user.id, today)
    if existing:
        return existing, False

    if not setting.enabled:
        raise MorningError("朝活プログラムは現在停止中です")
    if not is_open(setting, minute):
        raise MorningError(
            f"朝活の受付時間は {format_minute(setting.start_minute)}〜"
            f"{format_minute(setting.end_minute)} です"
        )

    last = _latest(db, user.id)
    streak = last.streak + 1 if last and last.checkin_date == today - timedelta(days=1) else 1
    points = points_for(setting, streak)

    record = MorningCheckin(
        user_id=user.id,
        checkin_date=today,
        points=points,
        streak=streak,
        checkin_minute=minute,
    )
    db.add(record)
    db.add(
        PointLog(
            user_id=user.id,
            points=points,
            reason=f"morning:{streak}日連続 {format_minute(minute)}",
            period_year=today.year,
            period_month=today.month,
        )
    )
    db.commit()
    db.refresh(record)
    return record, True


def done_task_ids(db: Session, user_id: str, day: date) -> set[str]:
    rows = (
        db.query(MorningTaskDone.task_id)
        .filter(MorningTaskDone.user_id == user_id, MorningTaskDone.done_date == day)
        .all()
    )
    return {r[0] for r in rows}


def toggle_task(db: Session, user: User, task_id: str, done: bool) -> int:
    """朝活タスクの消化状態を切り替える。獲得（または取り消した）ポイントを返す。

    チェックインした当日のみ操作できる。取り消すと付与ポイントも戻す。
    """
    setting = get_settings(db)
    today = today_jst()

    task = (
        db.query(MorningTask)
        .filter(MorningTask.id == task_id, MorningTask.is_active.is_(True))
        .first()
    )
    if task is None:
        raise MorningError("タスクが見つかりません")
    if checkin_of(db, user.id, today) is None:
        raise MorningError("先に朝活チェックインをしてください")

    existing = (
        db.query(MorningTaskDone)
        .filter(
            MorningTaskDone.user_id == user.id,
            MorningTaskDone.task_id == task_id,
            MorningTaskDone.done_date == today,
        )
        .first()
    )

    if done:
        if existing:
            return 0
        points = setting.task_points
        db.add(
            MorningTaskDone(
                user_id=user.id, task_id=task_id, done_date=today, points=points
            )
        )
        if points:
            db.add(
                PointLog(
                    user_id=user.id,
                    points=points,
                    reason=f"morning_task:{task.title}",
                    period_year=today.year,
                    period_month=today.month,
                )
            )
        db.commit()
        return points

    if existing is None:
        return 0
    points = existing.points
    db.delete(existing)
    if points:
        db.add(
            PointLog(
                user_id=user.id,
                points=-points,
                reason=f"morning_task_undo:{task.title}",
                period_year=today.year,
                period_month=today.month,
            )
        )
    db.commit()
    return -points
