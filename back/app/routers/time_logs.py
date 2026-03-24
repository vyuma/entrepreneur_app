from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.time_log import TimeLog
from app.models.user import User

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/summary")
def get_time_summary(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)

    total_minutes = db.query(func.sum(TimeLog.minutes)).filter(
        TimeLog.user_id == user.id
    ).scalar() or 0

    month_minutes = db.query(func.sum(TimeLog.minutes)).filter(
        TimeLog.user_id == user.id,
        extract("year", TimeLog.created_at) == now.year,
        extract("month", TimeLog.created_at) == now.month,
    ).scalar() or 0

    # 過去6ヶ月の月別集計
    monthly = db.query(
        extract("year", TimeLog.created_at).label("year"),
        extract("month", TimeLog.created_at).label("month"),
        func.sum(TimeLog.minutes).label("minutes"),
    ).filter(
        TimeLog.user_id == user.id,
    ).group_by("year", "month").order_by("year", "month").all()

    # 直近10件のログ
    recent = (
        db.query(TimeLog)
        .filter(TimeLog.user_id == user.id)
        .order_by(TimeLog.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "total_minutes": total_minutes,
        "month_minutes": month_minutes,
        "monthly": [
            {"year": int(r.year), "month": int(r.month), "minutes": int(r.minutes)}
            for r in monthly
        ],
        "recent_logs": [
            {
                "minutes": log.minutes,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent
        ],
    }
