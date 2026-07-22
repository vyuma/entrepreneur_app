from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.activity import Activity
from app.models.competition_entry import CompetitionEntry
from app.models.internal_event import InternalEvent
from app.models.point_log import PointLog
from app.models.user import User
from app.schemas.competition import (
    CompetitionListResponse,
    CompetitionSearchResponse,
    EntryCreate,
    EntryResponse,
    EntryUpdate,
    InternalEventCreate,
    InternalEventResponse,
)
from app.services import competitions as comp_api
from app.services.competition_entry import get_entry_or_404, update_entry, user_or_404

router = APIRouter()


def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != settings.INTERNAL_API_SECRET:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def _ts(epoch: float) -> datetime:
    return datetime.fromtimestamp(epoch, tz=timezone.utc)


def _unavailable(exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"コンペ情報を取得できませんでした: {exc}",
    )


# --- コンペ一覧 / 検索 ---


@router.get("", response_model=CompetitionListResponse)
def list_competitions(
    type: str | None = None,
    upcoming: bool = True,
    sort: str = "deadline",
    _=Depends(verify_token),
):
    try:
        items, at = comp_api.list_competitions(type=type, upcoming=upcoming, sort=sort)
    except comp_api.CompetitionAPIError as exc:
        raise _unavailable(exc) from exc
    return CompetitionListResponse(fetched_at=_ts(at), count=len(items), items=items)


@router.get("/search", response_model=CompetitionSearchResponse)
def search_competitions(
    q: str = Query(min_length=1),
    limit: int = Query(default=50, ge=1, le=200),
    _=Depends(verify_token),
):
    try:
        data, at = comp_api.search_competitions(q, limit)
    except comp_api.CompetitionAPIError as exc:
        raise _unavailable(exc) from exc
    return CompetitionSearchResponse(
        fetched_at=_ts(at),
        query=data.get("query", q),
        interpretation=data.get("interpretation", ""),
        count=data.get("count", 0),
        results=data.get("results", []),
    )


@router.get("/recommended", response_model=CompetitionSearchResponse)
def recommended_competitions(
    discord_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """ユーザーの活動実績・応募履歴から推薦クエリを自動生成して検索する。"""
    user = user_or_404(db, discord_id)

    keywords: list[str] = []
    for a in (
        db.query(Activity)
        .filter(Activity.user_id == user.id, Activity.status == "approved")
        .order_by(Activity.created_at.desc())
        .limit(5)
        .all()
    ):
        keywords.append(a.outcome)
    for e in (
        db.query(CompetitionEntry)
        .filter(CompetitionEntry.user_id == user.id)
        .order_by(CompetitionEntry.applied_at.desc())
        .limit(5)
        .all()
    ):
        keywords.append(e.name)

    total_points = (
        db.query(PointLog).with_entities(PointLog.points).filter(PointLog.user_id == user.id).all()
    )
    points = sum(p[0] for p in total_points)
    level = "経験者向けで難易度が高い" if points >= 100 else "初心者でも参加しやすい"

    if keywords:
        q = f"{'、'.join(keywords[:5])} に近い、{level}、締切がまだ先のコンペ"
    else:
        q = f"{level}、締切がまだ先の学生向けコンペ"

    try:
        data, at = comp_api.search_competitions(q, limit)
    except comp_api.CompetitionAPIError as exc:
        raise _unavailable(exc) from exc

    return CompetitionSearchResponse(
        fetched_at=_ts(at),
        query=q,
        interpretation=data.get("interpretation", ""),
        count=data.get("count", 0),
        results=data.get("results", []),
    )


# --- 自団体イベント ---


@router.get("/internal-events", response_model=list[InternalEventResponse])
def list_internal_events(db: Session = Depends(get_db), _=Depends(verify_token)):
    return db.query(InternalEvent).order_by(InternalEvent.event_date.asc()).all()


@router.post(
    "/internal-events",
    response_model=InternalEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_internal_event(
    discord_id: str,
    body: InternalEventCreate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    event = InternalEvent(created_by=user.id, **body.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/internal-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_internal_event(
    event_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    event = db.query(InternalEvent).filter(InternalEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


# --- 応募トラッキング ---


def _entry_response(entry: CompetitionEntry, user: User | None, viewer_id: str) -> EntryResponse:
    res = EntryResponse.model_validate(entry)
    # memo は本人のみ閲覧可（サークル内公開は名前・ステータス・結果まで）
    if entry.user_id != viewer_id:
        res.memo = None
    if user:
        res.username = user.username
        res.display_name = user.display_name
        res.avatar_url = user.avatar_url
    return res


@router.get("/entries", response_model=list[EntryResponse])
def list_entries(
    discord_id: str,
    mine: bool = False,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    """サークル内公開。mine=true で自分の応募のみ。"""
    viewer = user_or_404(db, discord_id)

    q = db.query(CompetitionEntry)
    if mine:
        q = q.filter(CompetitionEntry.user_id == viewer.id)
    entries = q.order_by(CompetitionEntry.applied_at.desc()).all()

    users = {u.id: u for u in db.query(User).all()}
    return [_entry_response(e, users.get(e.user_id), viewer.id) for e in entries]


@router.post("/entries", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(
    discord_id: str,
    body: EntryCreate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)

    existing = (
        db.query(CompetitionEntry)
        .filter(CompetitionEntry.user_id == user.id, CompetitionEntry.url == body.url)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="このコンペには既に応募登録済みです",
        )

    entry = CompetitionEntry(user_id=user.id, status="challenge", **body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_response(entry, user, user.id)


@router.patch("/entries/{entry_id}", response_model=EntryResponse)
def patch_entry(
    entry_id: str,
    discord_id: str,
    body: EntryUpdate,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    entry = get_entry_or_404(db, entry_id)
    if entry.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="編集できるのは本人のみです")

    entry, _created = update_entry(
        db,
        entry,
        new_status=body.status,
        memo=body.memo,
        result=body.result,
    )
    return _entry_response(entry, user, user.id)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: str,
    discord_id: str,
    db: Session = Depends(get_db),
    _=Depends(verify_token),
):
    user = user_or_404(db, discord_id)
    entry = get_entry_or_404(db, entry_id)
    if entry.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="削除できるのは本人のみです")
    db.delete(entry)
    db.commit()
