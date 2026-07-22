"""NueStar 主催コンペ。

フロー:
  1. 管理者がイベントを作成（phase=entry）
  2. メンバーが申込フォームから応募（status=pending）
  3. 管理者が承認（status=approved）
  4. 承認された本人がスライドURLを提出
  5. 管理者が phase=voting にして相互投票を開始（1人1票・自分には不可）
  6. 管理者が phase=closed で締切 → 集計を確認
  7. 管理者が phase=published にして結果発表
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import Actor, get_actor, require_admin
from app.core.database import get_db
from app.models.nuestar_event import (
    EVENT_PHASES,
    EventAward,
    EventEntry,
    EventVote,
    NueStarEvent,
)
from app.models.point_log import PointLog
from app.models.user import User
from app.schemas.nuestar_event import (
    AwardCreate,
    AwardResponse,
    EntryApply,
    EntryTimeUpdate,
    EntryReview,
    EventCreate,
    EventDetail,
    EventEntryResponse,
    EventSummary,
    EventUpdate,
    OrderUpdate,
    ScheduleUpdate,
    SlideSubmit,
    TimetableRow,
    VoteCreate,
    VoterRow,
)
from app.services import timetable as tt

router = APIRouter()


def _event_or_404(db: Session, event_id: str) -> NueStarEvent:
    event = db.query(NueStarEvent).filter(NueStarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="イベントが見つかりません")
    return event


def _entry_or_404(db: Session, entry_id: str) -> EventEntry:
    entry = db.query(EventEntry).filter(EventEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申込が見つかりません")
    return entry


def _require_user(actor: Actor) -> User:
    if actor.user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません"
        )
    return actor.user


def _entry_response(
    entry: EventEntry,
    user: User | None,
    *,
    vote_count: int | None = None,
    rank: int | None = None,
    voted_by_me: bool = False,
) -> EventEntryResponse:
    res = EventEntryResponse.model_validate(entry)
    if user:
        res.username = user.username
        res.display_name = user.display_name
        res.avatar_url = user.avatar_url
    res.vote_count = vote_count
    res.rank = rank
    res.voted_by_me = voted_by_me
    return res


def _summary(db: Session, event: NueStarEvent, actor: Actor) -> EventSummary:
    res = EventSummary.model_validate(event)

    counts = dict(
        db.query(EventEntry.status, func.count(EventEntry.id))
        .filter(EventEntry.event_id == event.id)
        .group_by(EventEntry.status)
        .all()
    )
    res.entry_count = sum(counts.values())
    res.approved_count = counts.get("approved", 0)
    res.vote_count = (
        db.query(func.count(EventVote.id)).filter(EventVote.event_id == event.id).scalar() or 0
    )

    approved = (
        db.query(EventEntry)
        .filter(EventEntry.event_id == event.id, EventEntry.status == "approved")
        .all()
    )
    res.total_seconds = sum(e.talk_seconds + e.qa_seconds for e in approved) + max(
        0, len(approved) - 1
    ) * (event.buffer_seconds or 0)

    if actor.user:
        mine = (
            db.query(EventEntry)
            .filter(EventEntry.event_id == event.id, EventEntry.user_id == actor.user.id)
            .first()
        )
        res.my_entry_status = mine.status if mine else None
        res.has_voted = (
            db.query(EventVote)
            .filter(EventVote.event_id == event.id, EventVote.voter_id == actor.user.id)
            .first()
            is not None
        )
    return res


# --- イベント ---


@router.get("", response_model=list[EventSummary])
def list_events(
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    events = db.query(NueStarEvent).order_by(NueStarEvent.created_at.desc()).all()
    return [_summary(db, e, actor) for e in events]


@router.post("", response_model=EventSummary, status_code=status.HTTP_201_CREATED)
def create_event(
    body: EventCreate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    event = NueStarEvent(
        created_by=actor.user.id if actor.user else None, **body.model_dump()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return _summary(db, event, actor)


@router.patch("/{event_id}", response_model=EventSummary)
def update_event(
    event_id: str,
    body: EventUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    event = _event_or_404(db, event_id)

    data = body.model_dump(exclude_unset=True)
    if "phase" in data and data["phase"] is not None:
        if data["phase"] not in EVENT_PHASES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"phase は {EVENT_PHASES} のいずれかです",
            )
    for key, value in data.items():
        setattr(event, key, value)

    db.commit()
    db.refresh(event)
    return _summary(db, event, actor)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    db: Session = Depends(get_db),
    _actor: Actor = Depends(require_admin),
):
    event = _event_or_404(db, event_id)
    db.query(EventAward).filter(EventAward.event_id == event.id).delete()
    db.query(EventVote).filter(EventVote.event_id == event.id).delete()
    db.query(EventEntry).filter(EventEntry.event_id == event.id).delete()
    db.delete(event)
    db.commit()


@router.get("/{event_id}", response_model=EventDetail)
def get_event(
    event_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    event = _event_or_404(db, event_id)
    me = actor.user

    entries = db.query(EventEntry).filter(EventEntry.event_id == event.id).all()
    users = {u.id: u for u in db.query(User).all()}

    # 結果は「発表済み」または管理者のみ
    results_visible = event.phase == "published" or actor.is_admin

    vote_counts = dict(
        db.query(EventVote.entry_id, func.count(EventVote.id))
        .filter(EventVote.event_id == event.id)
        .group_by(EventVote.entry_id)
        .all()
    )

    my_vote = None
    if me:
        my_vote = (
            db.query(EventVote)
            .filter(EventVote.event_id == event.id, EventVote.voter_id == me.id)
            .first()
        )

    approved = [e for e in entries if e.status == "approved"]
    # 得票順に順位をつける（同数は同順位）
    ranking: dict[str, int] = {}
    if results_visible:
        ordered = sorted(approved, key=lambda e: vote_counts.get(e.id, 0), reverse=True)
        last_count = None
        last_rank = 0
        for i, e in enumerate(ordered, start=1):
            count = vote_counts.get(e.id, 0)
            if count != last_count:
                last_rank = i
                last_count = count
            ranking[e.id] = last_rank

    public_entries = [
        _entry_response(
            e,
            users.get(e.user_id),
            vote_count=vote_counts.get(e.id, 0) if results_visible else None,
            rank=ranking.get(e.id) if results_visible else None,
            voted_by_me=bool(my_vote and my_vote.entry_id == e.id),
        )
        for e in approved
    ]
    # 結果発表後は順位順、それ以外は発表順に並べる
    if event.phase == "published":
        public_entries.sort(key=lambda e: (e.rank if e.rank is not None else 999, e.title))
    else:
        public_entries.sort(
            key=lambda e: (
                e.order_index if e.order_index is not None else 10**6,
                e.created_at,
            )
        )

    # 賞を紐づける
    awards = db.query(EventAward).filter(EventAward.event_id == event.id).all()
    entry_titles = {e.id: e.title for e in entries}
    entry_owner = {e.id: users.get(e.user_id) for e in entries}

    def _award_res(a: EventAward) -> AwardResponse:
        res = AwardResponse.model_validate(a)
        res.entry_title = entry_titles.get(a.entry_id)
        owner = entry_owner.get(a.entry_id)
        res.winner_name = (owner.display_name or owner.username) if owner else None
        return res

    award_list = [_award_res(a) for a in awards]
    by_entry: dict[str, list[AwardResponse]] = {}
    for a in award_list:
        by_entry.setdefault(a.entry_id, []).append(a)
    # 賞は結果発表後（または管理者）にのみ見せる
    if results_visible:
        for pe in public_entries:
            pe.awards = by_entry.get(pe.id, [])

    my_entry = None
    if me:
        mine = next((e for e in entries if e.user_id == me.id), None)
        if mine:
            my_entry = _entry_response(mine, users.get(mine.user_id))

    pending: list[EventEntryResponse] = []
    voters: list[VoterRow] = []
    if actor.is_admin:
        pending = [
            _entry_response(e, users.get(e.user_id))
            for e in entries
            if e.status != "approved"
        ]
        voted_ids = {
            v[0]
            for v in db.query(EventVote.voter_id)
            .filter(EventVote.event_id == event.id)
            .all()
        }
        voters = [
            VoterRow(
                user_id=u.id,
                name=u.display_name or u.username,
                voted=u.id in voted_ids,
            )
            for u in users.values()
            if u.deleted_at is None
        ]
        voters.sort(key=lambda v: (v.voted, v.name))

    return EventDetail(
        event=_summary(db, event, actor),
        entries=public_entries,
        my_entry=my_entry,
        my_vote_entry_id=my_vote.entry_id if my_vote else None,
        results_visible=results_visible,
        is_admin=actor.is_admin,
        pending_entries=pending,
        voters=voters,
        timetable=[TimetableRow(**row) for row in tt.build_timetable(event, approved)],
        awards=award_list if results_visible else [],
    )


# --- 申込 ---


@router.post(
    "/{event_id}/entries",
    response_model=EventEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def apply_entry(
    event_id: str,
    body: EntryApply,
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    event = _event_or_404(db, event_id)
    me = _require_user(actor)

    if event.phase != "entry":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="申込受付は終了しています"
        )

    existing = (
        db.query(EventEntry)
        .filter(EventEntry.event_id == event.id, EventEntry.user_id == me.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="既に申し込み済みです"
        )

    entry = EventEntry(event_id=event.id, user_id=me.id, **body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_response(entry, me)


@router.put("/{event_id}/entries/me/slide", response_model=EventEntryResponse)
def submit_slide(
    event_id: str,
    body: SlideSubmit,
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    """承認された本人がスライドURLを提出する。"""
    event = _event_or_404(db, event_id)
    me = _require_user(actor)

    entry = (
        db.query(EventEntry)
        .filter(EventEntry.event_id == event.id, EventEntry.user_id == me.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="申込がありません")
    if entry.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="承認後にスライドを提出できます",
        )

    url = body.slide_url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="URL は http:// または https:// で始めてください",
        )

    entry.slide_url = url
    db.commit()
    db.refresh(entry)
    return _entry_response(entry, me)


@router.post("/{event_id}/entries/{entry_id}/review", response_model=EventEntryResponse)
def review_entry(
    event_id: str,
    entry_id: str,
    body: EntryReview,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """管理者が申込を承認・却下する。"""
    _event_or_404(db, event_id)
    entry = _entry_or_404(db, entry_id)
    if entry.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="イベントが一致しません")

    entry.status = "approved" if body.approve else "rejected"
    entry.reject_reason = None if body.approve else body.reject_reason
    entry.reviewed_by = actor.user.id if actor.user else None
    entry.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(entry)

    user = db.query(User).filter(User.id == entry.user_id).first()
    return _entry_response(entry, user)


@router.delete("/{event_id}/entries/me", status_code=status.HTTP_204_NO_CONTENT)
def withdraw_entry(
    event_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    """本人が申込を取り下げる（受付中のみ）。"""
    event = _event_or_404(db, event_id)
    me = _require_user(actor)

    if event.phase != "entry":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="受付中のみ取り下げできます"
        )

    entry = (
        db.query(EventEntry)
        .filter(EventEntry.event_id == event.id, EventEntry.user_id == me.id)
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()


# --- 投票 ---


@router.post("/{event_id}/vote", response_model=EventDetail)
def vote(
    event_id: str,
    body: VoteCreate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(get_actor),
):
    """1人1票。自分の発表には投票できない。投票済みなら入れ替える。"""
    event = _event_or_404(db, event_id)
    me = _require_user(actor)

    if event.phase != "voting":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="現在は投票を受け付けていません"
        )

    entry = _entry_or_404(db, body.entry_id)
    if entry.event_id != event.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="イベントが一致しません")
    if entry.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="承認された発表にのみ投票できます"
        )
    if entry.user_id == me.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="自分の発表には投票できません"
        )

    existing = (
        db.query(EventVote)
        .filter(EventVote.event_id == event.id, EventVote.voter_id == me.id)
        .first()
    )
    if existing:
        existing.entry_id = entry.id
        existing.comment = body.comment
    else:
        db.add(
            EventVote(
                event_id=event.id,
                voter_id=me.id,
                entry_id=entry.id,
                comment=body.comment,
            )
        )
    db.commit()

    return get_event(event_id, db, actor)


# --- タイムテーブル（管理者のみ） ---


def _approved(db: Session, event_id: str) -> list[EventEntry]:
    return (
        db.query(EventEntry)
        .filter(EventEntry.event_id == event_id, EventEntry.status == "approved")
        .all()
    )


@router.post("/{event_id}/shuffle", response_model=EventDetail)
def shuffle_entries(
    event_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """発表順をランダムに決める。"""
    event = _event_or_404(db, event_id)
    tt.shuffle_order(_approved(db, event.id))
    db.commit()
    return get_event(event_id, db, actor)


@router.put("/{event_id}/order", response_model=EventDetail)
def set_order(
    event_id: str,
    body: OrderUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """発表順を明示的に並べ替える。渡されなかった発表は末尾に回す。"""
    event = _event_or_404(db, event_id)
    entries = {e.id: e for e in _approved(db, event.id)}

    index = 1
    for entry_id in body.entry_ids:
        entry = entries.pop(entry_id, None)
        if entry is not None:
            entry.order_index = index
            index += 1
    for entry in tt.sort_entries(list(entries.values())):
        entry.order_index = index
        index += 1

    db.commit()
    return get_event(event_id, db, actor)


@router.put("/{event_id}/entries/{entry_id}/schedule", response_model=EventDetail)
def set_schedule(
    event_id: str,
    entry_id: str,
    body: ScheduleUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """特定の発表の開始時刻を固定する（null で自動計算に戻す）。"""
    _event_or_404(db, event_id)
    entry = _entry_or_404(db, entry_id)
    if entry.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="イベントが一致しません")

    value = (body.scheduled_at or "").strip() or None
    if value is not None and tt.parse_hhmm(value) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="時刻は HH:MM 形式で入力してください",
        )

    entry.scheduled_at = value
    db.commit()
    return get_event(event_id, db, actor)


@router.put("/{event_id}/entries/{entry_id}/time", response_model=EventDetail)
def set_entry_time(
    event_id: str,
    entry_id: str,
    body: EntryTimeUpdate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """管理者が発表時間・質疑時間を調整する。"""
    _event_or_404(db, event_id)
    entry = _entry_or_404(db, entry_id)
    if entry.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="イベントが一致しません")

    data = body.model_dump(exclude_unset=True)
    for key, value in data.items():
        if value is not None:
            setattr(entry, key, value)
    db.commit()
    return get_event(event_id, db, actor)


# --- 賞（管理者のみ） ---


@router.post("/{event_id}/awards", response_model=EventDetail, status_code=status.HTTP_201_CREATED)
def create_award(
    event_id: str,
    body: AwardCreate,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """賞を授与する。points を指定するとアントレポイントも同時に付与する。"""
    event = _event_or_404(db, event_id)
    entry = _entry_or_404(db, body.entry_id)
    if entry.event_id != event.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="イベントが一致しません")
    if entry.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="承認された発表にのみ授与できます"
        )

    award = EventAward(
        event_id=event.id,
        entry_id=entry.id,
        name=body.name.strip(),
        note=body.note,
        points=body.points,
        created_by=actor.user.id if actor.user else None,
    )
    db.add(award)

    if body.points > 0:
        now = datetime.now(timezone.utc)
        db.add(
            PointLog(
                user_id=entry.user_id,
                points=body.points,
                reason=f"award:{event.name}／{award.name}",
                reference_id=entry.id,
                period_year=now.year,
                period_month=now.month,
            )
        )

    db.commit()
    return get_event(event_id, db, actor)


@router.delete("/{event_id}/awards/{award_id}", response_model=EventDetail)
def delete_award(
    event_id: str,
    award_id: str,
    db: Session = Depends(get_db),
    actor: Actor = Depends(require_admin),
):
    """賞を取り消す。付与したポイントも打ち消す。"""
    _event_or_404(db, event_id)
    award = db.query(EventAward).filter(EventAward.id == award_id).first()
    if not award or award.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="賞が見つかりません")

    if award.points > 0:
        entry = db.query(EventEntry).filter(EventEntry.id == award.entry_id).first()
        if entry:
            now = datetime.now(timezone.utc)
            db.add(
                PointLog(
                    user_id=entry.user_id,
                    points=-award.points,
                    reason=f"award_revoked:{award.name}",
                    reference_id=entry.id,
                    period_year=now.year,
                    period_month=now.month,
                )
            )

    db.delete(award)
    db.commit()
    return get_event(event_id, db, actor)
