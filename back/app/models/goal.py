import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# 目標の状態
GOAL_ACTIVE = "active"
GOAL_ACHIEVED = "achieved"
GOAL_DROPPED = "dropped"
GOAL_STATUSES = (GOAL_ACTIVE, GOAL_ACHIEVED, GOAL_DROPPED)


class Goal(Base):
    """ユーザー個人の目標。

    タイトルは Discord の `/goal <タイトル>` かアプリから作成し、
    詳細・期限はあとから足せる（どちらも任意）。
    TODO より粒度が大きく、期限と達成状態を持つ。
    """

    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 期限（任意）
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # "active" / "achieved" / "dropped"
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=GOAL_ACTIVE, server_default=GOAL_ACTIVE
    )
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # 並び替え用。小さいほど上。既定は作成順
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # "discord" / "app"。どこから作られたかの記録
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="app")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
