from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class CompetitionListResponse(BaseModel):
    """外部APIのコンペ一覧 + キャッシュ鮮度。"""

    fetched_at: datetime
    count: int
    items: list[dict[str, Any]]


class CompetitionSearchResponse(BaseModel):
    fetched_at: datetime
    query: str
    interpretation: str
    count: int
    results: list[dict[str, Any]]


# --- 応募トラッキング ---


class EntryCreate(BaseModel):
    name: str
    # 外部コンペのURL。学内表彰など URL が無い成果もあるので任意
    url: str = ""
    competition_id: Optional[int] = None
    memo: Optional[str] = None
    deadline_date: Optional[str] = None
    event_date_date: Optional[str] = None
    # "challenge"（通常の応募）か "achieve"（過去の受賞をまとめて登録する場合）
    status: str = "challenge"
    result: Optional[str] = None


class EntryUpdate(BaseModel):
    status: Optional[str] = None
    memo: Optional[str] = None
    result: Optional[str] = None


class EntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    user_id: str
    competition_id: Optional[int]
    url: str
    name: str
    status: str
    # memo は本人・管理者以外には None にして返す
    memo: Optional[str]
    result: Optional[str]
    deadline_date: Optional[str]
    event_date_date: Optional[str]
    activity_id: Optional[str]
    applied_at: datetime
    decided_at: Optional[datetime]
    # 成果にならなかった場合に自動削除されるまでの残り日数（None = 期日不明で自動削除しない）
    expires_in_days: Optional[int] = None
    # 表示用（一覧で誰の応募かを出す）
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


# --- 自団体イベント ---


class InternalEventCreate(BaseModel):
    name: str
    event_date: date
    event_end_date: Optional[date] = None
    venue: Optional[str] = None
    description: Optional[str] = None


class InternalEventResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    event_date: date
    event_end_date: Optional[date]
    venue: Optional[str]
    description: Optional[str]
    created_at: datetime


# --- ダッシュボード設定 ---


class DashboardPrefItem(BaseModel):
    card_key: str
    visible: bool = True
    order: int = Field(default=0, ge=0)


class DashboardPrefUpdate(BaseModel):
    cards: list[DashboardPrefItem]


# --- スキルタグ ---


class SkillCreate(BaseModel):
    label: str = Field(min_length=1, max_length=40)


class SkillResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    label: str
    source: str
