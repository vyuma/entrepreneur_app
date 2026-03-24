from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.activity import Activity
from app.models.point_log import PointLog
from app.models.time_log import TimeLog
from app.models.user import User

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
def get_my_points(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_points = db.query(func.sum(PointLog.points)).filter(
        PointLog.user_id == user.id
    ).scalar() or 0

    logs = (
        db.query(PointLog)
        .filter(PointLog.user_id == user.id)
        .order_by(PointLog.created_at.desc())
        .all()
    )

    total_minutes = db.query(func.sum(TimeLog.minutes)).filter(
        TimeLog.user_id == user.id
    ).scalar() or 0

    now = datetime.now(timezone.utc)
    # created_at が naive なら UTC として扱う
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    days_since = (now - created).days

    time_points = total_minutes // 60  # 1時間 = 1ポイント

    total_activities = db.query(func.count(Activity.id)).filter(
        Activity.user_id == user.id
    ).scalar() or 0

    return {
        "total_points": total_points + time_points,
        "activity_points": total_points,
        "time_points": time_points,
        "days_since_joined": days_since,
        "total_minutes": total_minutes,
        "total_activities": total_activities,
        "logs": [
            {
                "points": log.points,
                "reason": log.reason,
                "period_year": log.period_year,
                "period_month": log.period_month,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }
