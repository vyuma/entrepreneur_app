import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import JSON, Boolean, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    discord_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    business_desc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sns_links: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    discord_channel_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # ポートフォリオを未ログインでも閲覧可能にするか
    portfolio_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
