"""TODO リストの操作。

Discord の `/todo` コマンドとアプリの両方から同じ関数を使う。
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.todo import Todo
from app.models.user import User

TITLE_MAX = 200
DETAIL_MAX = 2000

# 優先度。数値が大きいほど上に出す
PRIORITY_LOW = 0
PRIORITY_NORMAL = 1
PRIORITY_HIGH = 2
PRIORITIES = (PRIORITY_LOW, PRIORITY_NORMAL, PRIORITY_HIGH)
PRIORITY_LABELS = {PRIORITY_LOW: "低", PRIORITY_NORMAL: "中", PRIORITY_HIGH: "高"}


class TodoError(Exception):
    """入力が不正で受け付けられないときのエラー。"""


def _clean_title(title: str) -> str:
    title = (title or "").strip()
    if not title:
        raise TodoError("タイトルを入力してください")
    if len(title) > TITLE_MAX:
        raise TodoError(f"タイトルは{TITLE_MAX}文字までです")
    return title


def _clean_detail(detail: str | None) -> str | None:
    if detail is None:
        return None
    detail = detail.strip()
    if not detail:
        return None
    if len(detail) > DETAIL_MAX:
        raise TodoError(f"詳細は{DETAIL_MAX}文字までです")
    return detail


def _clean_priority(priority: int | None) -> int:
    if priority is None:
        return PRIORITY_NORMAL
    if priority not in PRIORITIES:
        raise TodoError("優先度は 0（低）・1（中）・2（高）のいずれかです")
    return priority


def list_todos(db: Session, user_id: str) -> list[Todo]:
    """未完了を上、その中では優先度の高い順に返す。完了済みは下にまとめる。"""
    return (
        db.query(Todo)
        .filter(Todo.user_id == user_id)
        .order_by(
            Todo.is_done,
            Todo.priority.desc(),
            Todo.sort_order,
            Todo.created_at.desc(),
        )
        .all()
    )


def get_todo(db: Session, user_id: str, todo_id: str) -> Todo:
    """本人の TODO を取得する。他人のものは見えない。"""
    todo = (
        db.query(Todo).filter(Todo.id == todo_id, Todo.user_id == user_id).first()
    )
    if todo is None:
        raise TodoError("TODO が見つかりません")
    return todo


def create_todo(
    db: Session,
    user: User,
    title: str,
    detail: str | None = None,
    source: str = "app",
    priority: int | None = None,
) -> Todo:
    todo = Todo(
        user_id=user.id,
        title=_clean_title(title),
        detail=_clean_detail(detail),
        priority=_clean_priority(priority),
        source=source,
        # 新しいものを上に出す
        sort_order=_next_sort_order(db, user.id),
    )
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


def _next_sort_order(db: Session, user_id: str) -> int:
    lowest = (
        db.query(Todo.sort_order)
        .filter(Todo.user_id == user_id)
        .order_by(Todo.sort_order)
        .first()
    )
    return (lowest[0] - 1) if lowest else 0


def update_todo(
    db: Session,
    user_id: str,
    todo_id: str,
    *,
    title: str | None = None,
    detail: str | None = None,
    priority: int | None = None,
) -> Todo:
    """タイトル・詳細・優先度を更新する。None を渡した項目は変更しない。

    詳細を消したい場合は空文字を渡す。
    """
    todo = get_todo(db, user_id, todo_id)
    if title is not None:
        todo.title = _clean_title(title)
    if detail is not None:
        todo.detail = _clean_detail(detail)
    if priority is not None:
        todo.priority = _clean_priority(priority)
    db.commit()
    db.refresh(todo)
    return todo


def set_done(db: Session, user_id: str, todo_id: str, done: bool) -> Todo:
    todo = get_todo(db, user_id, todo_id)
    todo.is_done = done
    todo.done_at = datetime.now(timezone.utc) if done else None
    db.commit()
    db.refresh(todo)
    return todo


def delete_todo(db: Session, user_id: str, todo_id: str) -> None:
    todo = get_todo(db, user_id, todo_id)
    db.delete(todo)
    db.commit()
