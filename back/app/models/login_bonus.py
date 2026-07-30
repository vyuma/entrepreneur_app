import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LoginBonus(Base):
    """ログインボーナスの受け取り記録。1ユーザー1日1回。"""

    __tablename__ = "login_bonuses"
    __table_args__ = (
        # 同じ日に二重取得できないようDB側でも保証する
        UniqueConstraint("user_id", "bonus_date", name="uq_login_bonus_user_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    bonus_date: Mapped[date] = mapped_column(Date, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    # 受け取った時点での連続日数
    streak: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # ラッキーチャンス（連続が途切れた後の復帰時）で上乗せされた分。points に含む
    lucky_points: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
