import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Todo(Base):
    """ユーザー個人の TODO。

    タイトルは Discord の `/todo <タイトル>` かアプリから作成し、
    詳細は Discord のモーダルかアプリからあとで足せる（任意）。
    """

    __tablename__ = "todos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # 並び替え用。小さいほど上。既定は作成順
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # "discord" / "app"。どこから作られたかの記録
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="app")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
