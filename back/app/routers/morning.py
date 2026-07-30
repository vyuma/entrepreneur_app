"""朝活プログラムAPI。

- /api/morning/...       : 一般ユーザー向け（状況取得・チェックイン・タスク消化）
- /api/morning/admin/... : 管理者向け（時間帯とポイントの設定、タスク／コツの編集）
"""

import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core import discord
from app.core.auth import Actor, require_admin, verify_token
from app.core.database import get_db
from app.models.morning import MorningTask, MorningTaskDone, MorningTip
from app.services import morning as service
from app.services.competition_entry import user_or_404

logger = logging.getLogger(__name__)

router = APIRouter()


# --- スキーマ ---


class TipOut(BaseModel):
    id: str
    title: str
    body: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class TaskOut(BaseModel):
    id: str
    title: str
    description: str | None
    sort_order: int
    is_active: bool
    complete_on_post: bool

    model_config = {"from_attributes": True}


class TaskState(BaseModel):
    id: str
    title: str
    description: str | None
    done: bool
    # 朝活宣言の投稿でクリアになる項目（チェックボックスの代わりに投稿を促す）
    complete_on_post: bool


class SettingOut(BaseModel):
    enabled: bool
    start_minute: int
    end_minute: int
    base_points: int
    task_points: int
    streak_bonus_per_day: int
    streak_bonus_max: int
    lucky_enabled: bool
    lucky_min_points: int
    lucky_max_points: int
    post_points: int
    post_template: str

    model_config = {"from_attributes": True}


class MorningStatus(BaseModel):
    enabled: bool
    # 受付時間帯（"06:00" 形式）と現在時刻。すべて JST
    start_at: str
    end_at: str
    now_at: str
    is_open: bool
    checked_in_today: bool
    # チェックインした時刻（未チェックインなら None）
    checkin_at: str | None
    streak: int
    longest_streak: int
    total_days: int
    # 今日のチェックインで得られる（得た）ポイント
    today_points: int
    base_points: int
    task_points: int
    # 明日も続けた場合のポイント
    next_points: int
    recent_dates: list[date]
    tasks: list[TaskState]
    tips: list[TipOut]
    done_count: int
    # ラッキーチャンス: 連続が切れているので次のチェックインがランダム加算になる
    lucky_pending: bool
    lucky_enabled: bool
    lucky_min: int
    lucky_max: int
    # 朝活宣言の投稿
    posted_today: bool
    post_points: int
    # 投稿欄の初期値（定型文を埋めたもの）
    post_draft: str


class CheckinResult(BaseModel):
    newly_checked_in: bool
    points: int
    streak: int
    # ラッキーチャンスで上乗せされた分（0なら発生していない）
    lucky_points: int
    status: MorningStatus


class TaskToggle(BaseModel):
    done: bool


class ToggleResult(BaseModel):
    delta_points: int
    status: MorningStatus


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1900)


class PostResult(BaseModel):
    # Discord に実際に届いたか（記録とポイントは失敗しても残る）
    posted: bool
    points: int
    status: MorningStatus


class SettingUpdate(BaseModel):
    enabled: bool
    start_minute: int = Field(ge=0, le=1439)
    end_minute: int = Field(ge=0, le=1440)
    base_points: int = Field(ge=0, le=1000)
    task_points: int = Field(ge=0, le=1000)
    streak_bonus_per_day: int = Field(ge=0, le=1000)
    streak_bonus_max: int = Field(ge=0, le=10000)
    lucky_enabled: bool = True
    lucky_min_points: int = Field(default=10, ge=0, le=10000)
    lucky_max_points: int = Field(default=30, ge=0, le=10000)
    post_points: int = Field(default=10, ge=0, le=1000)
    post_template: str = ""


