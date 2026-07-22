from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.competition_entry import CompetitionEntry
from app.models.dashboard_pref import CARD_KEYS, DashboardPref
from app.models.time_log import TimeLog
from app.schemas.competition import DashboardPrefItem, DashboardPrefUpdate
from app.services.competition_entry import user_or_404

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class EntrySummary(BaseModel):
    challenge: int
    wait: int
    achieve: int
    dropped: int


class UpcomingDeadline(BaseModel):
    entry_id: str
    name: str
    url: str
    deadline_date: str
    days_left: int


class WeekDay(BaseModel):
    date: str
    minutes: int


class DashboardSummary(BaseModel):
    entries: EntrySummary
    upcoming: list[UpcomingDeadline]
    week: list[WeekDay]
    cards: list[DashboardPrefItem]


def _default_cards() -> list[DashboardPrefItem]:
    return [
        DashboardPrefItem(card_key=key, visible=True, order=i)
        for i, key in enumerate(CARD_KEYS)
    ]


@router.get("/summary", response_model=DashboardSummary)
def get_summary(discord_id: str, db: Session = Depends(get_db), _=Depends(verify_token)):
    user = user_or_404(db, discord_id)

    counts = dict(
        db.query(CompetitionEntry.status, func.count(CompetitionEntry.id))
        .filter(CompetitionEntry.user_id == user.id)
        .group_by(CompetitionEntry.status)
        .all()
    )
    summary = EntrySummary(
        challenge=counts.get("challenge", 0),
        wait=counts.get("wait", 0),
        achieve=counts.get("achieve", 0),
        dropped=counts.get("dropped", 0),
    )

    today = date.today()
    upcoming: list[UpcomingDeadline] = []
    for e in (
        db.query(CompetitionEntry)
        .filter(
            CompetitionEntry.user_id == user.id,
            CompetitionEntry.status.in_(("challenge", "wait")),
            CompetitionEntry.deadline_date.isnot(None),
        )
        .all()
    ):
        try:
            d = date.fromisoformat(e.deadline_date[:10])
        except (ValueError, TypeError):
            continue
        if d < today:
            continue
        upcoming.append(
            UpcomingDeadline(
                entry_id=e.id,
                name=e.name,
                url=e.url,
                deadline_date=d.isoformat(),
                days_left=(d - today).days,
            )
        )
    upcoming.sort(key=lambda u: u.days_left)
    upcoming = upcoming[:3]

    # 直近7日の作業時間
    start = datetime.now(timezone.utc) - timedelta(days=6)
    start_day = start.date()
    per_day = dict(
        db.query(func.date(TimeLog.created_at), func.sum(TimeLog.minutes))
        .filter(TimeLog.user_id == user.id, TimeLog.created_at >= start)
        .group_by(func.date(TimeLog.created_at))
        .all()
    )
    week = [
        WeekDay(
            date=(start_day + timedelta(days=i)).isoformat(),
            minutes=int(per_day.get((start_day + timedelta(days=i)).isoformat(), 0) or 0),
        )
        for i in range(7)
    ]

    prefs = db.query(DashboardPref).filter(DashboardPref.user_id == user.id).all()
    if prefs:
        cards = [
            DashboardPrefItem(card_key=p.card_key, visible=p.visible, order=p.order)
            for p in sorted(prefs, key=lambda p: p.order)
        ]
    else:
        cards = _default_cards()

    return DashboardSummary(entries=summary, upcoming=upcoming, week=week, cards=cards)


@router.put("/prefs", response_model=list[DashboardPrefItem])
def update_prefs(
    discord_id: str,
    body: DashboardPrefUpdate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)

    for item in body.cards:
        if item.card_key not in CARD_KEYS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"unknown card_key: {item.card_key}",
            )

    db.query(DashboardPref).filter(DashboardPref.user_id == user.id).delete()
    for item in body.cards:
        db.add(
            DashboardPref(
                user_id=user.id,
                card_key=item.card_key,
                visible=item.visible,
                order=item.order,
            )
        )
    db.commit()
    return sorted(body.cards, key=lambda c: c.order)
