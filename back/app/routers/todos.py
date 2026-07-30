"""個人 TODO の API。

作成は Discord の `/todo` コマンドとこの API の両方から行える。
参照・編集は必ず discord_id で本人のものに限定される。
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import verify_token
from app.core.database import get_db
from app.services import todos as service
from app.services.competition_entry import user_or_404

router = APIRouter()


class TodoOut(BaseModel):
    id: str
    title: str
    detail: str | None
    is_done: bool
    # 0=低 / 1=中 / 2=高
    priority: int
    # 紐づく目標。未設定なら単独の TODO
    goal_id: str | None
    done_at: datetime | None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=service.TITLE_MAX)
    detail: str | None = Field(default=None, max_length=service.DETAIL_MAX)
    priority: int | None = Field(default=None, ge=0, le=2)
    goal_id: str | None = None


class TodoUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=service.TITLE_MAX)
    detail: str | None = Field(default=None, max_length=service.DETAIL_MAX)
    priority: int | None = Field(default=None, ge=0, le=2)
    # 空文字を渡すと紐づけが外れる。None は「変更しない」
    goal_id: str | None = None


class TodoToggle(BaseModel):
    done: bool


def _bad_request(exc: service.TodoError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=list[TodoOut])
def list_todos(
    discord_id: str,
    goal_id: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """自分の TODO 一覧。goal_id を渡すとその目標に紐づくものだけ返す。"""
    user = user_or_404(db, discord_id)
    return service.list_todos(db, user.id, goal_id)


@router.post("", response_model=TodoOut, status_code=status.HTTP_201_CREATED)
def create_todo(
    body: TodoCreate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return service.create_todo(
            db,
            user,
            body.title,
            body.detail,
            source="app",
            priority=body.priority,
            goal_id=body.goal_id,
        )
    except service.TodoError as exc:
        raise _bad_request(exc) from exc


@router.patch("/{todo_id}", response_model=TodoOut)
def update_todo(
    todo_id: str,
    body: TodoUpdate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return service.update_todo(
            db,
            user.id,
            todo_id,
            title=body.title,
            detail=body.detail,
            priority=body.priority,
            goal_id=body.goal_id,
        )
    except service.TodoError as exc:
        raise _bad_request(exc) from exc


@router.post("/{todo_id}/toggle", response_model=TodoOut)
def toggle_todo(
    todo_id: str,
    body: TodoToggle,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return service.set_done(db, user.id, todo_id, body.done)
    except service.TodoError as exc:
        raise _bad_request(exc) from exc


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(
    todo_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        service.delete_todo(db, user.id, todo_id)
    except service.TodoError as exc:
        raise _bad_request(exc) from exc
