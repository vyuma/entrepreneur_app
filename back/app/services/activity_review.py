from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.activity import Activity
from app.models.point_log import PointLog


def get_activity_or_404(db: Session, activity_id: str) -> Activity:
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


def approve_activity(db: Session, activity: Activity, points: int) -> Activity:
    now = datetime.now(timezone.utc)
    activity.status = "approved"
    activity.points_awarded = points
    activity.reviewed_at = now
    db.add(PointLog(
        user_id=activity.user_id,
        points=points,
        reason="activity",
        reference_id=activity.id,
        period_year=now.year,
        period_month=now.month,
    ))
    db.commit()
    db.refresh(activity)
    return activity


def reject_activity(db: Session, activity: Activity) -> Activity:
    activity.status = "rejected"
    activity.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(activity)
    return activity
