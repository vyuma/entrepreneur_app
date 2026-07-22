import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 応募トラッキングのステータス
STATUSES = ("challenge", "wait", "achieve", "dropped")


class CompetitionEntry(Base):
    """ユーザーのコンペ応募トラッキング。

    外部API (nuestar) のコンペが消えても履歴が残るよう、name/url はスナップショットを保持する。
    """

    __tablename__ = "competition_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    competition_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    url: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="challenge")
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deadline_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    event_date_date: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # achieve 遷移時に自動生成した Activity の id（二重生成防止）
    activity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
