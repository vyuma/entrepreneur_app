"""応募トラッキングのビジネスロジック。"""

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.competition_entry import STATUSES, CompetitionEntry
from app.models.user import User

# ステータス遷移で「成果」に到達したとみなすもの
ACHIEVED = "achieve"

# 期日を過ぎてから自動削除するまでの猶予日数。
# 締切直後に消すと「結果待ち」が即座に消えてしまうため、結果発表を待てる幅を取る。
GRACE_DAYS = 30

# 成果として残るステータス。これ以外は「成果にならなかった」ものとして消える
KEPT_STATUSES = (ACHIEVED,)


def get_entry_or_404(db: Session, entry_id: str) -> CompetitionEntry:
    entry = db.query(CompetitionEntry).filter(CompetitionEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def deadline_for(entry: CompetitionEntry) -> Optional[date]:
    """そのコンペが「終わった」とみなせる日。開催日と締切の遅いほうを使う。"""
    days = [
        d
        for d in (
            _parse_iso_date(entry.event_date_date),
            _parse_iso_date(entry.deadline_date),
        )
        if d is not None
    ]
    return max(days) if days else None


def purge_expired_entries(db: Session, user_id: Optional[str] = None) -> int:
    """成果にならなかった応募を削除する。

    - 見送り (dropped) : 成果にならないと確定しているので即削除
    - 応募 / 結果待ち   : 期日から GRACE_DAYS 経っても成果登録されなければ削除

    成果 (achieve) は削除しない。ポートフォリオや活動実績に紐づくため。
    """
    q = db.query(CompetitionEntry).filter(CompetitionEntry.status.notin_(KEPT_STATUSES))
    if user_id:
        q = q.filter(CompetitionEntry.user_id == user_id)

    today = date.today()
    removed = 0
    for entry in q.all():
        if entry.status == "dropped":
            db.delete(entry)
            removed += 1
            continue

        end = deadline_for(entry)
        # 日付が分からないものは自動削除しない（本人が手で消す）
        if end is None:
            continue
        if (today - end).days > GRACE_DAYS:
            db.delete(entry)
            removed += 1

    if removed:
        db.commit()
    return removed


def create_activity_draft(db: Session, entry: CompetitionEntry) -> Optional[Activity]:
    """achieve に到達したエントリから活動実績の下書きを生成する。

    既に生成済みなら何もしない（二重生成防止）。
    生成された Activity は status="pending" で管理者審査フローに乗る。
    """
    if entry.activity_id:
        return None

    event_day = (
        _parse_iso_date(entry.event_date_date)
        or _parse_iso_date(entry.deadline_date)
        or datetime.now(timezone.utc).date()
    )

    claim_lines = [f"コンペ「{entry.name}」で成果を獲得しました。"]
    if entry.result:
        claim_lines.append(f"結果: {entry.result}")
    if entry.memo:
        claim_lines.append(f"メモ: {entry.memo}")
    claim_lines.append(f"URL: {entry.url}")

    activity = Activity(
        user_id=entry.user_id,
        activity_date_start=event_day,
        activity_date_end=event_day,
        event_name=entry.name,
        outcome=entry.result or "コンペ成果",
        claim_text="\n".join(claim_lines),
        total_participants=1,
        status="pending",
    )
    db.add(activity)
    db.flush()
    entry.activity_id = activity.id
    return activity


def update_entry(
    db: Session,
    entry: CompetitionEntry,
    *,
    new_status: Optional[str] = None,
    memo: Optional[str] = None,
    result: Optional[str] = None,
) -> tuple[CompetitionEntry, Optional[Activity]]:
    """エントリを更新する。achieve への遷移時のみ Activity 下書きを生成する。"""
    if memo is not None:
        entry.memo = memo
    if result is not None:
        entry.result = result

    created: Optional[Activity] = None
    if new_status is not None:
        if new_status not in STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"status must be one of {STATUSES}",
            )
        moved_to_achieve = new_status == ACHIEVED and entry.status != ACHIEVED
        entry.status = new_status
        if new_status in (ACHIEVED, "dropped"):
            entry.decided_at = datetime.now(timezone.utc)
        if moved_to_achieve:
            created = create_activity_draft(db, entry)

    db.commit()
    db.refresh(entry)
    return entry, created


def user_or_404(db: Session, discord_id: str) -> User:
    user = db.query(User).filter(User.discord_id == discord_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
