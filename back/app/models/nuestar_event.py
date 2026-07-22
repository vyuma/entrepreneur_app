import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
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
    # タイムテーブルの開始時刻（"20:00" 形式）
    start_time: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # 発表と発表の間に挟む転換時間（秒）
    buffer_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60, server_default="60")
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
    # 発表者のDiscordネーム（複数可・カンマ区切りで自由入力）
    presenters: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # 発表時間・質疑時間（秒）。0 は質疑なし
    talk_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=180, server_default="180")
    qa_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # 発表順（ランダム抽選や手動並べ替えで設定）
    order_index: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # 開始時刻を個別に上書きしたい場合（"20:15" 形式）
    scheduled_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
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


# よく使う賞のプリセット。管理者は自由に名前を付けられる
AWARD_PRESETS = ("オーディエンス賞", "NueStar賞", "最優秀賞", "審査員特別賞")


class EventAward(Base):
    """イベントで授与した賞。1つの発表に複数の賞を出せる。"""

    __tablename__ = "nuestar_event_awards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id: Mapped[str] = mapped_column(String(36), ForeignKey("nuestar_events.id"), nullable=False)
    entry_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("nuestar_event_entries.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 授与と同時に付けたアントレポイント（0 なら付与なし）
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_by: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
