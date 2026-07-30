"""朝活プログラムの計算。

設定した時間帯（既定 6:00-8:00 JST）にチェックインすると朝活ポイントがもらえる。
連続日数に応じてボーナスが上乗せされ、その日の「朝にすべきことリスト」を
消化するとさらにポイントが付く。

サーバーのタイムゾーンに依存しないよう、日付・時刻の判定はすべて JST で行う。
"""

import random
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.models.morning import (
    MorningCheckin,
    MorningPost,
    MorningSetting,
    MorningTask,
    MorningTaskDone,
    MorningTip,
)
from app.models.point_log import PointLog
from app.models.user import User

JST = ZoneInfo("Asia/Tokyo")

# 朝活宣言の既定の定型文。管理画面から変更できる。
# {name} 表示名 / {date} 今日の日付 / {time} 現在時刻 / {streak} 連続日数 / {tasks} 今朝やることリスト
DEFAULT_POST_TEMPLATE = """おはようございます！ {time} から朝活を始めます 🌅
今日やること:
{tasks}
（{streak}日連続の朝活 / {date}）"""


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
        setting = MorningSetting(post_template=DEFAULT_POST_TEMPLATE)
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


def roll_lucky(setting: MorningSetting) -> int:
    """ラッキーチャンスの当選ポイントを決める。無効なら0。

    連続が途切れた人が戻ってきたときの救済。連続ボーナスの代わりに
    min〜max のランダムなポイントを上乗せする。
    """
    if not setting.lucky_enabled:
        return 0
    low = max(setting.lucky_min_points, 0)
    high = max(setting.lucky_max_points, low)
    if high == 0:
        return 0
    return random.randint(low, high)


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
    continued = last is not None and last.checkin_date == today - timedelta(days=1)
    streak = last.streak + 1 if continued else 1

    # 一度でも朝活したことがある人が連続を切らして戻ってきたらラッキーチャンス。
    # 初回チェックインの人は対象外（切れた連続が無いので）。
    lucky = 0 if continued or last is None else roll_lucky(setting)
    points = points_for(setting, streak) + lucky

    record = MorningCheckin(
        user_id=user.id,
        checkin_date=today,
        points=points,
        streak=streak,
        checkin_minute=minute,
        lucky_points=lucky,
    )
    db.add(record)
    reason = f"morning:{streak}日連続 {format_minute(minute)}"
    if lucky:
        reason += f" +ラッキー{lucky}pt"
    db.add(
        PointLog(
            user_id=user.id,
            points=points,
            reason=reason,
            period_year=today.year,
            period_month=today.month,
        )
    )
    db.commit()
    db.refresh(record)
    return record, True


def post_of(db: Session, user_id: str, day: date) -> MorningPost | None:
    return (
        db.query(MorningPost)
        .filter(MorningPost.user_id == user_id, MorningPost.post_date == day)
        .first()
    )


def render_template(db: Session, setting: MorningSetting, user: User) -> str:
    """定型文のプレースホルダを埋めて、投稿欄の初期値を作る。"""
    now = now_jst()
    today = now.date()
    streak = current_streak(db, user.id, today)
    if checkin_of(db, user.id, today) is None:
        streak += 1

    tasks = active_tasks(db)
    done = done_task_ids(db, user.id, today)
    # 宣言なので、まだ終わっていない項目だけを並べる（全部済みなら全項目）
    remaining = [t for t in tasks if t.id not in done] or tasks
    task_lines = "\n".join(f"・{t.title}" for t in remaining[:5])

    template = setting.post_template or DEFAULT_POST_TEMPLATE
    return (
        template.replace("{name}", user.display_name or user.username)
        .replace("{date}", today.strftime("%Y/%m/%d"))
        .replace("{time}", format_minute(minute_of_day(now)))
        .replace("{streak}", str(max(streak, 1)))
        .replace("{tasks}", task_lines)
    )


def create_post(db: Session, user: User, content: str) -> tuple[MorningPost, int]:
    """朝活宣言を記録し、(記録, 獲得ポイント) を返す。

    Discord への送信は呼び出し側（ルーター）が行う。ここではDBだけを扱う。
    complete_on_post が立っているタスクは同時にクリア扱いにする。
    """
    setting = get_settings(db)
    today = today_jst()
    content = content.strip()

    if not content:
        raise MorningError("投稿する文章が空です")
    if len(content) > 1900:
        raise MorningError("投稿は1900文字までです")
    if checkin_of(db, user.id, today) is None:
        raise MorningError("先に朝活チェックインをしてください")
    if post_of(db, user.id, today) is not None:
        raise MorningError("今日はすでに投稿済みです")

    points = setting.post_points
    post = MorningPost(
        user_id=user.id,
        post_date=today,
        content=content,
        points=points,
        channel_id=user.discord_channel_id,
    )
    db.add(post)
    if points:
        db.add(
            PointLog(
                user_id=user.id,
                points=points,
                reason="morning_post:朝活宣言",
                period_year=today.year,
                period_month=today.month,
            )
        )

    # 「Discord に投稿する」系のタスクは投稿と同時にクリアにする
    done = done_task_ids(db, user.id, today)
    for task in active_tasks(db):
        if not task.complete_on_post or task.id in done:
            continue
        db.add(
            MorningTaskDone(
                user_id=user.id,
                task_id=task.id,
                done_date=today,
                points=setting.task_points,
            )
        )
        points += setting.task_points
        if setting.task_points:
            db.add(
                PointLog(
                    user_id=user.id,
                    points=setting.task_points,
                    reason=f"morning_task:{task.title}",
                    period_year=today.year,
                    period_month=today.month,
                )
            )

    db.commit()
    db.refresh(post)
    return post, points


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
