import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# ダッシュボードに配置できるカード
CARD_KEYS = (
    "time_progress",
    "entry_summary",
    "upcoming_deadlines",
    "week_calendar",
    "monthly_chart",
)


class DashboardPref(Base):
    """ダッシュボードの表示カード設定（ユーザーごと）。"""

    __tablename__ = "dashboard_prefs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    card_key: Mapped[str] = mapped_column(String, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
