"""管理者向けAPI。

すべてのエンドポイントで内部トークンに加えて discord_id ベースの権限照合を行う。
- require_admin : 運営操作（イベント・ポイント・ユーザー削除・ポートフォリオ設定）
- require_master: 権限の付与/剥奪
"""

from collections import defaultdict
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import (
    ROLE_ADMIN,
    ROLE_MEMBER,
    Actor,
    get_actor,
    require_admin,
    require_master,
)
from app.core.database import get_db
from app.models.admin_audit_log import AdminAuditLog
from app.models.competition_entry import CompetitionEntry
from app.models.internal_event import InternalEvent
from app.models.point_log import PointLog
from app.models.time_log import TimeLog
from app.models.user import User
from app.schemas.admin import (
    AdminStats,
    AdminUserResponse,
    AuditLogResponse,
    MeResponse,
    MemberTrend,
    MonthlyPoint,
    PointGrant,
    PointLogResponse,
    PortfolioVisibilityUpdate,
    RoleUpdate,
)
from app.schemas.competition import InternalEventCreate, InternalEventResponse

router = APIRouter()


def _log(
    db: Session,
    actor: Actor,
    action: str,
    *,
    target_type: str | None = None,
    target_id: str | None = None,
    detail: str | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            actor_discord_id=actor.discord_id,
            actor_role=actor.role,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )


def _user_or_404(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


# --- 権限確認 ---


@router.get("/me", response_model=MeResponse)
def get_my_role(actor: Actor = Depends(get_actor)):
    """自分の権限を返す。権限が無くても 200 を返す（フロントの表示制御用）。"""
    return MeResponse(
        discord_id=actor.discord_id,
        role=actor.role,
        is_admin=actor.is_admin,
        is_master=actor.is_master,
    )


# --- ユーザー管理 ---


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(
    include_deleted: bool = True,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    q = db.query(User)
    if not include_deleted:
        q = q.filter(User.deleted_at.is_(None))
    users = q.order_by(User.created_at.desc()).all()

    points = dict(
        db.query(PointLog.user_id, func.sum(PointLog.points))
        .group_by(PointLog.user_id)
        .all()
    )
    minutes = dict(
        db.query(TimeLog.user_id, func.sum(TimeLog.minutes))
        .group_by(TimeLog.user_id)
        .all()
    )

    result = []
    for u in users:
        item = AdminUserResponse.model_validate(u)
        hours = int(minutes.get(u.id, 0) or 0) // 60
        item.total_hours = hours
        item.total_points = int(points.get(u.id, 0) or 0) + hours
        # master は表示上も master として見せる
        if actor.discord_id == u.discord_id and actor.is_master:
            item.role = actor.role
        result.append(item)
    return result


@router.delete("/users/{user_id}", response_model=AdminUserResponse)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """論理削除。ポイント履歴・活動実績は監査のため残す。"""
    user = _user_or_404(db, user_id)

    if user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="既に削除済みです")
    if actor.user and user.id == actor.user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="自分自身は削除できません"
        )
    # master は誰からも削除できない
    from app.core.auth import resolve_role

    if resolve_role(user, user.discord_id) == "master":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="master は削除できません"
        )
    # admin を削除できるのは master のみ
    if user.role == ROLE_ADMIN and not actor.is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者を削除できるのは master のみです",
        )

    user.deleted_at = datetime.now(timezone.utc)
    # 削除と同時にポートフォリオを非公開にする
    user.portfolio_public = False
    _log(db, actor, "delete_user", target_type="user", target_id=user.id, detail=user.username)
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.post("/users/{user_id}/restore", response_model=AdminUserResponse)
def restore_user(
    user_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    user = _user_or_404(db, user_id)
    user.deleted_at = None
    _log(db, actor, "restore_user", target_type="user", target_id=user.id, detail=user.username)
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.patch("/users/{user_id}/portfolio", response_model=AdminUserResponse)
def set_portfolio_visibility(
    user_id: str,
    body: PortfolioVisibilityUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    user = _user_or_404(db, user_id)
    user.portfolio_public = body.public
    _log(
        db,
        actor,
        "set_portfolio_visibility",
        target_type="user",
        target_id=user.id,
        detail=f"public={body.public}",
    )
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


# --- 権限管理（master のみ） ---


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
def set_role(
    user_id: str,
    body: RoleUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_master),
):
    if body.role not in (ROLE_ADMIN, ROLE_MEMBER):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="role は admin か member のみ指定できます",
        )

    user = _user_or_404(db, user_id)
    if user.discord_id == actor.discord_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="master 自身の権限は変更できません",
        )

    user.role = body.role
    _log(
        db,
        actor,
        "set_role",
        target_type="user",
        target_id=user.id,
        detail=f"{user.username} -> {body.role}",
    )
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


# --- ポイント付与 ---


