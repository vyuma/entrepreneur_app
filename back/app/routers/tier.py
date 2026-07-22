from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.point_log import PointLog
from app.models.time_log import TimeLog
from app.models.user import User
from app.services import tiers
from app.services.competition_entry import user_or_404

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class TierPreference(BaseModel):
    # null を渡すと「現在ランクに自動追従」に戻る
    tier: str | None = None


class TierState(BaseModel):
    total_points: int
    current_tier: str
    display_tier: str
    preference: str | None
    unlocked: list[str]


def _total_points(db: Session, user: User) -> int:
    activity = (
        db.query(func.sum(PointLog.points)).filter(PointLog.user_id == user.id).scalar() or 0
    )
    minutes = db.query(func.sum(TimeLog.minutes)).filter(TimeLog.user_id == user.id).scalar() or 0
    return int(activity) + minutes // 60


def _state(db: Session, user: User) -> TierState:
    total = _total_points(db, user)
    return TierState(
        total_points=total,
        current_tier=tiers.current_tier(total),
        display_tier=tiers.resolve_display_tier(user.display_tier, total),
        preference=user.display_tier,
        unlocked=tiers.unlocked_tiers(total),
    )


@router.get("", response_model=TierState)
def get_tier(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    return _state(db, user)


@router.put("", response_model=TierState)
def set_tier(
    discord_id: str,
    body: TierPreference,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """表示ティアを変更する。到達済みの色のみ指定できる。"""
    user = user_or_404(db, discord_id)

    if body.tier is None:
        user.display_tier = None
    else:
        if body.tier not in tiers.TIER_NAMES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="存在しないランクです",
            )
        total = _total_points(db, user)
        if not tiers.is_unlocked(body.tier, total):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="まだ到達していないランクは選べません",
            )
        user.display_tier = body.tier

    db.commit()
    db.refresh(user)
    return _state(db, user)
