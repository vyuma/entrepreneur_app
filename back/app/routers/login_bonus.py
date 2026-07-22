from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.login_bonus import LoginBonus
from app.models.point_log import PointLog
from app.models.time_log import TimeLog
from app.services import login_bonus as service
from app.services import tiers
from app.services.competition_entry import user_or_404

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class RewardStep(BaseModel):
    days: int
    points: int


class LoginBonusStatus(BaseModel):
    claimed_today: bool
    streak: int
    longest_streak: int
    total_days: int
    # 今日受け取れる（または受け取った）ポイント
    today_points: int
    # 明日続けた場合のポイント
    next_points: int
    max_points: int
    title: str
    title_tier: str
    # 直近の受け取り日（カレンダー表示用）
    recent_dates: list[date]
    rewards: list[RewardStep]
    # 累計アントレポイントと表示ランク
    total_points: int
    display_tier: str


class ClaimResult(BaseModel):
    newly_claimed: bool
    points: int
    streak: int
    title: str
    title_tier: str
    status: LoginBonusStatus


def _build_status(db: Session, user, today: date) -> LoginBonusStatus:
    streak = service.current_streak(db, user.id, today)
    claimed = service.claimed_today(db, user.id, today)

    # 未受取なら「今日受け取ると何ptか」を出す
    today_streak = streak if claimed else streak + 1
    title, tier = service.title_for_streak(max(today_streak, 1))

    recent = (
        db.query(LoginBonus.bonus_date)
        .filter(LoginBonus.user_id == user.id)
        .order_by(LoginBonus.bonus_date.desc())
        .limit(30)
        .all()
    )

    activity_points = (
        db.query(func.sum(PointLog.points)).filter(PointLog.user_id == user.id).scalar() or 0
    )
    minutes = db.query(func.sum(TimeLog.minutes)).filter(TimeLog.user_id == user.id).scalar() or 0

    return LoginBonusStatus(
        claimed_today=claimed,
        streak=streak,
        longest_streak=service.longest_streak(db, user.id),
        total_days=db.query(func.count(LoginBonus.id))
        .filter(LoginBonus.user_id == user.id)
        .scalar()
        or 0,
        today_points=service.points_for_streak(max(today_streak, 1)),
        next_points=service.next_reward(today_streak),
        max_points=service.MAX_POINTS,
        title=title,
        title_tier=tier,
        recent_dates=[r[0] for r in recent],
        rewards=[RewardStep(days=d, points=p) for d, p in service.STREAK_REWARDS],
        total_points=int(activity_points) + minutes // 60,
        display_tier=tiers.resolve_display_tier(
            user.display_tier, int(activity_points) + minutes // 60
        ),
    )


@router.get("/status", response_model=LoginBonusStatus)
def get_status(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    return _build_status(db, user, date.today())


@router.post("/claim", response_model=ClaimResult)
def claim_bonus(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)
    today = date.today()

    bonus, newly = service.claim(db, user, today)
    title, tier = service.title_for_streak(bonus.streak)

    return ClaimResult(
        newly_claimed=newly,
        points=bonus.points,
        streak=bonus.streak,
        title=title,
        title_tier=tier,
        status=_build_status(db, user, today),
    )
