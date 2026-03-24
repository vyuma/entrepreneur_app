from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core import discord as discord_api
from app.core.config import settings
from app.core.database import get_db
from app.models.activity import Activity
from app.models.user import User
from app.schemas.activity import ActivityApprove, ActivityCreate, ActivityResponse
from app.services.activity_review import approve_activity, get_activity_or_404, reject_activity

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _sync_activity_message(
    activity: Activity,
    user: User,
    *,
    reviewer_id: str | None = None,
    reviewer_name: str | None = None,
) -> None:
    if not activity.discord_message_id:
        return

    discord_api.update_activity_notification(
        discord_message_id=activity.discord_message_id,
        activity_id=activity.id,
        discord_id=user.discord_id,
        username=user.display_name or user.username,
        event_name=activity.event_name,
        outcome=activity.outcome,
        claim_text=activity.claim_text,
        total_participants=activity.total_participants,
        activity_date_start=activity.activity_date_start.isoformat(),
        activity_date_end=activity.activity_date_end.isoformat(),
        status=activity.status,
        reviewer_id=reviewer_id,
        reviewer_name=reviewer_name,
        points_awarded=activity.points_awarded,
    )


@router.get("", response_model=list[ActivityResponse])
def list_activities(
    discord_id: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    q = db.query(Activity)
    if discord_id:
        user = db.query(User).filter(User.discord_id == discord_id).first()
        if user:
            q = q.filter(Activity.user_id == user.id)
        else:
            return []
    else:
        q = q.filter(Activity.status == "approved")
    return q.order_by(Activity.created_at.desc()).all()


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    discord_id: str,
    body: ActivityCreate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    activity = Activity(user_id=user.id, **body.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    # Discord への通知は Bot の activity_poll が担当（View を正しく登録するため）
    return activity


@router.post("/{activity_id}/approve", response_model=ActivityResponse)
def approve_activity_route(
    activity_id: str,
    body: ActivityApprove,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    activity = get_activity_or_404(db, activity_id)
    user = db.query(User).filter(User.id == activity.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    activity = approve_activity(db, activity, body.points)
    try:
        _sync_activity_message(activity, user, reviewer_name="Management API")
    except Exception as exc:
        print(f"[Discord activity sync error] {exc}")
    return activity


@router.post("/{activity_id}/reject", response_model=ActivityResponse)
def reject_activity_route(
    activity_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    activity = get_activity_or_404(db, activity_id)
    user = db.query(User).filter(User.id == activity.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    activity = reject_activity(db, activity)
    try:
        _sync_activity_message(activity, user, reviewer_name="Management API")
    except Exception as exc:
        print(f"[Discord activity sync error] {exc}")
    return activity
