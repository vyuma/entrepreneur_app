"""朝活プログラム。

- MorningSetting  : 朝活の時間帯・付与ポイントの設定（1行のみ。管理画面から編集）
- MorningTask     : 「朝にすべきことリスト」の項目（管理画面から編集）
- MorningTip      : 朝活のコツ（管理画面から編集）
- MorningCheckin  : ユーザーの朝活チェックイン記録。1ユーザー1日1回
- MorningTaskDone : その日にどのタスクを消化したかの記録
"""

import uuid
from datetime import date, datetime

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


def _uuid() -> str:
    return str(uuid.uuid4())


class MorningSetting(Base):
    """朝活の設定。行はひとつだけ持ち、無ければ既定値で作られる。"""

    __tablename__ = "morning_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # 受付時間帯。0時からの経過分で持つ（6:00 = 360, 8:00 = 480）
    start_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=360)
    end_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=480)
    # チェックインの基礎ポイント
    base_points: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    # タスク1件消化ごとのポイント
    task_points: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    # 連続日数1日につき上乗せするポイントと、その上限
    streak_bonus_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    streak_bonus_max: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class MorningTask(Base):
    """朝にすべきことリストの1項目。"""

    __tablename__ = "morning_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MorningTip(Base):
    """朝活を続けるためのコツ。"""

    __tablename__ = "morning_tips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MorningCheckin(Base):
    """朝活チェックイン。1ユーザー1日1回。"""

    __tablename__ = "morning_checkins"
    __table_args__ = (
        UniqueConstraint("user_id", "checkin_date", name="uq_morning_checkin_user_date"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    streak: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    # チェックインした時刻（0時からの経過分）。何時に起きたかの記録
    checkin_minute: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MorningTaskDone(Base):
    """その日に消化した朝活タスク。"""

    __tablename__ = "morning_task_dones"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "task_id", "done_date", name="uq_morning_task_done_user_task_date"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("morning_tasks.id"), nullable=False
    )
    done_date: Mapped[date] = mapped_column(Date, nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