class TaskUpsert(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str | None = None
    sort_order: int = 0
    is_active: bool = True
    complete_on_post: bool = False


class TipUpsert(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1)
    sort_order: int = 0
    is_active: bool = True


# --- 共通 ---


def _build_status(db: Session, user) -> MorningStatus:
    setting = service.get_settings(db)
    today = service.today_jst()
    minute = service.minute_of_day()

    checkin = service.checkin_of(db, user.id, today)
    streak = service.current_streak(db, user.id, today)
    # 未チェックインなら「今日入ると何日連続になるか」で見積もる
    effective_streak = streak if checkin else streak + 1

    done = service.done_task_ids(db, user.id, today)
    tasks = [
        TaskState(
            id=t.id,
            title=t.title,
            description=t.description,
            done=t.id in done,
            complete_on_post=t.complete_on_post,
        )
        for t in service.active_tasks(db)
    ]

    # 過去に朝活したことがあるのに連続が0 → 次のチェックインはラッキーチャンス
    has_history = service.total_days(db, user.id) > 0
    lucky_pending = (
        setting.lucky_enabled and has_history and checkin is None and streak == 0
    )
    post = service.post_of(db, user.id, today)

    return MorningStatus(
        enabled=setting.enabled,
        start_at=service.format_minute(setting.start_minute),
        end_at=service.format_minute(setting.end_minute),
        now_at=service.format_minute(minute),
        is_open=service.is_open(setting, minute),
        checked_in_today=checkin is not None,
        checkin_at=service.format_minute(checkin.checkin_minute) if checkin else None,
        streak=streak,
        longest_streak=service.longest_streak(db, user.id),
        total_days=service.total_days(db, user.id),
        today_points=checkin.points
        if checkin
        else service.points_for(setting, effective_streak),
        base_points=setting.base_points,
        task_points=setting.task_points,
        next_points=service.points_for(setting, effective_streak + 1),
        recent_dates=service.recent_dates(db, user.id),
        tasks=tasks,
        tips=[TipOut.model_validate(t) for t in service.active_tips(db)],
        done_count=len([t for t in tasks if t.done]),
        lucky_pending=lucky_pending,
        lucky_enabled=setting.lucky_enabled,
        lucky_min=setting.lucky_min_points,
        lucky_max=setting.lucky_max_points,
        posted_today=post is not None,
        post_points=setting.post_points,
        post_draft=post.content if post else service.render_template(db, setting, user),
    )


def _bad_request(exc: service.MorningError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# --- 一般ユーザー ---


@router.get("/status", response_model=MorningStatus)
def get_status(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    return _build_status(db, user_or_404(db, discord_id))


@router.post("/checkin", response_model=CheckinResult)
def do_checkin(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    try:
        record, newly = service.checkin(db, user)
    except service.MorningError as exc:
        raise _bad_request(exc) from exc

    return CheckinResult(
        newly_checked_in=newly,
        points=record.points,
        streak=record.streak,
        lucky_points=record.lucky_points,
        status=_build_status(db, user),
    )


@router.post("/tasks/{task_id}/toggle", response_model=ToggleResult)
def toggle_task(
    task_id: str,
    body: TaskToggle,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    try:
        delta = service.toggle_task(db, user, task_id, body.done)
    except service.MorningError as exc:
        raise _bad_request(exc) from exc
    return ToggleResult(delta_points=delta, status=_build_status(db, user))


@router.post("/post", response_model=PostResult)
def create_post(
    body: PostCreate,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """朝活宣言を自分の times チャンネルに投稿する。"""
    user = user_or_404(db, discord_id)
    if not user.discord_channel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投稿先の times チャンネルが見つかりません。運営に連絡してください。",
        )

    try:
        post, points = service.create_post(db, user, body.content)
    except service.MorningError as exc:
        raise _bad_request(exc) from exc

    # Discord への送信が失敗しても記録とポイントは残す（二重投稿を防ぐため）。
    # 投稿できたかどうかは message_id の有無で判別できる。
    try:
        post.message_id = discord.post_morning_declaration(
            user.discord_channel_id, user.discord_id, post.content
        )
        db.commit()
        posted = True
    except Exception:
        logger.exception("朝活宣言のDiscord投稿に失敗しました user=%s", user.id)
        posted = False

    return PostResult(
        posted=posted,
        points=points,
        status=_build_status(db, user),
    )


# --- 管理者：設定 ---


@router.get("/admin/settings", response_model=SettingOut)
def admin_get_settings(db: Session = Depends(get_db), _: Actor = Depends(require_admin)):
    return SettingOut.model_validate(service.get_settings(db))


@router.put("/admin/settings", response_model=SettingOut)
def admin_update_settings(
    body: SettingUpdate,
    db: Session = Depends(get_db),
    _: Actor = Depends(require_admin),
):
    if body.start_minute == body.end_minute:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="開始時刻と終了時刻を同じにはできません",
        )
    if body.lucky_min_points > body.lucky_max_points:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ラッキーチャンスの下限が上限を超えています",
        )
    setting = service.get_settings(db)
    for field, value in body.model_dump().items():
        setattr(setting, field, value)
    db.commit()
    db.refresh(setting)
    return SettingOut.model_validate(setting)


# --- 管理者：朝にすべきことリスト ---


@router.get("/admin/tasks", response_model=list[TaskOut])
def admin_list_tasks(db: Session = Depends(get_db), _: Actor = Depends(require_admin)):
    return (
        db.query(MorningTask)
        .order_by(MorningTask.sort_order, MorningTask.created_at)
        .all()
    )


@router.post("/admin/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def admin_create_task(
    body: TaskUpsert, db: Session = Depends(get_db), _: Actor = Depends(require_admin)
):
    task = MorningTask(**body.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/admin/tasks/{task_id}", response_model=TaskOut)
def admin_update_task(
    task_id: str,
    body: TaskUpsert,
    db: Session = Depends(get_db),
    _: Actor = Depends(require_admin),
):
    task = db.query(MorningTask).filter(MorningTask.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    for field, value in body.model_dump().items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/admin/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_task(
    task_id: str, db: Session = Depends(get_db), _: Actor = Depends(require_admin)
):
    task = db.query(MorningTask).filter(MorningTask.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    # 消化記録が残っているタスクは履歴を壊さないよう非表示にとどめる
    has_history = (
        db.query(MorningTaskDone).filter(MorningTaskDone.task_id == task.id).first()
        is not None
    )
    if has_history:
        task.is_active = False
    else:
        db.delete(task)
    db.commit()


# --- 管理者：朝活のコツ ---


@router.get("/admin/tips", response_model=list[TipOut])
def admin_list_tips(db: Session = Depends(get_db), _: Actor = Depends(require_admin)):
    return db.query(MorningTip).order_by(MorningTip.sort_order, MorningTip.created_at).all()


@router.post("/admin/tips", response_model=TipOut, status_code=status.HTTP_201_CREATED)
def admin_create_tip(
    body: TipUpsert, db: Session = Depends(get_db), _: Actor = Depends(require_admin)
):
    tip = MorningTip(**body.model_dump())
    db.add(tip)
    db.commit()
    db.refresh(tip)
    return tip


@router.put("/admin/tips/{tip_id}", response_model=TipOut)
def admin_update_tip(
    tip_id: str,
    body: TipUpsert,
    db: Session = Depends(get_db),
    _: Actor = Depends(require_admin),
):
    tip = db.query(MorningTip).filter(MorningTip.id == tip_id).first()
    if tip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tip not found")
    for field, value in body.model_dump().items():
        setattr(tip, field, value)
    db.commit()
    db.refresh(tip)
    return tip


@router.delete("/admin/tips/{tip_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_tip(
    tip_id: str, db: Session = Depends(get_db), _: Actor = Depends(require_admin)
):
    tip = db.query(MorningTip).filter(MorningTip.id == tip_id).first()
    if tip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tip not found")
    db.delete(tip)
    db.commit()
