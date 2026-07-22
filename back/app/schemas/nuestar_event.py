from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# --- イベント ---


class EventCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    slide_required: bool = True


class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    venue: Optional[str] = None
    slide_required: Optional[bool] = None
    phase: Optional[str] = None


class EventSummary(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    description: Optional[str]
    event_date: Optional[date]
    venue: Optional[str]
    phase: str
    slide_required: bool
    created_at: datetime
    # 一覧表示用の集計
    entry_count: int = 0
    approved_count: int = 0
    vote_count: int = 0
    # 閲覧者の状態
    my_entry_status: Optional[str] = None
    has_voted: bool = False


# --- 申込 ---


class EntryApply(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    summary: Optional[str] = None
    team_name: Optional[str] = None


class SlideSubmit(BaseModel):
    slide_url: str = Field(min_length=1)


class EntryReview(BaseModel):
    approve: bool
    reject_reason: Optional[str] = None


class EventEntryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    event_id: str
    user_id: str
    title: str
    summary: Optional[str]
    team_name: Optional[str]
    status: str
    slide_url: Optional[str]
    reject_reason: Optional[str]
    created_at: datetime
    # 発表者の表示用
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    # 結果発表後、または管理者にのみ入る
    vote_count: Optional[int] = None
    rank: Optional[int] = None
    # 閲覧者がこの発表に投票したか
    voted_by_me: bool = False


# --- 投票 ---


class VoteCreate(BaseModel):
    entry_id: str
    comment: Optional[str] = Field(default=None, max_length=200)


class VoterRow(BaseModel):
    """管理者向け：誰がまだ投票していないか把握する用。"""

    user_id: str
    name: str
    voted: bool


class EventDetail(BaseModel):
    event: EventSummary
    entries: list[EventEntryResponse]
    # 自分の申込（あれば）
    my_entry: Optional[EventEntryResponse] = None
    # 自分が投票した発表のID
    my_vote_entry_id: Optional[str] = None
    # 結果を見られる状態か（発表済み or 管理者）
    results_visible: bool = False
    is_admin: bool = False
    # 管理者のみ
    pending_entries: list[EventEntryResponse] = []
    voters: list[VoterRow] = []
