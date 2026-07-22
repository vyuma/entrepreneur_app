from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.activity import Activity
from app.models.competition_entry import CompetitionEntry
from app.models.point_log import PointLog
from app.models.time_log import TimeLog
from app.models.user import User
from app.models.user_skill import UserSkill

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class PortfolioItem(BaseModel):
    date: str
    kind: str  # activity / achievement
    title: str
    body: Optional[str] = None
    points: Optional[int] = None
    url: Optional[str] = None


class PortfolioResponse(BaseModel):
    user_id: str
    discord_id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    business_desc: Optional[str]
    sns_links: Optional[dict[str, Any]]
    public: bool
    total_points: int
    total_hours: int
    achievement_count: int
    skills: list[str]
    items: list[PortfolioItem]


class PortfolioVisibility(BaseModel):
    public: bool


def _build(db: Session, user: User) -> PortfolioResponse:
    activity_points = (
        db.query(func.sum(PointLog.points)).filter(PointLog.user_id == user.id).scalar() or 0
    )
    minutes = db.query(func.sum(TimeLog.minutes)).filter(TimeLog.user_id == user.id).scalar() or 0

    items: list[PortfolioItem] = []

    for a in (
        db.query(Activity)
        .filter(Activity.user_id == user.id, Activity.status == "approved")
        .all()
    ):
        items.append(
            PortfolioItem(
                date=a.activity_date_start.isoformat(),
                kind="activity",
                title=a.event_name,
                body=a.claim_text,
                points=a.points_awarded,
            )
        )

    achievements = (
        db.query(CompetitionEntry)
        .filter(CompetitionEntry.user_id == user.id, CompetitionEntry.status == "achieve")
        .all()
    )
    for e in achievements:
        when = e.event_date_date or e.deadline_date or e.applied_at.date().isoformat()
        items.append(
            PortfolioItem(
                date=when[:10],
                kind="achievement",
                title=e.name,
                body=e.result,
                url=e.url,
            )
        )

    items.sort(key=lambda i: i.date, reverse=True)

    skills = [
        s.label for s in db.query(UserSkill).filter(UserSkill.user_id == user.id).all()
    ]

    return PortfolioResponse(
        user_id=user.id,
        discord_id=user.discord_id,
        username=user.username,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        business_desc=user.business_desc,
        sns_links=user.sns_links,
        public=bool(user.portfolio_public),
        total_points=activity_points + minutes // 60,
        total_hours=minutes // 60,
        achievement_count=len(achievements),
        skills=skills,
        items=items,
    )


@router.get("/{user_id}", response_model=PortfolioResponse)
def get_portfolio(
    user_id: str,
    viewer_discord_id: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # 非公開の場合はログイン済みユーザーのみ閲覧可
    if not user.portfolio_public and viewer_discord_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="このポートフォリオは非公開です"
        )

    return _build(db, user)


@router.patch("/{user_id}/visibility", response_model=PortfolioResponse)
def set_visibility(
    user_id: str,
    discord_id: str,
    body: PortfolioVisibility,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.discord_id != discord_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="本人のみ変更できます")

    user.portfolio_public = body.public
    db.commit()
    db.refresh(user)
    return _build(db, user)


class MarkdownResponse(BaseModel):
    markdown: str
    generated_at: datetime


@router.get("/{user_id}/markdown", response_model=MarkdownResponse)
def get_markdown(
    user_id: str,
    viewer_discord_id: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    portfolio = get_portfolio(user_id, viewer_discord_id, db)

    lines = [f"# {portfolio.display_name or portfolio.username} のポートフォリオ", ""]
    if portfolio.bio:
        lines += [portfolio.bio, ""]
    lines += [
        f"- 合計ポイント: {portfolio.total_points} pt",
        f"- 累計作業時間: {portfolio.total_hours} 時間",
        f"- 受賞・成果: {portfolio.achievement_count} 件",
        "",
    ]
    if portfolio.skills:
        lines += ["## スキル", "", ", ".join(portfolio.skills), ""]

    lines += ["## 活動履歴", ""]
    for item in portfolio.items:
        label = "🏆" if item.kind == "achievement" else "▸"
        lines.append(f"### {item.date} {label} {item.title}")
        if item.body:
            lines.append("")
            lines.append(item.body)
        if item.url:
            lines.append("")
            lines.append(item.url)
        lines.append("")

    return MarkdownResponse(markdown="\n".join(lines), generated_at=datetime.now())
