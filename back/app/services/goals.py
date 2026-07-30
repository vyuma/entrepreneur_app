"""目標の操作。

Discord の `/goal` コマンドとアプリの両方から同じ関数を使う。
TODO と違い期限と達成状態を持つ。
"""

from datetime import date, datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.goal import (
    GOAL_ACHIEVED,
    GOAL_ACTIVE,
    GOAL_STATUSES,
    Goal,
)
from app.models.todo import Todo
from app.models.user import User

TITLE_MAX = 200
DETAIL_MAX = 2000


class GoalError(Exception):
    """入力が不正で受け付けられないときのエラー。"""


def _clean_title(title: str) -> str:
    title = (title or "").strip()
    if not title:
        raise GoalError("目標を入力してください")
    if len(title) > TITLE_MAX:
        raise GoalError(f"目標は{TITLE_MAX}文字までです")
    return title


def _clean_detail(detail: str | None) -> str | None:
    if detail is None:
        return None
    detail = detail.strip()
    if not detail:
        return None
    if len(detail) > DETAIL_MAX:
        raise GoalError(f"詳細は{DETAIL_MAX}文字までです")
    return detail


def parse_target_date(value: str | None) -> date | None:
    """"2026-12-31" / "2026/12/31" を date にする。空なら None。"""
    if value is None:
        return None
    value = value.strip().replace("/", "-")
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise GoalError("期限は 2026-12-31 の形式で入力してください") from exc


def list_goals(db: Session, user_id: str) -> list[Goal]:
    """進行中を上、達成・取り下げを下にして返す。

    進行中は期限が近いものを先に出す（期限なしは最後）。
    """
    goals = (
        db.query(Goal)
        .filter(Goal.user_id == user_id)
        .order_by(Goal.sort_order, Goal.created_at.desc())
        .all()
    )
    # 期限の有無が混ざるためソートは Python 側で行う
    return sorted(
        goals,
        key=lambda g: (
            g.status != GOAL_ACTIVE,
            g.target_date is None,
            g.target_date or date.max,
            g.sort_order,
        ),
    )


def get_goal(db: Session, user_id: str, goal_id: str) -> Goal:
    """本人の目標を取得する。他人のものは見えない。"""
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user_id).first()
    if goal is None:
        raise GoalError("目標が見つかりません")
    return goal


def _next_sort_order(db: Session, user_id: str) -> int:
    lowest = (
        db.query(Goal.sort_order)
        .filter(Goal.user_id == user_id)
        .order_by(Goal.sort_order)
        .first()
    )
    return (lowest[0] - 1) if lowest else 0


def create_goal(
    db: Session,
    user: User,
    title: str,
    detail: str | None = None,
    target_date: date | None = None,
    source: str = "app",
) -> Goal:
    goal = Goal(
        user_id=user.id,
        title=_clean_title(title),
        detail=_clean_detail(detail),
        target_date=target_date,
        source=source,
        # 新しいものを上に出す
        sort_order=_next_sort_order(db, user.id),
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(
    db: Session,
    user_id: str,
    goal_id: str,
    *,
    title: str | None = None,
    detail: str | None = None,
    target_date: date | None = None,
    clear_target_date: bool = False,
) -> Goal:
    """タイトル・詳細・期限を更新する。None を渡した項目は変更しない。

    詳細を消したい場合は空文字、期限を消したい場合は clear_target_date を使う。
    """
    goal = get_goal(db, user_id, goal_id)
    if title is not None:
        goal.title = _clean_title(title)
    if detail is not None:
        goal.detail = _clean_detail(detail)
    if clear_target_date:
        goal.target_date = None
    elif target_date is not None:
        goal.target_date = target_date
    db.commit()
    db.refresh(goal)
    return goal


def set_status(db: Session, user_id: str, goal_id: str, status: str) -> Goal:
    """達成・取り下げ・進行中を切り替える。"""
    if status not in GOAL_STATUSES:
        raise GoalError("状態は active / achieved / dropped のいずれかです")

    goal = get_goal(db, user_id, goal_id)
    goal.status = status
    goal.achieved_at = (
        datetime.now(timezone.utc) if status == GOAL_ACHIEVED else None
    )
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, user_id: str, goal_id: str) -> None:
    """目標を削除する。紐づいていた TODO は消さず、紐づけだけ外す。"""
    goal = get_goal(db, user_id, goal_id)
    db.query(Todo).filter(Todo.goal_id == goal.id).update(
        {Todo.goal_id: None}, synchronize_session=False
    )
    db.delete(goal)
    db.commit()


def todo_progress(db: Session, user_id: str) -> dict[str, tuple[int, int]]:
    """目標ID -> (完了数, 全体数)。紐づく TODO が無い目標は含まれない。"""
    rows = (
        db.query(Todo.goal_id, Todo.is_done, func.count(Todo.id))
        .filter(Todo.user_id == user_id, Todo.goal_id.isnot(None))
        .group_by(Todo.goal_id, Todo.is_done)
        .all()
    )
    progress: dict[str, list[int]] = {}
    for goal_id, is_done, count in rows:
        entry = progress.setdefault(goal_id, [0, 0])
        entry[1] += count
        if is_done:
            entry[0] += count
    return {k: (v[0], v[1]) for k, v in progress.items()}


def days_left(goal: Goal, today: date | None = None) -> int | None:
    """期限まであと何日か。期限なしは None、過ぎていれば負の数。"""
    if goal.target_date is None:
        return None
    return (goal.target_date - (today or date.today())).days