@router.post("/points", response_model=PointLogResponse, status_code=status.HTTP_201_CREATED)
def grant_points(
    body: PointGrant,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """アントレポイントを手動で付与する（マイナス指定で減算）。"""
    user = _user_or_404(db, body.user_id)
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="削除済みユーザーには付与できません",
        )
    if body.points == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="0 は指定できません"
        )

    now = datetime.now(timezone.utc)
    log = PointLog(
        user_id=user.id,
        points=body.points,
        reason=f"manual:{body.reason}",
        period_year=now.year,
        period_month=now.month,
    )
    db.add(log)
    _log(
        db,
        actor,
        "grant_points",
        target_type="user",
        target_id=user.id,
        detail=f"{body.points:+d}pt / {body.reason}",
    )
    db.commit()
    db.refresh(log)

    res = PointLogResponse.model_validate(log)
    res.username = user.username
    res.display_name = user.display_name
    return res


@router.get("/points/history", response_model=list[PointLogResponse])
def point_history(
    user_id: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _actor: Actor = Depends(require_admin),
):
    q = db.query(PointLog)
    if user_id:
        q = q.filter(PointLog.user_id == user_id)
    logs = q.order_by(PointLog.created_at.desc()).limit(limit).all()

    users = {u.id: u for u in db.query(User).all()}
    result = []
    for log in logs:
        item = PointLogResponse.model_validate(log)
        u = users.get(log.user_id)
        if u:
            item.username = u.username
            item.display_name = u.display_name
        result.append(item)
    return result


# --- 自団体イベント（管理者のみ） ---


@router.post(
    "/internal-events",
    response_model=InternalEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_internal_event(
    body: InternalEventCreate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    event = InternalEvent(
        created_by=actor.user.id if actor.user else None, **body.model_dump()
    )
    db.add(event)
    _log(db, actor, "create_event", target_type="event", detail=body.name)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/internal-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_internal_event(
    event_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    event = db.query(InternalEvent).filter(InternalEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    _log(db, actor, "delete_event", target_type="event", target_id=event.id, detail=event.name)
    db.delete(event)
    db.commit()


# --- 統計（グラフ用） ---


def _period(d: datetime | date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


@router.get("/stats", response_model=AdminStats)
def get_stats(
    months: int = Query(default=12, ge=1, le=36),
    db: Session = Depends(get_db),
    _actor: Actor = Depends(require_admin),
):
    users = db.query(User).all()
    active = [u for u in users if u.deleted_at is None]

    minutes_by_user = dict(
        db.query(TimeLog.user_id, func.sum(TimeLog.minutes))
        .group_by(TimeLog.user_id)
        .all()
    )
    logs = db.query(PointLog).all()

    # 直近 months ヶ月の期間ラベルを作る（データが無い月も0で埋める）
    today = date.today()
    periods: list[str] = []
    y, m = today.year, today.month
    for _ in range(months):
        periods.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    periods.reverse()

    points_per_period: dict[str, int] = defaultdict(int)
    per_user_period: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for log in logs:
        label = f"{log.period_year:04d}-{log.period_month:02d}"
        points_per_period[label] += log.points
        per_user_period[log.user_id][label] += log.points

    # 累積メンバー数の推移
    members_per_period: dict[str, int] = defaultdict(int)
    for u in users:
        members_per_period[_period(u.created_at)] += 1
    cumulative = 0
    monthly_members: list[MonthlyPoint] = []
    first = periods[0]
    for label, count in sorted(members_per_period.items()):
        if label < first:
            cumulative += count
    for label in periods:
        cumulative += members_per_period.get(label, 0) if label >= first else 0
        monthly_members.append(MonthlyPoint(period=label, points=cumulative))

    trends: list[MemberTrend] = []
    for u in active:
        hours = int(minutes_by_user.get(u.id, 0) or 0) // 60
        monthly = [
            MonthlyPoint(period=p, points=per_user_period[u.id].get(p, 0))
            for p in periods
        ]
        trends.append(
            MemberTrend(
                user_id=u.id,
                name=u.display_name or u.username,
                total_points=sum(per_user_period[u.id].values()) + hours,
                monthly=monthly,
            )
        )
    trends.sort(key=lambda t: t.total_points, reverse=True)

    total_minutes = sum(int(v or 0) for v in minutes_by_user.values())
    achievements = (
        db.query(func.count(CompetitionEntry.id))
        .filter(CompetitionEntry.status == "achieve")
        .scalar()
        or 0
    )

    return AdminStats(
        total_members=len(users),
        active_members=len(active),
        deleted_members=len(users) - len(active),
        admin_count=len([u for u in active if u.role == ROLE_ADMIN]),
        total_points=sum(log.points for log in logs) + total_minutes // 60,
        total_hours=total_minutes // 60,
        total_entries=db.query(func.count(CompetitionEntry.id)).scalar() or 0,
        total_achievements=achievements,
        monthly_points=[
            MonthlyPoint(period=p, points=points_per_period.get(p, 0)) for p in periods
        ],
        monthly_members=monthly_members,
        member_trends=trends,
    )


# --- 監査ログ ---


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    _actor: Actor = Depends(require_admin),
):
    return (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
