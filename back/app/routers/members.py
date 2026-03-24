from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.point_log import PointLog
from app.schemas.member import MemberResponse

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=401, detail="Invalid token")


def _to_response(user: User, activity_points: int, total_minutes: int) -> MemberResponse:
    time_points = total_minutes // 60
    return MemberResponse(
        id=user.id,
        discord_id=user.discord_id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        business_desc=user.business_desc,
        sns_links=user.sns_links,
        created_at=user.created_at,
        total_points=activity_points + time_points,
    )


@router.get("", response_model=list[MemberResponse])
def list_members(sort: str = "created_at", db: Session = Depends(get_db), _=Depends(verify_token)):
    from app.models.time_log import TimeLog
    users = db.query(User).all()
    point_totals = dict(
        db.query(PointLog.user_id, func.sum(PointLog.points))
        .group_by(PointLog.user_id).all()
    )
    time_totals = dict(
        db.query(TimeLog.user_id, func.sum(TimeLog.minutes))
        .group_by(TimeLog.user_id).all()
    )
    result = [_to_response(u, point_totals.get(u.id, 0), time_totals.get(u.id, 0)) for u in users]
    if sort == "points":
        result.sort(key=lambda x: x.total_points, reverse=True)
    else:
        result.sort(key=lambda x: x.created_at, reverse=True)
    return result


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(member_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    from app.models.time_log import TimeLog
    user = db.query(User).filter(User.id == member_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Member not found")
    activity_pts = db.query(func.sum(PointLog.points)).filter(PointLog.user_id == user.id).scalar() or 0
    minutes = db.query(func.sum(TimeLog.minutes)).filter(TimeLog.user_id == user.id).scalar() or 0
    return _to_response(user, activity_pts, minutes)
