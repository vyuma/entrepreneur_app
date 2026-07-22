from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MeResponse(BaseModel):
    """ログイン中ユーザーの権限。フロントの表示制御に使う。"""

    discord_id: str
    role: str
    is_admin: bool
    is_master: bool


class AdminUserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    discord_id: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    portfolio_public: bool
    deleted_at: Optional[datetime]
    created_at: datetime
    total_points: int = 0
    total_hours: int = 0


class RoleUpdate(BaseModel):
    # "admin" か "member" のみ。master は環境変数でしか設定できない
    role: str


class PortfolioVisibilityUpdate(BaseModel):
    public: bool


class PointGrant(BaseModel):
    user_id: str
    points: int = Field(description="マイナスを指定すると減算になる")
    reason: str = Field(min_length=1, max_length=200)


class PointLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    points: int
    reason: str
    reference_id: Optional[str]
    period_year: int
    period_month: int
    created_at: datetime
    username: Optional[str] = None
    display_name: Optional[str] = None


class MonthlyPoint(BaseModel):
    period: str  # "2026-07"
    points: int


class MemberTrend(BaseModel):
    user_id: str
    name: str
    total_points: int
    monthly: list[MonthlyPoint]


class AdminStats(BaseModel):
    total_members: int
    active_members: int
    deleted_members: int
    admin_count: int
    total_points: int
    total_hours: int
    total_entries: int
    total_achievements: int
    # コミュニティ全体の月次推移
    monthly_points: list[MonthlyPoint]
    monthly_members: list[MonthlyPoint]
    # メンバー別の推移（グラフ用）
    member_trends: list[MemberTrend]


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    actor_discord_id: str
    actor_role: str
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
    detail: Optional[str]
    created_at: datetime
