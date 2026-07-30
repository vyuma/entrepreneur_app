"""個人の目標の API。

作成は Discord の `/goal` コマンドとこの API の両方から行える。
参照・編集は必ず discord_id で本人のものに限定される。
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import verify_token
from app.core.database import get_db
from app.services import goals as service
from app.services.competition_entry import user_or_404

router = APIRouter()


class GoalOut(BaseModel):
    id: str
    title: str
    detail: str | None
    target_date: date | None
    status: str
    achieved_at: datetime | None
    source: str
    created_at: datetime
    # 期限まであと何日か（期限なしは None、過ぎていれば負）
    days_left: int | None = None
    # 紐づく TODO の件数と、そのうち完了した数
    todo_total: int = 0
    todo_done: int = 0

    model_config = {"from_attributes": True}


class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=service.TITLE_MAX)
    detail: str | None = Field(default=None, max_length=service.DETAIL_MAX)
    target_date: date | None = None


class GoalUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=service.TITLE_MAX)
    detail: str | None = Field(default=None, max_length=service.DETAIL_MAX)
    target_date: date | None = None
    # 期限を消したいときに true にする（target_date=None は「変更しない」の意味）
    clear_target_date: bool = False


class GoalStatusUpdate(BaseModel):
    status: str


def _bad_request(exc: service.GoalError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


def _out(goal, progress: dict[str, tuple[int, int]] | None = None) -> GoalOut:
    item = GoalOut.model_validate(goal)
    item.days_left = service.days_left(goal)
    done, total = (progress or {}).get(goal.id, (0, 0))
    item.todo_done = done
    item.todo_total = total
    return item


@router.get("", response_model=list[GoalOut])
def list_goals(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    progress = service.todo_progress(db, user.id)
    return [_out(g, progress) for g in service.list_goals(db, user.id)]


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    body: GoalCreate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return _out(
            service.create_goal(
                db, user, body.title, body.detail, body.target_date, source="app"
            )
        )
    except service.GoalError as exc:
        raise _bad_request(exc) from exc


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(
    goal_id: str,
    body: GoalUpdate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return _out(
            service.update_goal(
                db,
                user.id,
                goal_id,
                title=body.title,
                detail=body.detail,
                target_date=body.target_date,
                clear_target_date=body.clear_target_date,
            ),
            service.todo_progress(db, user.id),
        )
    except service.GoalError as exc:
        raise _bad_request(exc) from exc


@router.post("/{goal_id}/status", response_model=GoalOut)
def set_status(
    goal_id: str,
    body: GoalStatusUpdate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        return _out(
            service.set_status(db, user.id, goal_id, body.status),
            service.todo_progress(db, user.id),
        )
    except service.GoalError as exc:
        raise _bad_request(exc) from exc


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        service.delete_goal(db, user.id, goal_id)
    except service.GoalError as exc:
        raise _bad_request(exc) from exc
