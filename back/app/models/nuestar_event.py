import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# イベントのフェーズ。管理者が手動で進める。
#   entry     : 申込受付中
#   voting    : 投票受付中（承認済みの発表に投票できる）
#   closed    : 投票締切（集計は管理者のみ閲覧可）
#   published : 結果発表済み（全員が結果を見られる）
EVENT_PHASES = ("entry", "voting", "closed", "published")

# 申込のステータス
ENTRY_STATUSES = ("pending", "approved", "rejected")


class NueStarEvent(Base):
    """NueStar が主催するコンペ本体。"""

    __tablename__ = "nuestar_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    venue: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phase: Mapped[str] = mapped_column(String, nullable=False, default="entry")
    # スライドURLの提出を必須にするか
    slide_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="1")
    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class EventEntry(Base):
    """イベントへの申込（＝発表エントリ）。"""

    __tablename__ = "nuestar_event_entries"
    __table_args__ = (
        # 1イベントにつき1人1申込
        UniqueConstraint("event_id", "user_id", name="uq_event_entry_user"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("nuestar_events.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    # 発表タイトルと概要（申込フォームの入力）
    title: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    team_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    # 承認後に本人が提出する
    slide_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reject_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class EventVote(Base):
    """相互投票。1イベントにつき1人1票、自分には投票できない。"""

    __tablename__ = "nuestar_event_votes"
    __table_args__ = (
        UniqueConstraint("event_id", "voter_id", name="uq_event_vote_voter"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("nuestar_events.id"), nullable=False)
    voter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("nuestar_event_entries.id"), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
